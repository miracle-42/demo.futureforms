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
import { DataType } from "../../database/DataType.js";
import { BindValue } from "../../database/BindValue.js";
export class NoneOf {
    column$ = null;
    bindval$ = null;
    datatype$ = null;
    constraint$ = null;
    bindvalues$ = null;
    constructor(column) {
        this.column$ = column;
        this.bindval$ = column;
    }
    clear() {
        this.constraint$ = null;
    }
    get column() {
        return (this.column$);
    }
    set column(column) {
        this.column$ = column;
    }
    clone() {
        let clone = Reflect.construct(this.constructor, [this.column$]);
        clone.bindval$ = this.bindval$;
        clone.datatype$ = this.datatype$;
        return (clone.setConstraint(this.constraint$));
    }
    getDataType() {
        return (this.datatype$);
    }
    setDataType(type) {
        if (typeof type === "string")
            this.datatype$ = type;
        else
            this.datatype$ = DataType[type];
        return (this);
    }
    getBindValueName() {
        return (this.bindval$);
    }
    setBindValueName(name) {
        this.bindval$ = name;
        return (this);
    }
    setConstraint(values) {
        this.constraint = values;
        return (this);
    }
    get constraint() {
        return (this.constraint$);
    }
    set constraint(table) {
        this.constraint$ = null;
        this.bindvalues$ = null;
        if (table == null)
            return;
        // Single value
        if (!Array.isArray(table))
            table = [table];
        if (table.length == 0)
            return;
        this.constraint$ = table;
    }
    getBindValue() {
        return (this.getBindValues()[0]);
    }
    getBindValues() {
        if (this.bindvalues$ == null) {
            this.bindvalues$ = [];
            if (this.constraint$.length > 5)
                return ([]);
            for (let i = 0; i < this.constraint$.length; i++)
                this.bindvalues$.push(new BindValue(this.bindval$ + "_" + i, this.constraint$[i], this.datatype$));
            this.bindvalues$.forEach((b) => { b.column = this.column$; if (this.datatype$)
                b.forceDataType = true; });
        }
        return (this.bindvalues$);
    }
    async evaluate(record) {
        let value = null;
        if (this.bindvalues$) {
            this.constraint$ = [];
            this.bindvalues$.forEach((b) => this.constraint$.push(b.value));
        }
        if (this.column$ == null)
            return (false);
        if (this.constraint$ == null)
            return (false);
        if (this.constraint$.length == 0)
            return (false);
        let table = this.constraint$;
        value = record.getValue(this.column$);
        return (!table.includes(value));
    }
    asSQL() {
        if (!this.constraint$ && !this.bindvalues$)
            return ("1 == 2");
        let whcl = this.column$ + " not in (";
        if (this.constraint$.length > 5) {
            for (let i = 0; i < this.constraint$.length; i++) {
                whcl += this.quoted(this.constraint$[i]);
                if (i < this.constraint$.length - 1)
                    whcl += ",";
            }
        }
        else {
            for (let i = 0; i < this.constraint$.length; i++) {
                whcl += ":" + this.bindval$ + "_" + i;
                if (i < this.constraint$.length - 1)
                    whcl += ",";
            }
        }
        whcl += ")";
        return (whcl);
    }
    toString(lenght) {
        if (lenght == null)
            lenght = 30;
        if (this.constraint$ == null)
            return ("1 = 2");
        let whcl = this.column$ + " not in (";
        for (let i = 0; i < this.constraint$.length; i++) {
            whcl += this.quoted(this.constraint$[i]);
            if (i < this.constraint$.length - 1)
                whcl += ",";
            if (whcl.length > lenght - 4) {
                whcl += "...";
                break;
            }
        }
        whcl += ")";
        return (whcl);
    }
    quoted(value) {
        if (typeof value == "string")
            return ("'" + value + "'");
        if (value instanceof Date)
            return (value.getTime());
        return (value);
    }
}
