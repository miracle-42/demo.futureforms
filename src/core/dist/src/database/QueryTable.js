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
import { DataType } from "./DataType.js";
import { SQLCache } from "./SQLCache.js";
import { SQLSource } from "./SQLSource.js";
import { Record } from "../model/Record.js";
import { MSGGRP } from "../messages/Internal.js";
import { Messages } from "../messages/Messages.js";
import { SQLRestBuilder } from "./SQLRestBuilder.js";
import { SubQuery } from "../model/filters/SubQuery.js";
import { DatabaseResponse } from "./DatabaseResponse.js";
import { FilterStructure } from "../model/FilterStructure.js";
import { LockMode } from "../model/interfaces/DataSource.js";
/**
 * Datasource based on a query using OpenRestDB
 */
export class QueryTable extends SQLSource {
    name;
    arrayfecth = 32;
    queryallowed = true;
    rowlocking = LockMode.None;
    described$ = false;
    sql$ = null;
    order$ = null;
    cursor$ = null;
    where$ = false;
    columns$ = [];
    fetched$ = [];
    conn$ = null;
    bindings$ = null;
    nosql$ = null;
    limit$ = null;
    pubconn$ = null;
    datatypes$ = new Map();
    /** @param connection : OpenRestDB connection to a database, @param sql : a query */
    constructor(connection, sql) {
        super();
        if (connection == null) {
            // Cannot create object when onnection is null
            Messages.severe(MSGGRP.ORDB, 2, this.constructor.name);
            return;
        }
        this.sql$ = sql;
        this.pubconn$ = connection;
        this.conn$ = connection["conn$"];
        this.name = this.constructor.name.toLowerCase();
    }
    /** The query */
    set sql(sql) {
        this.sql$ = sql;
        this.described$ = false;
    }
    /** Whether the datasource is transactional */
    get transactional() {
        return (false);
    }
    /** Closes backend cursor */
    clear() {
        if (this.cursor$ && !this.cursor$.eof)
            this.conn$.close(this.cursor$);
        this.cursor$ = null;
    }
    /** Clones the datasource */
    clone() {
        let clone = new QueryTable(this.pubconn$, this.sql$);
        clone.where$ = this.where$;
        clone.sorting = this.sorting;
        clone.columns$ = this.columns$;
        clone.described$ = this.described$;
        clone.arrayfecth = this.arrayfecth;
        clone.datatypes$ = this.datatypes$;
        return (clone);
    }
    /** The order by clause */
    get sorting() {
        return (this.order$);
    }
    /** The order by clause */
    set sorting(order) {
        this.order$ = order;
    }
    /** Get the column names returned from the query */
    get columns() {
        return (this.columns$);
    }
    /** Insert is not allowed on this source */
    get insertallowed() {
        return (false);
    }
    /** Update is not allowed on this source */
    get updateallowed() {
        return (false);
    }
    /** Delete is not allowed on this source */
    get deleteallowed() {
        return (false);
    }
    /** When adding filters, start with where or and */
    startWithWhere(flag) {
        this.where$ = flag;
    }
    /** Force a datatype */
    setDataType(column, type) {
        this.datatypes$.set(column?.toLowerCase(), type);
        return (this);
    }
    /** Not possible on this datasource */
    addColumns(_columns) {
        return (this);
    }
    /** Not possible on this datasource */
    removeColumns(_columns) {
        return (this);
    }
    /** Return the default filters */
    getFilters() {
        return (this.limit$);
    }
    /** Add a default filter */
    addFilter(filter) {
        if (this.limit$ == null) {
            if (filter instanceof FilterStructure) {
                this.limit$ = filter;
                return (this);
            }
            this.limit$ = new FilterStructure();
        }
        this.limit$.and(filter);
        return (this);
    }
    /** Add a bindvalue */
    addBindValue(bindvalue) {
        if (this.bindings$ == null)
            this.bindings$ = [];
        this.bindings$.push(bindvalue);
    }
    /** Not possible on this datasource */
    async lock(_record) {
        // Cannot lock records on datasource based on a query
        Messages.severe(MSGGRP.TRX, 14);
        return (false);
    }
    /** Not possible on this datasource */
    async undo() {
        return ([]);
    }
    /** Not possible on this datasource */
    async flush() {
        return ([]);
    }
    /** Re-fetch the given record from the backend */
    async refresh(record) {
        record.refresh();
        return (true);
    }
    /** Not possible on this datasource */
    async insert(_record) {
        // Cannot insert records on datasource based on a query
        Messages.severe(MSGGRP.TRX, 15);
        return (false);
    }
    /** Not possible on this datasource */
    async update(_record) {
        // Cannot update records on datasource based on a query
        Messages.severe(MSGGRP.TRX, 16);
        return (false);
    }
    /** Not possible on this datasource */
    async delete(_record) {
        // Cannot delete records on datasource based on a query
        Messages.severe(MSGGRP.TRX, 17);
        return (false);
    }
    /** Not possible on this datasource */
    async getSubQuery(_filter, _mstcols, _detcols) {
        return (null);
    }
    /** Execute the query */
    async query(filter) {
        this.fetched$ = [];
        this.nosql$ = null;
        filter = filter?.clone();
        if (!this.conn$.connected()) {
            // Not connected
            Messages.severe(MSGGRP.ORDB, 3, this.constructor.name);
            return (false);
        }
        if (!await this.describe())
            return (false);
        if (this.limit$ != null) {
            if (!filter)
                filter = this.limit$;
            else
                filter.and(this.limit$, "limit");
        }
        this.setTypes(filter?.get("qbe")?.getBindValues());
        this.setTypes(filter?.get("limit")?.getBindValues());
        this.setTypes(filter?.get("masters")?.getBindValues());
        let details = filter?.getFilterStructure("details");
        if (details != null) {
            let filters = details.getFilters();
            for (let i = 0; i < filters.length; i++) {
                let df = filters[i];
                if (df instanceof SubQuery && df.subquery == null) {
                    if (this.nosql$ == null)
                        this.nosql$ = new FilterStructure(this.name + ".nosql");
                    details.delete(df);
                    this.nosql$.and(df);
                }
            }
        }
        this.createCursor();
        let sql = SQLRestBuilder.finish(this.sql$, this.where$, filter, this.bindings$, this.sorting);
        let response = await this.conn$.select(sql, this.cursor$, this.arrayfecth);
        this.fetched$ = this.parse(response);
        this.fetched$ = await this.filter(this.fetched$);
        return (true);
    }
    /** Fetch a set of records */
    async fetch() {
        if (this.cursor$ == null)
            return ([]);
        if (this.fetched$.length > 0) {
            let fetched = [];
            fetched.push(...this.fetched$);
            this.fetched$ = [];
            return (fetched);
        }
        if (this.cursor$.eof)
            return ([]);
        let response = await this.conn$.fetch(this.cursor$);
        if (!response.success) {
            console.error(this.name + " failed to fetch: " + JSON.stringify(response));
            return ([]);
        }
        let fetched = this.parse(response);
        fetched = await this.filter(fetched);
        if (fetched.length == 0)
            return (this.fetch());
        return (fetched);
    }
    /** Close the database cursor */
    async closeCursor() {
        let response = null;
        if (this.cursor$ && !this.cursor$.eof)
            response = await this.conn$.close(this.cursor$);
        this.fetched$ = [];
        this.cursor$ = null;
        if (response)
            return (response.success);
        return (true);
    }
    createCursor() {
        if (this.cursor$ && !this.cursor$.eof)
            this.conn$.close(this.cursor$);
        this.cursor$ = new Cursor();
    }
    async filter(records) {
        if (this.nosql$) {
            let passed = [];
            for (let i = 0; i < records.length; i++) {
                if (await this.nosql$.evaluate(records[i]))
                    passed.push(records[i]);
            }
            records = passed;
        }
        return (records);
    }
    async describe() {
        if (this.described$)
            return (true);
        let first = this.where$ ? " where " : " and ";
        console.log(first);
        let stmt = this.sql$ + first + " 1 = 2";
        console.log(stmt);
        let sql = SQLRestBuilder.finish(stmt, this.where$, null, this.bindings$, null);
        let response = SQLCache.get(sql.stmt);
        let cached = false;
        if (response)
            cached = true;
        else
            response = await this.conn$.select(sql, null, 1, true);
        if (!response.success) {
            // Unable to describe query
            Messages.warn(MSGGRP.SQL, 3);
            return (false);
        }
        if (!cached)
            SQLCache.put(sql.stmt, response);
        let columns = response.columns;
        for (let i = 0; i < columns.length; i++) {
            columns[i] = columns[i].toLowerCase();
            let type = response.types[i];
            let datatype = DataType[type.toLowerCase()];
            let exist = this.datatypes$.get(columns[i]);
            if (!exist)
                this.datatypes$.set(columns[i], datatype);
        }
        this.columns$ = columns;
        this.described$ = response.success;
        return (this.described$);
    }
    setTypes(bindvalues) {
        bindvalues?.forEach((b) => {
            let col = b.column?.toLowerCase();
            let t = this.datatypes$.get(col);
            if (!b.forceDataType && t != null)
                b.type = DataType[t];
        });
    }
    parse(response) {
        let fetched = [];
        let rows = response.rows;
        if (!response.success) {
            this.cursor$ = null;
            return (fetched);
        }
        let dates = [];
        let datetypes = [DataType.date, DataType.datetime, DataType.timestamp];
        for (let c = 0; c < this.columns.length; c++) {
            let dt = this.datatypes$.get(this.columns[c].toLowerCase());
            if (datetypes.includes(dt))
                dates.push(true);
            else
                dates.push(false);
        }
        for (let r = 0; r < rows.length; r++) {
            let record = new Record(this);
            for (let c = 0; c < rows[r].length; c++) {
                if (rows[r][c] && dates[c]) {
                    if (typeof rows[r][c] === "number")
                        rows[r][c] = new Date(+rows[r][c]);
                }
                record.setValue(this.columns[c], rows[r][c]);
            }
            let response = { succes: true, rows: [rows[r]] };
            record.response = new DatabaseResponse(response, this.columns);
            record.cleanup();
            fetched.push(record);
        }
        return (fetched);
    }
}
