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
import { MSGGRP } from "../messages/Internal.js";
import { Messages } from "../messages/Messages.js";
import { DatabaseResponse } from "./DatabaseResponse.js";
/**
 * SQLStatement is used with OpenRestDB to execute any
 * sql-statement
 */
export class SQLStatement {
    pos = 0;
    sql$ = null;
    response$ = null;
    types = null;
    cursor$ = null;
    patch$ = false;
    message$ = null;
    arrayfecth$ = 1;
    records$ = null;
    conn$ = null;
    columns$ = null;
    returning$ = false;
    retvals = null;
    bindvalues$ = new Map();
    /** @param connection : A connection to OpenRestDB */
    constructor(connection) {
        if (connection == null) {
            // Cannot create object when onnection is null
            Messages.severe(MSGGRP.ORDB, 2, this.constructor.name);
            return;
        }
        this.conn$ = connection["conn$"];
    }
    /** The sql-statement */
    get sql() {
        return (this.sql);
    }
    /** The sql-statement */
    set sql(sql) {
        this.sql$ = sql;
    }
    /** If the statement changes any values the backend */
    set patch(flag) {
        this.patch$ = flag;
    }
    /** The columns involved in a select statement */
    get columns() {
        return (this.columns$);
    }
    /** If used with sql-extension 'returning' */
    get returnvalues() {
        return (this.returning$);
    }
    /** If used with sql-extension 'returning' */
    set returnvalues(flag) {
        this.returning$ = flag;
    }
    /** The number of rows to fetch from a select-statement per call to fetch */
    get arrayfetch() {
        return (this.arrayfecth$);
    }
    /** The number of rows to fetch from a select-statement per call to fetch */
    set arrayfetch(size) {
        this.arrayfecth$ = size;
    }
    /** The error message from the backend */
    error() {
        return (this.message$);
    }
    /** Bind values defined with colon i.e. salary = :salary */
    bind(name, value, type) {
        this.addBindValue(new BindValue(name, value, type));
    }
    /** Bind values defined with colon i.e. salary = :salary */
    addBindValue(bindvalue) {
        this.bindvalues$.set(bindvalue.name?.toLowerCase(), bindvalue);
    }
    /** Execute the statement */
    async execute() {
        if (this.sql$ == null)
            return (false);
        let type = this.sql$.trim().substring(0, 6);
        let sql = new SQLRest();
        if (this.returning$)
            sql.returnclause = true;
        sql.stmt = this.sql$;
        sql.bindvalues = [...this.bindvalues$.values()];
        if (type == "select" || this.returning$)
            this.cursor$ = new Cursor();
        switch (type?.toLowerCase()) {
            case "insert":
                this.response$ = await this.conn$.insert(sql);
                break;
            case "update":
                this.response$ = await this.conn$.update(sql);
                break;
            case "delete":
                this.response$ = await this.conn$.delete(sql);
                break;
            case "select":
                this.response$ = await this.conn$.select(sql, this.cursor$, this.arrayfecth$, true);
                break;
            default: this.response$ = await this.conn$.execute(this.patch$, sql);
        }
        let success = this.response$.success;
        if (!success) {
            this.cursor$ = null;
            this.message$ = this.response$.message;
        }
        if (success && type == "select") {
            this.types = this.response$.types;
            this.columns$ = this.response$.columns;
            this.records$ = this.parse(this.response$);
        }
        if (this.returning$)
            this.retvals = new DatabaseResponse(this.response$, null);
        return (success);
    }
    /** Fetch rows, if select statement */
    async fetch() {
        if (!this.cursor$)
            return (null);
        if (this.records$.length > this.pos)
            return (this.records$[this.pos++]);
        if (this.cursor$.eof)
            return (null);
        this.pos = 0;
        this.response$ = await this.conn$.fetch(this.cursor$);
        if (!this.response$.success) {
            this.message$ = this.response$.message;
            return (null);
        }
        this.records$ = this.parse(this.response$);
        return (this.fetch());
    }
    /** Get return value if 'returning' */
    getReturnValue(column, type) {
        let value = this.retvals.getValue(column);
        if (type) {
            if (typeof type != "string")
                type = DataType[type];
            type = type.toLowerCase();
            if (type == "date" || type == "datetime" || type == "timestamp")
                value = new Date(value);
        }
        return (value);
    }
    /** Close and clean up */
    async close() {
        let response = null;
        if (this.cursor$ != null && !this.cursor$.eof)
            response = await this.conn$.close(this.cursor$);
        this.cursor$ = null;
        this.records$ = null;
        if (response)
            return (response.success);
        return (true);
    }
    parse(response) {
        if (!response.success) {
            this.cursor$ = null;
            return ([]);
        }
        if (response.rows.length == 0)
            return ([]);
        let rows = response.rows;
        let columns = response.columns;
        let datetypes = ["date", "datetime", "timestamp"];
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < columns.length; c++) {
                if (datetypes.includes(this.types[c].toLowerCase()))
                    rows[r][c] = new Date(rows[r][c]);
            }
        }
        return (rows);
    }
}
