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
import { DataType } from "./DataType.js";
import { MSGGRP } from "../messages/Internal.js";
import { Messages } from "../messages/Messages.js";
import { SQLRestBuilder } from "./SQLRestBuilder.js";
import { Parameter, ParameterType } from "./Parameter.js";
/**
 * StoredProcedure is used with OpenRestDB to execute
 * a stored procedure
 */
export class StoredProcedure {
    name$;
    response$ = null;
    patch$ = false;
    message$ = null;
    conn$ = null;
    params$ = [];
    values$ = new Map();
    datetypes$ = [DataType.date, DataType.datetime, DataType.timestamp];
    retparm$ = null;
    returntype$ = null;
    /** @param connection : A connection to OpenRestDB */
    constructor(connection) {
        if (connection == null) {
            // Cannot create object when onnection is null
            Messages.severe(MSGGRP.ORDB, 2, this.constructor.name);
            return;
        }
        this.conn$ = connection["conn$"];
    }
    /** If the procedure changes any values the backend */
    set patch(flag) {
        this.patch$ = flag;
    }
    /** The error message from the backend */
    error() {
        return (this.message$);
    }
    /** The name of the stored procedure */
    setName(name) {
        this.name$ = name;
    }
    /** Add call parameter */
    addParameter(name, value, datatype, paramtype) {
        let param = new Parameter(name, value, datatype, paramtype);
        this.params$.push(param);
    }
    /** Get out parameter */
    getOutParameter(name) {
        return (this.values$.get(name?.toLowerCase()));
    }
    /** Get out parameter names */
    getOutParameterNames() {
        return ([...this.values$.keys()]);
    }
    /** Execute the procedure */
    async execute() {
        let value = null;
        let name = null;
        let dates = [];
        let names = null;
        let unique = false;
        let retparam = null;
        if (this.returntype$ != null) {
            this.retparm$ = "retval";
            while (!unique) {
                unique = true;
                for (let i = 0; i < this.params$.length; i++) {
                    if (this.params$[i].name == this.retparm$) {
                        unique = false;
                        this.retparm$ += "0";
                    }
                }
            }
            retparam = new Parameter(this.retparm$, null, this.returntype$, ParameterType.out);
        }
        let sql = SQLRestBuilder.proc(this.name$, this.params$, retparam);
        this.response$ = await this.conn$.call(this.patch$, sql);
        if (!this.response$.success) {
            this.message$ = this.response$.message;
            return (false);
        }
        if (this.returntype$ != null)
            this.params$.unshift(retparam);
        names = Object.keys(this.response$);
        this.params$.forEach((param) => {
            let bn = param.name?.toLowerCase();
            let dt = DataType[param.dtype?.toLowerCase()];
            if (this.datetypes$.includes(dt))
                dates.push(bn);
        });
        for (let i = 1; i < names.length; i++) {
            name = names[i].toLowerCase();
            value = this.response$[names[i]];
            if (dates.includes(name))
                value = new Date(value);
            this.values$.set(name, value);
        }
        return (true);
    }
}
