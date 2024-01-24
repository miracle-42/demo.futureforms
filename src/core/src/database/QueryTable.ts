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
import { SQLCache } from "./SQLCache.js";
import { BindValue } from "./BindValue.js";
import { SQLSource } from "./SQLSource.js";
import { Record } from "../model/Record.js";
import { MSGGRP } from "../messages/Internal.js";
import { Messages } from "../messages/Messages.js";
import { SQLRestBuilder } from "./SQLRestBuilder.js";
import { Connection } from "../database/Connection.js";
import { Filter } from "../model/interfaces/Filter.js";
import { SubQuery } from "../model/filters/SubQuery.js";
import { DatabaseResponse } from "./DatabaseResponse.js";
import { FilterStructure } from "../model/FilterStructure.js";
import { DatabaseConnection } from "../public/DatabaseConnection.js";
import { DataSource, LockMode } from "../model/interfaces/DataSource.js";

/**
 * Datasource based on a query using OpenRestDB
 */
export class QueryTable extends SQLSource implements DataSource
{
	public name:string;
	public arrayfecth:number = 32;
	public queryallowed:boolean = true;
	rowlocking:LockMode = LockMode.None;

	private described$:boolean = false;

	private sql$:string = null;
	private order$:string = null;
	private cursor$:Cursor = null;
	private where$:boolean = false;

	private columns$:string[] = [];
	private fetched$:Record[] = [];

	private conn$:Connection = null;
	private bindings$:BindValue[] = null;
	private nosql$:FilterStructure = null;
	private limit$:FilterStructure = null;
	private pubconn$:DatabaseConnection = null;

	private datatypes$:Map<string,DataType> =
		new Map<string,DataType>();

	/** @param connection : OpenRestDB connection to a database, @param sql : a query */
	public constructor(connection:DatabaseConnection, sql?:string)
	{
		super();

		if (connection == null)
		{
			// Cannot create object when onnection is null
			Messages.severe(MSGGRP.ORDB,2,this.constructor.name);
			return;
		}

		this.sql$ = sql;
		this.pubconn$ = connection;
		this.conn$ = connection["conn$"];

		this.name = this.constructor.name.toLowerCase();
	}

	/** The query */
	public set sql(sql:string)
	{
		this.sql$ = sql;
		this.described$ = false;
	}

	/** Whether the datasource is transactional */
	public get transactional() : boolean
	{
		return(false);
	}

	/** Closes backend cursor */
	public clear() : void
	{
		if (this.cursor$ && !this.cursor$.eof)
			this.conn$.close(this.cursor$);

		this.cursor$ = null;
	}

	/** Clones the datasource */
	public clone() : QueryTable
	{
		let clone:QueryTable = new QueryTable(this.pubconn$,this.sql$);

		clone.where$ = this.where$;
		clone.sorting = this.sorting;
		clone.columns$ = this.columns$;
		clone.described$ = this.described$;
		clone.arrayfecth = this.arrayfecth;
		clone.datatypes$ = this.datatypes$;

		return(clone);
	}

	/** The order by clause */
	public get sorting() : string
	{
		return(this.order$);
	}

	/** The order by clause */
	public set sorting(order:string)
	{
		this.order$ = order;
	}

	/** Get the column names returned from the query */
	public get columns() : string[]
	{
		return(this.columns$);
	}

	/** Insert is not allowed on this source */
	public get insertallowed() : boolean
	{
		return(false);
	}

	/** Update is not allowed on this source */
	public get updateallowed() : boolean
	{
		return(false);
	}

	/** Delete is not allowed on this source */
	public get deleteallowed() : boolean
	{
		return(false);
	}

	/** When adding filters, start with where or and */
	public startWithWhere(flag:boolean) : void
	{
		this.where$ = flag;
	}

	/** Force a datatype */
	public setDataType(column:string,type:DataType) : QueryTable
	{
		this.datatypes$.set(column?.toLowerCase(),type);
		return(this);
	}

	/** Not possible on this datasource */
	public addColumns(_columns:string|string[]) : QueryTable
	{
		return(this);
	}

