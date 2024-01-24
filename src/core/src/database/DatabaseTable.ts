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
import { MSGGRP } from "../messages/Internal.js";
import { SQLRestBuilder } from "./SQLRestBuilder.js";
import { Filter } from "../model/interfaces/Filter.js";
import { SubQuery } from "../model/filters/SubQuery.js";
import { Record, RecordState } from "../model/Record.js";
import { DatabaseResponse } from "./DatabaseResponse.js";
import { Level, Messages } from "../messages/Messages.js";
import { Connection, Step } from "../database/Connection.js";
import { FilterStructure } from "../model/FilterStructure.js";
import { DatabaseConnection } from "../public/DatabaseConnection.js";
import { DataSource, LockMode } from "../model/interfaces/DataSource.js";

/**
 * Datasource based on a table/view using OpenRestDB
 */
export class DatabaseTable extends SQLSource implements DataSource
{
	public name:string;
	public arrayfecth:number = 32;
	public queryallowed:boolean = true;
	public insertallowed:boolean = true;
	public updateallowed:boolean = true;
	public deleteallowed:boolean = true;
	public rowlocking:LockMode = LockMode.Pessimistic;

	private dirty$:Record[] = [];
	private described$:boolean = false;

	private table$:string = null;
	private order$:string = null;
	private cursor$:Cursor = null;

	private columns$:string[] = [];
	private primary$:string[] = [];
	private dmlcols$:string[] = [];

	private fetched$:Record[] = [];

	private conn$:Connection = null;
	private nosql$:FilterStructure = null;
	private limit$:FilterStructure = null;
	private pubconn$:DatabaseConnection = null;

	private insreturncolumns$:string[] = null;
	private updreturncolumns$:string[] = null;
	private delreturncolumns$:string[] = null;

	private datatypes$:Map<string,string> =
		new Map<string,string>();

	/**
	 *  @param connection : OpenRestDB connection to a database
	 *  @param table : Database table/view
	 *  @param columns : Columns from the table/view
	 */
	public constructor(connection:DatabaseConnection, table:string, columns?:string|string[])
	{
		super();

		if (connection == null)
		{
			// Cannot create object when onnection is null
			Messages.severe(MSGGRP.ORDB,2,this.constructor.name);
			return;
		}

		this.table$ = table;
		this.pubconn$ = connection;
		this.conn$ = connection["conn$"];

		if (columns != null)
		{
			if (!Array.isArray(columns))
				columns = [columns];

			this.columns$ = columns;
		}

		this.name = table;
	}

	/** Set the table/view */
	public set table(table:string)
	{
		this.table$ = table;
		this.described$ = false;
		if (this.name == null) this.name = table;
	}

	/** Whether the datasource is transactional */
	public get transactional() : boolean
	{
		return(this.conn$.transactional);
	}

	/** Closes backend cursor */
	public clear() : void
	{
		this.dirty$ = [];

		if (this.cursor$ && !this.cursor$.eof)
			this.conn$.close(this.cursor$);

		this.cursor$ = null;
	}

