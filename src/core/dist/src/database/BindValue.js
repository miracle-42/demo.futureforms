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
/**
 * Bind values is meant for use with datasources, espicially databases
 * where they act as a placeholder for a given value. Bind values can be
 * both as one-way in or two-way in/out.
 *
 * When used with OpenRestDB the data type is determined by the table column
 * it is bound to (initially same as name). However it is not always possible
 * to determine the datatype based on the datasource.
 *
 * In rare cases it is necessary to force or cast the data type to a different
 * type than the datasource's default data type.
 */
export class BindValue {
    value$ = null;
    name$ = null;
    type$ = null;
    out$ = false;
    column$ = null;
    force$ = false;
    /**
     *
     * @param name  : name
     * @param value : value
     * @param type  : type, if not automatically detected
     */
    constructor(name, value, type) {
        if (typeof type != "string")
            type = DataType[type];
        this.name = name;
        this.type = type;
        this.value = value;
        this.column = name;
    }
    /** Name of bind value */
    get name() {
        return (this.name$);
    }
    /** Name of bind value */
    set name(name) {
        this.name$ = name;
    }
    /** Column to bind to */
    get column() {
        return (this.column$);
    }
    /** Column to bind to */
    set column(column) {
        this.column$ = column;
    }
    /** Whether it is used as an out parameter */
    get outtype() {
        return (this.out$);
    }
    /** Whether it is used as an out parameter */
    set outtype(flag) {
        this.out$ = flag;
    }
    /** The datatype */
    get type() {
        if (this.type$ == null)
            return ("string");
        return (this.type$);
    }
    /** The datatype */
    set type(type) {
        if (typeof type != "string")
            type = DataType[type];
        this.type$ = type;
    }
    /** Whether to force/cast the type */
    get forceDataType() {
        return (this.force$);
    }
    /** Whether to force/cast the type */
    set forceDataType(flag) {
        this.force$ = flag;
    }
    /** The value */
    get value() {
        return (this.value$);
    }
    /** The value */
    set value(value) {
        this.value$ = value;
        if (this.type$ == null && typeof value === "number")
            this.type$ = "number";
        if (value instanceof Date)
            if (this.type$ == null)
                this.type$ = "date";
        if (this.type$ == null)
            this.type$ = "string";
    }
    toString() {
        return ("{" + this.name + " " + this.type + " " + this.value + "}");
    }
}
