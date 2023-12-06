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

import { SQLRest } from "./SQLRest.js";
import { BindValue } from "./BindValue.js";
import { Record } from "../model/Record.js";
import { Filters } from "../model/filters/Filters.js";
import { Filter } from "../model/interfaces/Filter.js";
import { Parameter, ParameterType } from "./Parameter.js";
import { FilterStructure } from "../model/FilterStructure.js";

export class SQLRestBuilder
{
	public static proc(name:string, parameters:Parameter[], retparam:Parameter) : SQLRest
	{
		let plist:string = "";
		let param:Parameter = null;
		let bindv:BindValue = null;
		let bindvalues:BindValue[] = [];

		if (retparam != null)
		{
			bindv = new BindValue(retparam.name,retparam.value,retparam.dtype);
			bindv.outtype = true;
			bindvalues.push(bindv);
		}

		for (let i = 0; i < parameters.length; i++)
		{
			param = parameters[i];
			if (i > 0) plist += ",";

			if (param.ptype == ParameterType.in) plist += ":";
			else											 plist += "&";

			plist += param.name;
			bindv = new BindValue(param.name,param.value,param.dtype);

			if (param.ptype == ParameterType.out)
				bindv.outtype = true;

			bindvalues.push(bindv);
		}

		let stmt:string = name+"("+plist+")";

		if (retparam != null)
			stmt = retparam.name+" = " + stmt;

		let parsed:SQLRest = new SQLRest();

		parsed.stmt = stmt;
		parsed.bindvalues = bindvalues;

		return(parsed);
	}

	public static select(table:string, columns:string[], filter:FilterStructure, order:string) : SQLRest
	{
		let parsed:SQLRest =
			new SQLRest();

		let stmt:string = "select ";

		for (let i = 0; i < columns.length; i++)
		{
			if (i > 0) stmt += ",";
			stmt += columns[i];
		}

		stmt += " from "+table;

		if (filter && !filter.empty)
			stmt += " where " + filter.asSQL();

		if (order)
			stmt += " order by "+order;

		parsed.stmt = stmt;
		parsed.bindvalues = filter?.getBindValues();

		return(parsed);
	}

	public static finish(sql:string, where:boolean, filter:FilterStructure, bindings:BindValue[], order:string) : SQLRest
	{
		let parsed:SQLRest = new SQLRest();
		let first:string = where ? " where " : " and ";

		parsed.stmt = sql;

		if (filter && !filter.empty)
			parsed.stmt += first + filter.asSQL();

		if (order)
			parsed.stmt += " order by "+order;

		parsed.bindvalues = filter?.getBindValues();

		if (bindings)
		{
			if (!parsed.bindvalues)
				parsed.bindvalues = [];

			parsed.bindvalues.push(...bindings);
		}

		return(parsed);
	}

	public static lock(table:string, pkey:string[], columns:string[], record:Record) : SQLRest
	{
		let parsed:SQLRest =
			new SQLRest();

		let stmt:string = "select ";

		for (let i = 0; i < columns.length; i++)
		{
			if (i > 0) stmt += ",";
			stmt += columns[i];
		}

		stmt += " from "+table+" where ";

		let filters:FilterStructure = new FilterStructure();

		for (let i = 0; i < pkey.length; i++)
		{
			let filter:Filter = Filters.Equals(pkey[i]);
			let value:any = record.getInitialValue(pkey[i]);
			filters.and(filter.setConstraint(value),pkey[i]);
		}

		stmt += filters.asSQL();
		stmt += " for update";

		parsed.stmt = stmt;
		parsed.bindvalues = filters.getBindValues();

		return(parsed);
	}

	public static refresh(table:string, pkey:string[], columns:string[], record:Record) : SQLRest
	{
		let parsed:SQLRest =
			new SQLRest();

		let stmt:string = "select ";

		for (let i = 0; i < columns.length; i++)
		{
			if (i > 0) stmt += ",";
			stmt += columns[i];
		}

		stmt += " from "+table+" where ";

		let filters:FilterStructure = new FilterStructure();

		for (let i = 0; i < pkey.length; i++)
		{
			let filter:Filter = Filters.Equals(pkey[i]);
			let value:any = record.getInitialValue(pkey[i]);
			filters.and(filter.setConstraint(value),pkey[i]);
		}

		stmt += filters.asSQL();

		parsed.stmt = stmt;
		parsed.bindvalues = filters.getBindValues();

		return(parsed);
	}

	public static fetch(cursor:string) : SQLRest
	{
		let parsed:SQLRest = new SQLRest();
		parsed.stmt = '{"cursor": "'+ cursor+'" }';
		return(parsed);
	}

