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
import { Filters } from "../model/filters/Filters.js";
import { ParameterType } from "./Parameter.js";
import { FilterStructure } from "../model/FilterStructure.js";
export class SQLRestBuilder {
    static proc(name, parameters, retparam) {
        let plist = "";
        let param = null;
        let bindv = null;
        let bindvalues = [];
        if (retparam != null) {
            bindv = new BindValue(retparam.name, retparam.value, retparam.dtype);
            bindv.outtype = true;
            bindvalues.push(bindv);
        }
        for (let i = 0; i < parameters.length; i++) {
            param = parameters[i];
            if (i > 0)
                plist += ",";
            if (param.ptype == ParameterType.in)
                plist += ":";
            else
                plist += "&";
            plist += param.name;
            bindv = new BindValue(param.name, param.value, param.dtype);
            if (param.ptype == ParameterType.out)
                bindv.outtype = true;
            bindvalues.push(bindv);
        }
        let stmt = name + "(" + plist + ")";
        if (retparam != null)
            stmt = retparam.name + " = " + stmt;
        let parsed = new SQLRest();
        parsed.stmt = stmt;
        parsed.bindvalues = bindvalues;
        return (parsed);
    }
    static select(table, columns, filter, order) {
        let parsed = new SQLRest();
        let stmt = "select ";
        for (let i = 0; i < columns.length; i++) {
            if (i > 0)
                stmt += ",";
            stmt += columns[i];
        }
        stmt += " from " + table;
        if (filter && !filter.empty)
            stmt += " where " + filter.asSQL();
        if (order)
            stmt += " order by " + order;
        parsed.stmt = stmt;
        parsed.bindvalues = filter?.getBindValues();
        return (parsed);
    }
    static finish(sql, where, filter, bindings, order) {
        let parsed = new SQLRest();
        let first = where ? " where " : " and ";
        parsed.stmt = sql;
        if (filter && !filter.empty)
            parsed.stmt += first + filter.asSQL();
        if (order)
            parsed.stmt += " order by " + order;
        parsed.bindvalues = filter?.getBindValues();
        if (bindings) {
            if (!parsed.bindvalues)
                parsed.bindvalues = [];
            parsed.bindvalues.push(...bindings);
        }
        return (parsed);
    }
    static lock(table, pkey, columns, record) {
        let parsed = new SQLRest();
        let stmt = "select ";
        for (let i = 0; i < columns.length; i++) {
            if (i > 0)
                stmt += ",";
            stmt += columns[i];
        }
        stmt += " from " + table + " where ";
        let filters = new FilterStructure();
        for (let i = 0; i < pkey.length; i++) {
            let filter = Filters.Equals(pkey[i]);
            let value = record.getInitialValue(pkey[i]);
            filters.and(filter.setConstraint(value), pkey[i]);
        }
        stmt += filters.asSQL();
        stmt += " for update";
        parsed.stmt = stmt;
        parsed.bindvalues = filters.getBindValues();
        return (parsed);
    }
    static refresh(table, pkey, columns, record) {
        let parsed = new SQLRest();
        let stmt = "select ";
        for (let i = 0; i < columns.length; i++) {
            if (i > 0)
                stmt += ",";
            stmt += columns[i];
        }
        stmt += " from " + table + " where ";
        let filters = new FilterStructure();
        for (let i = 0; i < pkey.length; i++) {
            let filter = Filters.Equals(pkey[i]);
            let value = record.getInitialValue(pkey[i]);
            filters.and(filter.setConstraint(value), pkey[i]);
        }
        stmt += filters.asSQL();
        parsed.stmt = stmt;
        parsed.bindvalues = filters.getBindValues();
        return (parsed);
    }
    static fetch(cursor) {
        let parsed = new SQLRest();
        parsed.stmt = '{"cursor": "' + cursor + '" }';
        return (parsed);
    }
    static insert(table, columns, record, returncolumns) {
        let binds = [];
        let parsed = new SQLRest();
        let stmt = "insert into " + table + "(";
        for (let i = 0; i < columns.length; i++) {
            if (i > 0)
                stmt += ",";
            stmt += columns[i];
        }
        stmt += ") values (";
        for (let i = 0; i < columns.length; i++) {
            if (i > 0)
                stmt += ",";
            stmt += ":" + columns[i];
            binds.push(new BindValue(columns[i], record.getValue(columns[i])));
        }
        stmt += ")";
        if (returncolumns != null && returncolumns.length > 0) {
            stmt += " returning ";
            parsed.returnclause = true;
            for (let i = 0; i < returncolumns.length; i++) {
                if (i > 0)
                    stmt += ",";
                stmt += returncolumns[i];
            }
        }
        parsed.stmt = stmt;
        parsed.bindvalues = binds;
        return (parsed);
    }
    static update(table, pkey, columns, record, returncolumns) {
        let idx = 0;
        let value = null;
        let bv = null;
        let binds = [];
        let parsed = new SQLRest();
        let dirty = record.getDirty();
        let filters = new FilterStructure();
        if (dirty.length == 0)
            return (null);
        let cnames = [];
        columns.forEach((col) => cnames.push(col.toLowerCase()));
        let stmt = "update " + table + " set ";
        for (let i = 0; i < dirty.length; i++) {
            idx = cnames.indexOf(dirty[i]);
            value = record.getValue(dirty[i]);
            if (i > 0)
                stmt += ", ";
            stmt += columns[idx] + " = :b" + i;
            bv = new BindValue("b" + i, value);
            bv.column = columns[idx];
            binds.push(bv);
        }
        for (let i = 0; i < pkey.length; i++) {
            let filter = Filters.Equals(pkey[i]);
            let value = record.getInitialValue(pkey[i]);
            filters.and(filter.setConstraint(value), pkey[i]);
        }
        stmt += " where " + filters.asSQL();
        if (returncolumns != null && returncolumns.length > 0) {
            stmt += " returning ";
            parsed.returnclause = true;
            for (let i = 0; i < returncolumns.length; i++) {
                if (i > 0)
                    stmt += ",";
                stmt += returncolumns[i];
            }
        }
        parsed.stmt = stmt;
        parsed.bindvalues = filters.getBindValues();
        parsed.bindvalues.push(...binds);
        return (parsed);
    }
    static delete(table, pkey, record, returncolumns) {
        let parsed = new SQLRest();
        let stmt = "delete from " + table + " where ";
        let filters = new FilterStructure();
        for (let i = 0; i < pkey.length; i++) {
            let filter = Filters.Equals(pkey[i]);
            let value = record.getInitialValue(pkey[i]);
            filters.and(filter.setConstraint(value), pkey[i]);
        }
        stmt += filters.asSQL();
        if (returncolumns != null && returncolumns.length > 0) {
            stmt += " returning ";
            parsed.returnclause = true;
            for (let i = 0; i < returncolumns.length; i++) {
                if (i > 0)
                    stmt += ",";
                stmt += returncolumns[i];
            }
        }
        parsed.stmt = stmt;
        parsed.bindvalues = filters.getBindValues();
        return (parsed);
    }
    static subquery(table, mstcols, detcols, filter) {
        let sql = new SQLRest();
        sql.stmt = "(";
        for (let i = 0; i < mstcols.length; i++) {
            if (i > 0)
                sql.stmt += ",";
            sql.stmt += mstcols[i];
        }
        sql.stmt += ") in (select ";
        for (let i = 0; i < detcols.length; i++) {
            if (i > 0)
                sql.stmt += ",";
            sql.stmt += detcols[i];
        }
        sql.stmt += " from " + table;
        if (filter && !filter.empty)
            sql.stmt += " where " + filter.asSQL();
        sql.stmt += ")";
        sql.bindvalues = filter?.getBindValues();
        return (sql);
    }
    static assert(sql, columns, record) {
        let binds = [];
        columns.forEach((column) => { binds.push(new BindValue(column, record.getInitialValue(column))); });
        if (binds.length > 0)
            sql.assert = binds;
    }
}