	/** Not possible on this datasource */
	public removeColumns(_columns:string|string[]) : QueryTable
	{
		return(this);
	}

	/** Return the default filters */
	public getFilters() : FilterStructure
	{
		return(this.limit$);
	}

	/** Add a default filter */
	public addFilter(filter:Filter | FilterStructure) : QueryTable
	{
		if (this.limit$ == null)
		{
			if (filter instanceof FilterStructure)
			{
				this.limit$ = filter;
				return(this);
			}

			this.limit$ = new FilterStructure();
		}

		this.limit$.and(filter);
		return(this);
	}

	/** Add a bindvalue */
	public addBindValue(bindvalue:BindValue) : void
	{
		if (this.bindings$ == null)
			this.bindings$ = [];

		this.bindings$.push(bindvalue);
	}

	/** Not possible on this datasource */
	public async lock(_record:Record) : Promise<boolean>
	{
		// Cannot lock records on datasource based on a query
		Messages.severe(MSGGRP.TRX,14);
		return(false);
	}

	/** Not possible on this datasource */
	public async undo() : Promise<Record[]>
	{
		return([]);
	}

	/** Not possible on this datasource */
	public async flush() : Promise<Record[]>
	{
		return([]);
	}

	/** Re-fetch the given record from the backend */
	public async refresh(record:Record) : Promise<boolean>
	{
		record.refresh();
		return(true);
	}

	/** Not possible on this datasource */
	public async insert(_record:Record) : Promise<boolean>
	{
		// Cannot insert records on datasource based on a query
		Messages.severe(MSGGRP.TRX,15);
		return(false);
	}

	/** Not possible on this datasource */
	public async update(_record:Record) : Promise<boolean>
	{
		// Cannot update records on datasource based on a query
		Messages.severe(MSGGRP.TRX,16);
		return(false);
	}

	/** Not possible on this datasource */
	public async delete(_record:Record) : Promise<boolean>
	{
		// Cannot delete records on datasource based on a query
		Messages.severe(MSGGRP.TRX,17);
		return(false);
	}

	/** Not possible on this datasource */
	public async getSubQuery(_filter:FilterStructure, _mstcols:string|string[], _detcols:string|string[]) : Promise<SQLRest>
	{
		return(null);
	}

	/** Execute the query */
	public async query(filter?:FilterStructure) : Promise<boolean>
	{
		this.fetched$ = [];
		this.nosql$ = null;
		filter = filter?.clone();

		if (!this.conn$.connected())
		{
			// Not connected
			Messages.severe(MSGGRP.ORDB,3,this.constructor.name);
			return(false);
		}

		if (!await this.describe())
			return(false);

		if (this.limit$ != null)
		{
			if (!filter) filter = this.limit$;
			else filter.and(this.limit$,"limit");
		}

		this.setTypes(filter?.get("qbe")?.getBindValues());
		this.setTypes(filter?.get("limit")?.getBindValues());
		this.setTypes(filter?.get("masters")?.getBindValues());

		let details:FilterStructure = filter?.getFilterStructure("details");

		if (details != null)
		{
			let filters:Filter[] = details.getFilters();

			for (let i = 0; i < filters.length; i++)
			{
				let df:Filter = filters[i];

				if (df instanceof SubQuery && df.subquery == null)
				{
					if (this.nosql$ == null)
						this.nosql$ = new FilterStructure(this.name+".nosql");

					details.delete(df);
					this.nosql$.and(df);
				}
			}
		}

		this.createCursor();

		let sql:SQLRest = SQLRestBuilder.finish(this.sql$,this.where$,filter,this.bindings$,this.sorting);
		let response:any = await this.conn$.select(sql,this.cursor$,this.arrayfecth);

		this.fetched$ = this.parse(response);
		this.fetched$ = await this.filter(this.fetched$);

		return(true);
	}

