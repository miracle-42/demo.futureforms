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
export class SubQuery {
    bindval$ = null;
    subquery$ = null;
    datatype$ = null;
    columns$ = null;
    constraint$ = null;
    bindvalues$ = [];
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
            this.bindval$ += "." + columns[i];
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
    get subquery() {
        return (this.subquery$);
    }
    set subquery(sql) {
        this.subquery$ = sql;
    }
    clone() {
        let clone = new SubQuery(this.columns$);
        clone.subquery$ = this.subquery$;
        clone.datatype$ = this.datatype$;
        clone.bindvalues$ = this.bindvalues$;
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
    clear() {
        this.constraint$ = null;
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
        this.constraint$ = table;
    }
    getBindValue() {
        if (this.bindvalues$)
            return (this.getBindValues()[0]);
        return (null);
    }
    getBindValues() {
        return (this.bindvalues$);
    }
    setBindValues(bindvalues) {
        if (!Array.isArray(bindvalues))
            bindvalues = [bindvalues];
        this.bindvalues$ = bindvalues;
    }
    async evaluate(record) {
        let values = [];
        if (this.columns$ == null)
            return (false);
        if (this.constraint$ == null)
            return (false);
        if (this.constraint$.length == 0)
            return (false);
        let table = this.constraint$;
        this.columns$.forEach((column) => { values.push(record.getValue(column)); });
        let match = false;
        for (let r = 0; r < table.length; r++) {
            match = true;
            let row = table[r];
            for (let c = 0; c < values.length; c++) {
                if (values[c] != row[c]) {
                    match = false;
                    break;
                }
            }
            if (match)
                break;
        }
        return (match);
    }
    asSQL() {
        if (this.subquery$ == null)
            return ("subquery " + this.constraint$);
        return (this.subquery$);
    }
    toString() {
        return (this.asSQL());
    }
}
