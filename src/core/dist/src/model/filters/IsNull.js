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
/**
 * Filters is a key component when communicating with a backend.
 * The IsNull filter resembles the 'is null' operator in SQL.
 */
export class IsNull {
    column$ = null;
    bindval$ = null;
    datatype$ = null;
    constraint$ = null;
    constructor(column) {
        this.column$ = column;
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
    setConstraint(value) {
        this.constraint = value;
        return (this);
    }
    get constraint() {
        return (this.constraint$);
    }
    set constraint(value) {
        this.constraint$ = value;
    }
    getBindValue() {
        return (null);
    }
    getBindValues() {
        return ([]);
    }
    async evaluate(record) {
        if (this.column$ == null)
            return (false);
        return (record.getValue(this.column$.toLowerCase()) == null);
    }
    asSQL() {
        let whcl = this.column$ + " is null";
        return (whcl);
    }
}
