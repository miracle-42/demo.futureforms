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
/**
 * Filters is a key component when communicating with a backend.
 * The Contains filter is meant for text-queries. Contains is not
 * part of standard SQL and should be extended when used on a database
 * datasource
 */
export class Contains {
    columns$ = [];
    bindval$ = null;
    datatype$ = null;
    constraint$ = null;
    bindvalues$ = null;
    constructor(columns) {
        this.columns$ = [];
        if (typeof columns === "string") {
            let list = [];
            columns.split(",").forEach((column) => {
                column = column.trim();
                if (column.length > 0)
                    list.push(column);
            });
            columns = list;
        }
        if (!Array.isArray(columns))
            columns = [columns];
        this.columns$ = columns;
        this.bindval$ = columns[0];
        for (let i = 1; i < columns.length; i++)
            this.bindval$ += "_" + columns[i];
    }
    clear() {
        this.constraint$ = null;
    }
    get column() {
        return (this.columns$[0]);
    }
    set column(column) {
        this.columns$ = [column];
    }
    get columns() {
        return (this.columns$);
    }
    set columns(columns) {
        this.columns$ = columns;
    }
    clone() {
        let clone = Reflect.construct(this.constructor, this.columns$);
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
    set constraint(values) {
        this.constraint$ = [];
        this.bindvalues$ = null;
        if (values == null)
            return;
        if (!Array.isArray(values))
            values = values.split(" ");
        for (let i = 0; i < values.length; i++) {
            if (values[i].length > 0)
                this.constraint$.push(values[i].trim().toLocaleLowerCase());
        }
    }
    getBindValue() {
        return (this.getBindValues()[0]);
    }
    getBindValues() {
        if (this.bindvalues$ == null) {
            let str = "";
            if (this.constraint$ != null) {
                for (let i = 0; i < this.constraint$.length; i++) {
                    str += this.constraint$[i];
                    if (i < this.constraint$.length - 1)
                        str += " ";
                }
            }
            this.bindvalues$ = [new BindValue(this.bindval$, str, this.datatype$)];
            if (this.datatype$)
                this.bindvalues$[0].forceDataType = true;
        }
        return (this.bindvalues$);
    }
    async evaluate(record) {
        let value = "";
        if (this.bindvalues$)
            this.constraint$ = this.bindvalues$[0].value;
        if (this.constraint$ == null)
            return (false);
        for (let c = 0; c < this.columns$.length; c++)
            value += " " + record.getValue(this.columns$[c]?.toLowerCase());
        value = value.toLocaleLowerCase();
        for (let c = 0; c < this.constraint$.length; c++)
            if (!value.includes(this.constraint$[c]))
                return (false);
        return (true);
    }
    asSQL() {
        return (this.columns$ + " contains " + this.constraint$);
    }
}
