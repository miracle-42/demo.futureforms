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
 * The Like filter resembles the like operator in SQL.
 */
export class Like {
    column$ = null;
    bindval$ = null;
    ltrunc = false;
    rtrunc = false;
    parsed = false;
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
    setConstraint(value) {
        this.parsed = false;
        this.constraint = value;
        return (this);
    }
    get constraint() {
        let constr = this.constraint$;
        if (this.parsed) {
            if (this.ltrunc)
                constr = "%" + constr;
            if (this.rtrunc)
                constr = constr + "%";
        }
        return (constr);
    }
    set constraint(value) {
        this.parsed = false;
        this.bindvalues$ = null;
        this.constraint$ = value;
    }
    getBindValue() {
        return (this.getBindValues()[0]);
    }
    getBindValues() {
        if (this.bindvalues$ == null) {
            this.bindvalues$ = [new BindValue(this.bindval$, this.constraint$, this.datatype$)];
            if (this.datatype$)
                this.bindvalues$[0].forceDataType = true;
            this.bindvalues$[0].column = this.column$;
        }
        return (this.bindvalues$);
    }
    async evaluate(record) {
        if (this.bindvalues$)
            this.constraint$ = this.bindvalues$[0].value;
        if (this.column$ == null)
            return (false);
        if (this.constraint$ == null)
            return (false);
        if (!this.parsed) {
            this.parsed = true;
            if (this.constraint$?.endsWith("%"))
                this.rtrunc = true;
            if (this.constraint$?.startsWith("%"))
                this.ltrunc = true;
            if (this.ltrunc)
                this.constraint$ = this.constraint$.substring(1);
            if (this.rtrunc)
                this.constraint$ = this.constraint$.substring(0, this.constraint$.length - 1);
        }
        let value = record.getValue(this.column$.toLowerCase());
        if (value == null)
            return (false);
        value = value + "";
        if (this.rtrunc && this.ltrunc) {
            if (value.includes(this.constraint$))
                return (true);
            return (false);
        }
        if (this.rtrunc) {
            if (value.startsWith(this.constraint$))
                return (true);
            return (false);
        }
        if (this.ltrunc) {
            if (value.endsWith(this.constraint$))
                return (true);
            return (false);
        }
        return (value == this.constraint$);
    }
    asSQL() {
        if (!this.constraint$ && !this.bindvalues$)
            return ("1 = 2");
        if (this.bindval$ == null)
            this.bindval$ = this.column$;
        return (this.column$ + " like :" + this.bindval$);
    }
    toString() {
        return (this.column$ + " like " + this.constraint);
    }
}