	public static insert(table:string, columns:string[], record:Record, returncolumns:string[]) : SQLRest
	{
		let binds:BindValue[] = [];
		let parsed:SQLRest = new SQLRest();

		let stmt:string = "insert into "+table+"(";

		for (let i = 0; i < columns.length; i++)
		{
			if (i > 0) stmt += ",";
			stmt += columns[i];
		}

		stmt += ") values (";

		for (let i = 0; i < columns.length; i++)
		{
			if (i > 0) stmt += ",";
			stmt += ":"+columns[i];

			binds.push(new BindValue(columns[i],record.getValue(columns[i])))
		}

		stmt += ")";

		if (returncolumns != null && returncolumns.length > 0)
		{
			stmt += " returning ";
			parsed.returnclause = true;

			for (let i = 0; i < returncolumns.length; i++)
			{
				if (i > 0) stmt += ",";
				stmt += returncolumns[i];
			}
		}

		parsed.stmt = stmt;
		parsed.bindvalues = binds;

		return(parsed);
	}

	public static update(table:string, pkey:string[], columns:string[], record:Record, returncolumns:string[]) : SQLRest
	{
		let idx:number = 0;
		let value:any = null;
		let bv:BindValue = null;
		let binds:BindValue[] = [];

		let parsed:SQLRest = new SQLRest();
		let dirty:string[] = record.getDirty();
		let filters:FilterStructure = new FilterStructure();

		if (dirty.length == 0)
			return(null);

		let cnames:string[] = [];
		columns.forEach((col) => cnames.push(col.toLowerCase()));

		let stmt:string = "update "+table+" set ";

		for (let i = 0; i < dirty.length; i++)
		{
			idx = cnames.indexOf(dirty[i]);
			value = record.getValue(dirty[i]);

			if (i > 0) stmt += ", ";
			stmt += columns[idx] + " = :b"+i;

			bv = new BindValue("b"+i,value);
			bv.column = columns[idx];

			binds.push(bv);
		}

		for (let i = 0; i < pkey.length; i++)
		{
			let filter:Filter = Filters.Equals(pkey[i]);
			let value:any = record.getInitialValue(pkey[i]);
			filters.and(filter.setConstraint(value),pkey[i]);
		}

		stmt += " where "+filters.asSQL();

		if (returncolumns != null && returncolumns.length > 0)
		{
			stmt += " returning ";
			parsed.returnclause = true;

			for (let i = 0; i < returncolumns.length; i++)
			{
				if (i > 0) stmt += ",";
				stmt += returncolumns[i];
			}
		}

		parsed.stmt = stmt;
		parsed.bindvalues = filters.getBindValues();
		parsed.bindvalues.push(...binds);

		return(parsed);
	}

	public static delete(table:string, pkey:string[], record:Record, returncolumns:string[]) : SQLRest
	{
		let parsed:SQLRest = new SQLRest();
		let stmt:string = "delete from "+table+" where ";

		let filters:FilterStructure = new FilterStructure();

		for (let i = 0; i < pkey.length; i++)
		{
			let filter:Filter = Filters.Equals(pkey[i]);
			let value:any = record.getInitialValue(pkey[i]);
			filters.and(filter.setConstraint(value),pkey[i]);
		}

		stmt += filters.asSQL();


		if (returncolumns != null && returncolumns.length > 0)
		{
			stmt += " returning ";
			parsed.returnclause = true;

			for (let i = 0; i < returncolumns.length; i++)
			{
				if (i > 0) stmt += ",";
				stmt += returncolumns[i];
			}
		}

		parsed.stmt = stmt;
		parsed.bindvalues = filters.getBindValues();

		return(parsed);
	}

	public static subquery(table:string, mstcols:string[], detcols:string[], filter:FilterStructure) : SQLRest
	{
		let sql:SQLRest = new SQLRest();

		sql.stmt = "(";

		for (let i = 0; i < mstcols.length; i++)
		{
			if (i > 0) sql.stmt += ",";
			sql.stmt += mstcols[i];
		}

		sql.stmt += ") in (select ";

		for (let i = 0; i < detcols.length; i++)
		{
			if (i > 0) sql.stmt += ",";
			sql.stmt += detcols[i];
		}

		sql.stmt += " from "+table;

		if (filter && !filter.empty)
			sql.stmt += " where " + filter.asSQL();

		sql.stmt += ")";
		sql.bindvalues = filter?.getBindValues();

		return(sql);
	}

	public static assert(sql:SQLRest, columns:string[], record:Record) : void
	{
		let binds:BindValue[] = [];

		columns.forEach((column) =>
		{binds.push(new BindValue(column,record.getInitialValue(column)))});

		if (binds.length> 0)
			sql.assert = binds;
	}
}