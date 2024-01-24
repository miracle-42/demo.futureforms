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
 *
 * The CustomFilter is a 'scaffolding' class only meant for extending
 * into a functional filter in an easy way.
 */
export class CustomFilter {
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
    set constraint(values) {
        this.constraint$ = values;
    }
    getBindValue() {
        if (this.bindvalues$ == null || this.bindvalues$.length == 0)
            return (null);
        return (this.getBindValues()[0]);
    }
    setBindValues(values) {
        this.bindvalues$ = values;
    }
    getBindValues() {
        if (this.bindvalues$ == null)
            this.bindvalues$ = [];
        return (this.bindvalues$);
    }
    async evaluate(record) {
        throw "Custom filters must overwrite 'evaluate' method";
    }
    asSQL() {
        throw "Custom filters must overwrite 'asSQL' method";
    }
    toString() {
        return ("Custom filter");
    }
}
