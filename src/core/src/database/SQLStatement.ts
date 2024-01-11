/*
  MIT License

  Copyright © 2023 Alex Høffner

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software
  and associated documentation files (the “Software”), to deal in the Software without
  restriction, including without limitation the rights to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the
  Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or
  substantial portions of the Software.

  THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
  BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
  DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

import { Cursor } from "./Cursor.js";
import { SQLRest } from "./SQLRest.js";
import { DataType } from "./DataType.js";
import { BindValue } from "./BindValue.js";
import { Connection } from "./Connection.js";
import { MSGGRP } from "../messages/Internal.js";
import { Messages } from "../messages/Messages.js";
import { DatabaseResponse } from "./DatabaseResponse.js";
import { DatabaseConnection } from "../public/DatabaseConnection.js";

/**
 * SQLStatement is used with OpenRestDB to execute any
 * sql-statement
 */
export class SQLStatement
{
	private pos:number = 0;
	private sql$:string = null;
	private response$:any = null;
	private types:string[] = null;
	private cursor$:Cursor = null;
	private patch$:boolean = false;
	private message$:string = null;
	private arrayfecth$:number = 1;
	private records$:any[][] = null;
	private conn$:Connection = null;
	private columns$:string[] = null;
	private returning$:boolean = false;
	private retvals:DatabaseResponse = null;
	private bindvalues$:Map<string,BindValue> = new Map<string,BindValue>();

	/** @param connection : A connection to OpenRestDB */
	public constructor(connection:DatabaseConnection)
	{
		if (connection == null)
		{
			// Cannot create object when onnection is null
			Messages.severe(MSGGRP.ORDB,2,this.constructor.name);
			return;
		}

		this.conn$ = connection["conn$"];
	}

	/** The sql-statement */
	public get sql() : string
	{
		return(this.sql);
	}

	/** The sql-statement */
	public set sql(sql:string)
	{
		this.sql$ = sql;
	}

	/** If the statement changes any values the backend */
	public set patch(flag:boolean)
	{
		this.patch$ = flag;
	}

	/** The columns involved in a select statement */
	public get columns() : string[]
	{
		return(this.columns$);
	}

	/** If used with sql-extension 'returning' */
	public get returnvalues() : boolean
	{
		return(this.returning$);
	}

	/** If used with sql-extension 'returning' */
	public set returnvalues(flag:boolean)
	{
		this.returning$ = flag;
	}

	/** The number of rows to fetch from a select-statement per call to fetch */
	public get arrayfetch() : number
	{
		return(this.arrayfecth$);
	}

	/** The number of rows to fetch from a select-statement per call to fetch */
	public set arrayfetch(size:number)
	{
		this.arrayfecth$ = size;
	}

	/** The error message from the backend */
	public error() : string
	{
		return(this.message$);
	}

	/** Bind values defined with colon i.e. salary = :salary */
	public bind(name:string, value:any, type?:DataType|string) : void
	{
		this.addBindValue(new BindValue(name,value,type));
	}

	/** Bind values defined with colon i.e. salary = :salary */
	public addBindValue(bindvalue:BindValue) : void
	{
		this.bindvalues$.set(bindvalue.name?.toLowerCase(),bindvalue);
	}

	/** Execute the statement */
	public async execute() : Promise<boolean>
	{
		if (this.sql$ == null) return(false);
		let type:string = this.sql$.trim().substring(0,6);

		let sql:SQLRest = new SQLRest();
		if (this.returning$) sql.returnclause = true;

		sql.stmt = this.sql$;
		sql.bindvalues = [...this.bindvalues$.values()];

		if (type == "select" || this.returning$)
			this.cursor$ = new Cursor();

		switch(type?.toLowerCase())
		{
			case "insert" : this.response$ = await this.conn$.insert(sql); break;
			case "update" : this.response$ = await this.conn$.update(sql); break;
			case "delete" : this.response$ = await this.conn$.delete(sql); break;
			case "select" : this.response$ = await this.conn$.select(sql,this.cursor$,this.arrayfecth$,true); break;

			default: this.response$ = await this.conn$.execute(this.patch$,sql);
		}

		let success:boolean = this.response$.success;

		if (!success)
		{
			this.cursor$ = null;
			this.message$ = this.response$.message;
		}

		if (success && type == "select")
		{
			this.types = this.response$.types;
			this.columns$ = this.response$.columns;
			this.records$ = this.parse(this.response$);
		}

		if (this.returning$)
			this.retvals = new DatabaseResponse(this.response$,null);


		return(success);
	}

	/** Fetch rows, if select statement */
	public async fetch() : Promise<any[]>
	{
		if (!this.cursor$)
			return(null);

		if (this.records$.length > this.pos)
			return(this.records$[this.pos++]);

		if (this.cursor$.eof)
			return(null);

		this.pos = 0;
		this.response$ = await this.conn$.fetch(this.cursor$);

		if (!this.response$.success)
		{
			this.message$ = this.response$.message;
			return(null);
		}

		this.records$ = this.parse(this.response$);
		return(this.fetch());
	}

	/** Get return value if 'returning' */
	public getReturnValue(column:string, type?:DataType|string) : any
	{
		let value:any = this.retvals.getValue(column);

		if (type)
		{
			if (typeof type != "string") type = DataType[type]; type = type.toLowerCase();
			if (type == "date" || type == "datetime" || type == "timestamp") value = new Date(value);
		}

		return(value);
	}

	/** Close and clean up */
	public async close() : Promise<boolean>
	{
		let response:any = null;

		if (this.cursor$ != null && !this.cursor$.eof)
			response = await this.conn$.close(this.cursor$);

		this.cursor$ = null;
		this.records$ = null;

		if (response)
			return(response.success);

		return(true);

	}

	private parse(response:any) : any[][]
	{
		if (!response.success)
		{
			this.cursor$ = null;
			return([]);
		}

		if (response.rows.length == 0)
			return([]);

		let rows:any[][] = response.rows;
		let columns:string[] = response.columns;

		let datetypes:string[] = ["date","datetime","timestamp"];

		for (let r = 0; r < rows.length; r++)
		{
			for (let c = 0; c < columns.length; c++)
			{
				if (datetypes.includes(this.types[c].toLowerCase()))
					rows[r][c] = new Date(rows[r][c]);
			}
		}

		return(rows);
	}
}