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
import { SQLSource } from "./SQLSource.js";
import { Record } from "../model/Record.js";
import { Alert } from "../application/Alert.js";
import { SQLRestBuilder } from "./SQLRestBuilder.js";
import { Connection } from "../database/Connection.js";
import { Filter } from "../model/interfaces/Filter.js";
import { SubQuery } from "../model/filters/SubQuery.js";
import { DatabaseResponse } from "./DatabaseResponse.js";
import { FilterStructure } from "../model/FilterStructure.js";
import { DatabaseConnection } from "../public/DatabaseConnection.js";
import { DataSource, LockMode } from "../model/interfaces/DataSource.js";

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

	public constructor(connection:DatabaseConnection, sql?:string)
	{
		super();

		if (connection == null)
		{
			Alert.fatal("Cannot create datasource when connection is null",this.constructor.name);
			return;
		}

		this.sql$ = sql;
		this.pubconn$ = connection;
		this.conn$ = connection["conn$"];

		this.name = this.constructor.name.toLowerCase();
	}

	public set sql(sql:string)
	{
		this.sql$ = sql;
		this.described$ = false;
	}

	public get transactional() : boolean
	{
		return(false);
	}

	public clear() : void
	{
		if (this.cursor$ && !this.cursor$.eof)
			this.conn$.close(this.cursor$);
	}

	public clone() : QueryTable
	{
		let clone:QueryTable = new QueryTable(this.pubconn$,this.sql$);

		clone.sorting = this.sorting;
		clone.columns$ = this.columns$;
		clone.described$ = this.described$;
		clone.arrayfecth = this.arrayfecth;
		clone.datatypes$ = this.datatypes$;

		return(clone);
	}

	public get sorting() : string
	{
		return(this.order$);
	}

	public set sorting(order:string)
	{
		this.order$ = order;
	}

	public get columns() : string[]
	{
		return(this.columns$);
	}

	public get insertallowed() : boolean
	{
		return(false);
	}

	public get updateallowed() : boolean
	{
		return(false);
	}

	public get deleteallowed() : boolean
	{
		return(false);
	}

	public startWithWhere(flag:boolean) : void
	{
		this.where$ = flag;
	}

	public setDataType(column:string,type:DataType) : QueryTable
	{
		this.datatypes$.set(column?.toLowerCase(),type);
		return(this);
	}

	public addColumns(_columns:string|string[]) : QueryTable
	{
		return(this);
	}

	public removeColumns(columns:string|string[]) : QueryTable
	{
		if (!Array.isArray(columns))
			columns = [columns];

		let cols:string[] = [];

		for (let i = 0; i < columns.length; i++)
			columns[i] = columns[i]?.toLowerCase();

		for (let i = 0; i < this.columns$.length; i++)
		{
			if (!columns.includes(this.columns$[i]))
				cols.push(this.columns$[i]);
		}

		this.columns$ = cols;
		return(this);
	}

	public getFilters() : FilterStructure
	{
		return(this.limit$);
	}

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

	public addBindValue(bindvalue:BindValue) : void
	{
		if (this.bindings$ == null)
			this.bindings$ = [];

		this.bindings$.push(bindvalue);
	}

	public async lock(_record:Record) : Promise<boolean>
	{
		Alert.fatal("Cannot lock records on datasource based on a query","Datasource");
		return(false);
	}

	public async undo() : Promise<Record[]>
	{
		return([]);
	}

	public async flush() : Promise<Record[]>
	{
		return([]);
	}

	public async refresh(record:Record) : Promise<boolean>
	{
		record.refresh();
		return(true);
	}

	public async insert(_record:Record) : Promise<boolean>
	{
		Alert.fatal("Cannot insert records into a datasource based on a query","Datasource");
		return(false);
	}

	public async update(_record:Record) : Promise<boolean>
	{
		Alert.fatal("Cannot update records on a datasource based on a query","Datasource");
		return(false);
	}

	public async delete(_record:Record) : Promise<boolean>
	{
		Alert.fatal("Cannot delete records on a datasource based on a query","Datasource");
		return(false);
	}

	public async getSubQuery(_filter:FilterStructure, _mstcols:string|string[], _detcols:string|string[]) : Promise<SQLRest>
	{
		return(null);
	}

	public async query(filter?:FilterStructure) : Promise<boolean>
	{
		this.fetched$ = [];
		this.nosql$ = null;
		filter = filter?.clone();

		if (!this.conn$.connected())
		{
			Alert.warning("Not connected","Database Connection");
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

		let stmt:string = this.sql$ + " and 1 = 2";
		let sql:SQLRest = SQLRestBuilder.finish(stmt,this.where$,null,this.bindings$,null);

		let response:any = await this.conn$.select(sql,null,1,true);

		if (!response.success)
		{
			Alert.warning("Unable to describe query '"+this.sql$+"'","Database");
			return(false);
		}

		let columns:string[] = response.columns;

		for (let i = 0; i < columns.length; i++)
		{
			let type:string = response.types[i];
			let cname:string = columns[i].toLowerCase();
			let datatype:DataType = DataType[type.toLowerCase()];

			let exist:DataType = this.datatypes$.get(cname);
			if (!exist) this.datatypes$.set(cname,datatype);
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
			record.response = new DatabaseResponse(response, this.columns);

			fetched.push(record);
		}

		return(fetched);
	}
}