	/** Clones the datasource */
	public clone() : DatabaseTable
	{
		let clone:DatabaseTable = new DatabaseTable(this.pubconn$,this.table$);

		clone.sorting = this.sorting;
		clone.primary$ = this.primary$;
		clone.columns$ = this.columns$;
		clone.described$ = this.described$;
		clone.arrayfecth = this.arrayfecth;
		clone.datatypes$ = this.datatypes$;

		clone.insertReturnColumns = this.insertReturnColumns;
		clone.updateReturnColumns = this.updateReturnColumns;
		clone.deleteReturnColumns = this.deleteReturnColumns;

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

	/** The columns used by this datasource */
	public get columns() : string[]
	{
		return(this.columns$);
	}

	/** Set the column names involved */
	public set columns(columns:string|string[])
	{
		if (!Array.isArray(columns))
			columns = [columns];

		this.columns$ = columns;
	}

	/** Get the primary key defined for this datasource */
	public get primaryKey() : string[]
	{
		if (this.primary$ == null || this.primary$.length == 0)
		{
			this.primary$ = [];
			this.primary$.push(...this.columns$);
		}

		return(this.primary$);
	}

	/** Set the primary key for this datasource */
	public set primaryKey(columns:string|string[])
	{
		if (!Array.isArray(columns))
			columns = [columns];

		this.addColumns(columns);
		this.primary$ = columns;
	}

	/** Force a datatype */
	public setDataType(column:string,type:DataType|string) : DatabaseTable
	{
		if (typeof type != "string") type = DataType[type];
		this.datatypes$.set(column?.toLowerCase(),type.toLowerCase());
		return(this);
	}

	/** Get columns defined for 'returning' after insert */
	public get insertReturnColumns() : string[]
	{
		return(this.insreturncolumns$);
	}

	/** Set columns defined for 'returning' after insert */
	public set insertReturnColumns(columns:string|string[])
	{
		if (!Array.isArray(columns))
			columns = [columns];

		this.insreturncolumns$ = columns;
	}

	/** Get columns defined for 'returning' after update */
	public get updateReturnColumns() : string[]
	{
		return(this.updreturncolumns$);
	}

	/** Set columns defined for 'returning' after update */
	public set updateReturnColumns(columns:string|string[])
	{
		if (!Array.isArray(columns))
			columns = [columns];

		this.updreturncolumns$ = columns;
	}

	/** Get columns defined for 'returning' after delete */
	public get deleteReturnColumns() : string[]
	{
		return(this.delreturncolumns$);
	}

	/** Set columns defined for 'returning' after delete */
	public set deleteReturnColumns(columns:string|string[])
	{
		if (!Array.isArray(columns))
			columns = [columns];

		this.delreturncolumns$ = columns;
	}

	/** Add additional columns participating in insert, update and delete */
	public addDMLColumns(columns:string|string[]) : void
	{
		if (!Array.isArray(columns))
			columns = [columns];

		this.dmlcols$ = this.mergeColumns(this.dmlcols$,columns);
	}

	/** Add columns participating in all operations on the table/view */
	public addColumns(columns:string|string[]) : DatabaseTable
	{
		if (!Array.isArray(columns))
			columns = [columns];

		this.columns$ = this.mergeColumns(this.columns$,columns);
		return(this);
	}

	/** Remove columns participating in all operations on the table/view */
	public removeColumns(columns:string|string[]) : DatabaseTable
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

	/** Return the default filters */
	public getFilters() : FilterStructure
	{
		return(this.limit$);
	}

	/** Add a default filter */
	public addFilter(filter:Filter | FilterStructure) : DatabaseTable
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

	/** Lock the given record in the database */
	public async lock(record:Record) : Promise<boolean>
	{
		if (record.locked)
			return(true);

		if (!this.rowlocking)
			return(true);

		if (!await this.describe())
			return(false);

		let columns:string[] =
			this.mergeColumns(this.columns,this.dmlcols$);

		let sql:SQLRest = SQLRestBuilder.lock(this.table$,this.primary$,columns,record);
		this.setTypes(sql.bindvalues);

		SQLRestBuilder.assert(sql,this.columns,record);

		if (sql.assert != null)
			this.setTypes(sql.assert);

		let response:any = await this.conn$.lock(sql);

		return(this.process(record,response));
	}

	/** Undo not flushed changes */
	public async undo() : Promise<Record[]>
	{
		let undo:Record[] = [];

		for (let i = 0; i < this.dirty$.length; i++)
		{
			this.dirty$[i].refresh();
			undo.push(this.dirty$[i]);
		}

		return(undo);
	}

	/** Flush changes to backend */
	public async flush() : Promise<Record[]>
	{
		let sql:SQLRest = null;
		let processed:Record[] = [];

		if (this.dirty$.length == 0)
			return([]);

		if (!this.conn$.connected())
		{
			// Not connected
			Messages.severe(MSGGRP.ORDB,3,this.constructor.name);
			return([]);
		}

		if (!await this.describe())
			return([]);

		let columns:string[] =
		this.mergeColumns(this.columns,this.dmlcols$);

		let records:{step:Step, record:Record}[] = [];

		for (let i = 0; i < this.dirty$.length; i++)
		{
			let retcols:string[] = [];
			let rec:Record = this.dirty$[i];

			if (rec.failed)
				continue;

			if (rec.state == RecordState.Insert)
			{
				processed.push(rec);
				rec.response = null;

				retcols = this.insertReturnColumns;
				if (retcols == null) retcols = [];

				sql = SQLRestBuilder.insert(this.table$,columns,rec,this.insertReturnColumns);
				this.setTypes(sql.bindvalues);

				retcols.forEach((col) =>
				{
					let type:string = this.datatypes$.get(col);
					if (type != null) sql.bindvalues.push(new BindValue(col,null,type));
				})

				records.push({record:rec,
				step:
				{
					path: "insert",
					stmt: sql.stmt,
					assert: sql.assert,
					bindvalues: sql.bindvalues,
					returnclause: retcols.length > 0
				}
				});
			}

			else

			if (rec.state == RecordState.Delete)
			{
				processed.push(rec);
				rec.response = null;

				retcols = this.delreturncolumns$;
				if (retcols == null) retcols = [];

				sql = SQLRestBuilder.delete(this.table$,this.primaryKey,rec,this.delreturncolumns$);
				this.setTypes(sql.bindvalues);

				retcols.forEach((col) =>
				{
					let type:string = this.datatypes$.get(col);
					if (type != null) sql.bindvalues.push(new BindValue(col,null,type));
				})

				let locking:boolean = !rec.locked;

				if (this.rowlocking == LockMode.None)
					locking = false;

				if (locking)
					SQLRestBuilder.assert(sql,columns,rec);

				records.push({record:rec,
				step:
				{
					path: "delete",
					stmt: sql.stmt,
					assert: sql.assert,
					bindvalues: sql.bindvalues,
					returnclause: retcols.length > 0
				}
				});
			}

			else

			if (rec.state != RecordState.Deleted)
			{
				if (!rec.dirty)
					continue;

				processed.push(rec);
				rec.response = null;

				retcols = this.delreturncolumns$;
				if (retcols == null) retcols = [];

				sql = SQLRestBuilder.update(this.table$,this.primaryKey,columns,rec,this.updreturncolumns$);
				this.setTypes(sql.bindvalues);

				retcols.forEach((col) =>
				{
					let type:string = this.datatypes$.get(col);
					if (type != null) sql.bindvalues.push(new BindValue(col,null,type));
				})

				let locking:boolean = !rec.locked;

				if (this.rowlocking == LockMode.None)
					locking = false;

				if (locking)
					SQLRestBuilder.assert(sql,columns,rec);

				records.push({record:rec,
				step:
				{
					path: "update",
					stmt: sql.stmt,
					assert: sql.assert,
					bindvalues: sql.bindvalues,
					returnclause: retcols.length > 0
				}
				});
			}
		}

		let stmts:Step[] = [];
		records.forEach((record) =>
		{stmts.push(record.step);})

		let responses:any[] = await this.conn$.batch(stmts);

		for (let i = 0; i < records.length; i++)
		{
			let step:Step = records[i].step;
			let response:any = responses[i];
			let record:Record = records[i].record;

			this.castResponse(response);

			if (step.path == "insert")
			{
				record.response = new DatabaseResponse(response,this.insreturncolumns$);
				await this.process(record,response);
			}
			else if (step.path == "update")
			{
				record.response = new DatabaseResponse(response,this.updreturncolumns$);
				await this.process(record,response);
			}
			else if (step.path == "delete")
			{
				record.response = new DatabaseResponse(response,this.delreturncolumns$);
				await this.process(record,response);
			}
		}

		this.dirty$ = [];
		return(processed);
	}

	/** Re-fetch the given record from the backend */
	public async refresh(record:Record) : Promise<boolean>
	{
		if (!await this.describe())
			return;

		record.refresh();

		let sql:SQLRest = SQLRestBuilder.refresh(this.table$,this.primary$,this.columns,record);
		this.setTypes(sql.bindvalues);

		let response:any = await this.conn$.refresh(sql);
		let fetched:Record[] = this.parse(response,null);

		if (fetched.length == 0)
		{
			record.state = RecordState.Delete;
			Messages.warn(MSGGRP.SQL,1); // Record has been deleted
			return(false);
		}

		for (let i = 0; i < this.columns.length; i++)
		{
			let nv:any = fetched[0].getValue(this.columns[i]);
			record.setValue(this.columns[i],nv)
		}

		record.state = RecordState.Consistent;
		return(true);
	}

	/** Create a record for inserting a row in the table/view */
	public async insert(record:Record) : Promise<boolean>
	{
		if (!this.dirty$.includes(record))
			this.dirty$.push(record);
		return(true);
	}

	/** Mark a record for updating a row in the table/view */
	public async update(record:Record) : Promise<boolean>
	{
		if (!this.dirty$.includes(record))
			this.dirty$.push(record);
		return(true);
	}

	/** Mark a record for deleting a row in the table/view */
	public async delete(record:Record) : Promise<boolean>
	{
		if (!this.dirty$.includes(record))
			this.dirty$.push(record);
		return(true);
	}

	/** Get the query as a subquery */
	public async getSubQuery(filter:FilterStructure, mstcols:string|string[], detcols:string|string[]) : Promise<SQLRest>
	{
		filter = filter?.clone();

		if (!Array.isArray(mstcols))
			mstcols = [mstcols];

		if (!Array.isArray(detcols))
			detcols = [detcols];

		if (!this.conn$.connected())
		{
			// Not connected
			Messages.severe(MSGGRP.ORDB,3,this.constructor.name);
			return(null);
		}

		if (!await this.describe())
			return(null);

		if (this.limit$ != null)
		{
			if (!filter) filter = this.limit$;
			else filter.and(this.limit$,"limit");
		}

		let details:FilterStructure = filter?.getFilterStructure("details");

		if (details != null)
		{
			let filters:Filter[] = details.getFilters();

			for (let i = 0; i < filters.length; i++)
			{
				let df:Filter = filters[i];

				if (df instanceof SubQuery && df.subquery == null)
					return(null);
			}
		}

		filter.delete("masters");

		filter?.getFilters().forEach((f) =>
		{f.setBindValueName(this.name+"_"+f.getBindValueName())})

		this.setTypes(filter?.get("qbe")?.getBindValues());
		this.setTypes(filter?.get("limit")?.getBindValues());

		let sql:SQLRest = SQLRestBuilder.subquery(this.table$,mstcols,detcols,filter);
		return(sql);
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
					this.addColumns(df.columns);
				}
			}
		}

		this.createCursor();

		let sql:SQLRest = SQLRestBuilder.select(this.table$,this.columns,filter,this.sorting);
		let response:any = await this.conn$.select(sql,this.cursor$,this.arrayfecth);

		this.fetched$ = this.parse(response,this.cursor$);
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
			this.cursor$ = null;
			console.error(this.name+" failed to fetch: "+JSON.stringify(response));
			return([]);
		}

		let fetched:Record[] = this.parse(response,this.cursor$);

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
		let sql:SQLRest = new SQLRest();
		if (this.described$) return(true);

		sql.stmt = "select * from "+this.table$+" where 1 = 2";

		let response:any = SQLCache.get(sql.stmt);

		let cached:boolean = false;
		if (response) cached = true;
		else response = await this.conn$.select(sql,null,1,true);

		if (!response.success)
		{
			// Unable to describe table
			Messages.severe(MSGGRP.SQL,3,this.table$,response.message);
			return(false);
		}

		if (!cached)
			SQLCache.put(sql.stmt,response);

		let columns:string[] = response.columns;

		for (let i = 0; i < columns.length; i++)
		{
			columns[i] = columns[i].toLowerCase();

			let type:string = response.types[i];
			let datatype:string = type.toLowerCase();

			let exist:string = this.datatypes$.get(columns[i]);
			if (!exist) this.datatypes$.set(columns[i],datatype);
		}

		this.described$ = response.success;
		return(this.described$);
	}

	private setTypes(bindvalues:BindValue[]) : void
	{
		bindvalues?.forEach((b) =>
		{
			let col:string = b.column?.toLowerCase();
			let t:string = this.datatypes$.get(col);
			if (!b.forceDataType && t != null) b.type = t;
		})
	}

	private parse(response:any, cursor:Cursor) : Record[]
	{
		let fetched:Record[] = [];
		let rows:any[][] = response.rows;

		if (!response.success)
		{
			if (cursor) cursor.eof = true;
			return(fetched);
		}

		if (this.primary$ == null)
			this.primary$ = this.columns$;

		let dates:boolean[] = [];
		let datetypes:string[] = ["date", "datetime", "timestamp"];

		for (let c = 0; c < this.columns.length; c++)
		{
			let dt:string = this.datatypes$.get(this.columns[c].toLowerCase());
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

	private castResponse(response:any) : void
	{
		let rows:any[][] = response.rows;

		if (rows == null)
			return;

		let datetypes:string[] = ["date", "datetime", "timestamp"];

		for (let r = 0; r < rows.length; r++)
		{
			Object.keys(rows[r]).forEach((col) =>
			{
				col = col.toLowerCase();
				let value:any = rows[r][col];
				let dt:string = this.datatypes$.get(col);

				if (datetypes.includes(dt) && typeof value === "number")
					rows[r][col] = new Date(value);
			})
		}
	}

	private async process(record:Record, response:any) : Promise<boolean>
	{
		if (!response.success)
		{
			if (response.violations)
			{
				record.locked = true;

				let columns:string = "";
				let violations:any[] = response.violations;

				for (let i = 0; i < violations.length && i < 5; i++)
				{
					if (i > 0) columns += ", ";
					columns += violations[i].column;
				}

				if (violations.length > 5)
					columns += ", ...";

				await record.block.wrapper.refresh(record);
				let row:number = record.block.view.displayed(record)?.rownum;

				if (row != null)
					await record.block.view.refresh(record);

				if (row == null) Messages.warn(MSGGRP.TRX,9,columns); // Record has been changed by another user
				else Messages.warn(MSGGRP.TRX,10,row,columns); // Same but with rownum
			}
			else
			{
				if (response.lock)
				{
					if (response.rows?.length == 0)
					{
						record.state = RecordState.Deleted;
						Messages.warn(MSGGRP.TRX,11); // Record has been deleted by another user
					}
					else
					{
						await record.block.wrapper.refresh(record);
						let row:number = record.block.view.displayed(record)?.rownum;

						if (row != null)
						{
							await record.block.view.refresh(record);
							record.setClean(true);
						}

						// Record is locked by another user
						if (row == null) Messages.warn(MSGGRP.TRX,12);
						else Messages.warn(MSGGRP.TRX,13,row); // with rownum
					}
				}
				else
				{
					let assert:string = response.assert ? " "+response.assert : "";
					Messages.handle(MSGGRP.TRX,response.message+assert,Level.severe);
				}
			}

			record.failed = true;
			record.locked = false;

			return(false);
		}

		return(true);
	}

	private mergeColumns(list1:string[], list2:string[]) : string[]
	{
		let cnames:string[] = [];
		let columns:string[] = [];

		list1?.forEach((col) =>
		{
			col = col.toLowerCase();

			columns.push(col);
			cnames.push(col);
		})

		list2?.forEach((col) =>
		{
			col = col.toLowerCase();

			if (!cnames.includes(col))
			{
				columns.push(col);
				cnames.push(col);
			}
		})

		return(columns);
	}
}