	/** Fetch a set of records */
	public async fetch() : Promise<Record[]>
	{
		if (this.cursor$ == null)
			return([]);

		if (this.fetched$.length > 0)
		{
			let fetched:Record[] = [];
			fetched.push(...this.fetched$);

			this.fetched$ = [];
			return(fetched);
		}

		if (this.cursor$.eof)
			return([]);

		let response:any = await this.conn$.fetch(this.cursor$);

		if (!response.success)
		{
			console.error(this.name+" failed to fetch: "+JSON.stringify(response));
			return([]);
		}

		let fetched:Record[] = this.parse(response);

		fetched = await this.filter(fetched);

		if (fetched.length == 0)
			return(this.fetch());

		return(fetched);
	}

	/** Close the database cursor */
	public async closeCursor() : Promise<boolean>
	{
		let response:any = null;

		if (this.cursor$ && !this.cursor$.eof)
			response = await this.conn$.close(this.cursor$);

		this.fetched$ = [];
		this.cursor$ = null;

		if (response)
			return(response.success);

		return(true);
	}

	private createCursor() : void
	{
		if (this.cursor$ && !this.cursor$.eof)
			this.conn$.close(this.cursor$);

		this.cursor$ = new Cursor();
	}

	private async filter(records:Record[]) : Promise<Record[]>
	{
		if (this.nosql$)
		{
			let passed:Record[] = [];

			for (let i = 0; i < records.length; i++)
			{
				if (await this.nosql$.evaluate(records[i]))
					passed.push(records[i]);
			}

			records = passed;
		}

		return(records);
	}

	private async describe() : Promise<boolean>
	{
		if (this.described$) return(true);
		let first:string = this.where$ ? " where " : " and ";

		console.log(first)

		let stmt:string = this.sql$ + first + " 1 = 2";
		console.log(stmt)
		let sql:SQLRest = SQLRestBuilder.finish(stmt,this.where$,null,this.bindings$,null);

		let response:any = SQLCache.get(sql.stmt);

		let cached:boolean = false;
		if (response) cached = true;
		else response = await this.conn$.select(sql,null,1,true);

		if (!response.success)
		{
			// Unable to describe query
			Messages.warn(MSGGRP.SQL,3);
			return(false);
		}

		if (!cached)
			SQLCache.put(sql.stmt,response);

		let columns:string[] = response.columns;

		for (let i = 0; i < columns.length; i++)
		{
			columns[i] = columns[i].toLowerCase();

			let type:string = response.types[i];
			let datatype:DataType = DataType[type.toLowerCase()];

			let exist:DataType = this.datatypes$.get(columns[i]);
			if (!exist) this.datatypes$.set(columns[i],datatype);
		}

		this.columns$ = columns;
		this.described$ = response.success;

		return(this.described$);
	}

	private setTypes(bindvalues:BindValue[]) : void
	{
		bindvalues?.forEach((b) =>
		{
			let col:string = b.column?.toLowerCase();
			let t:DataType = this.datatypes$.get(col);
			if (!b.forceDataType && t != null) b.type = DataType[t];
		})
	}

	private parse(response:any) : Record[]
	{
		let fetched:Record[] = [];
		let rows:any[][] = response.rows;

		if (!response.success)
		{
			this.cursor$ = null;
			return(fetched);
		}

		let dates:boolean[] = [];
		let datetypes:DataType[] = [DataType.date, DataType.datetime, DataType.timestamp];

		for (let c = 0; c < this.columns.length; c++)
		{
			let dt:DataType = this.datatypes$.get(this.columns[c].toLowerCase());
			if (datetypes.includes(dt)) dates.push(true);
			else dates.push(false);
		}

		for (let r = 0; r < rows.length; r++)
		{
			let record:Record = new Record(this);

			for (let c = 0; c < rows[r].length; c++)
			{
				if (rows[r][c] && dates[c])
				{
					if (typeof rows[r][c] === "number")
						rows[r][c] = new Date(+rows[r][c]);
				}

				record.setValue(this.columns[c],rows[r][c]);
			}

			let response:any = {succes: true, rows: [rows[r]]};
			record.response = new DatabaseResponse(response,this.columns);

			record.cleanup();
			fetched.push(record);
		}

		return(fetched);
	}
}