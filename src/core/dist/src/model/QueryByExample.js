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
import { Filters } from "./filters/Filters.js";
import { RecordState } from "./Record.js";
import { DataType } from "../view/fields/DataType.js";
import { FilterStructure } from "./FilterStructure.js";
import { MemoryTable } from "./datasources/MemoryTable.js";
import { DataSourceWrapper } from "./DataSourceWrapper.js";
export class QueryByExample {
    block$ = null;
    record$ = null;
    qmode$ = false;
    table$ = null;
    wrapper$ = null;
    filter$ = new FilterStructure();
    lastqry$ = new Map();
    constructor(block) {
        this.block$ = block;
        this.table$ = new MemoryTable();
        this.wrapper$ = new DataSourceWrapper();
        this.table$.name = "qbe";
        this.wrapper$.block = block;
        this.wrapper$.source = this.table$;
        this.record$ = this.wrapper$.create(0);
        this.record$.state = RecordState.QueryFilter;
    }
    get querymode() {
        return (this.qmode$);
    }
    set querymode(flag) {
        this.qmode$ = flag;
    }
    clear() {
        this.qmode$ = false;
        this.lastqry$.clear();
        this.record$.values.forEach((column) => {
            let qf = new QueryFilter(column.value, this.filter$.get(column.name));
            this.lastqry$.set(column.name, qf);
        });
        this.filter$.clear();
        this.record$?.clear();
    }
    showLastQuery() {
        this.lastqry$.forEach((qf, column) => {
            this.record$.setValue(column, qf.value);
            if (qf.filter)
                this.filter$.and(qf.filter, column);
        });
    }
    get record() {
        return (this.record$);
    }
    get wrapper() {
        return (this.wrapper$);
    }
    get filters() {
        return (this.filter$);
    }
    setFilter(column, filter) {
        if (filter == null)
            filter = this.getDefaultFilter(column);
        if (filter == null)
            this.filter$.delete(column);
        else
            this.filter$.and(filter, column);
    }
    getDefaultFilter(column) {
        let fr = null;
        let to = null;
        let filter = null;
        let value = this.record$.getValue(column);
        if (value == null)
            return (null);
        let type = this.block$.view.fieldinfo.get(column)?.type;
        if (type == null) {
            type = DataType.string;
            if (value instanceof Date) {
                type = DataType.date;
            }
            else if (typeof value === "number") {
                type = DataType.decimal;
                if (Number.isInteger(value))
                    type = DataType.integer;
            }
        }
        if (type == DataType.date || type == DataType.datetime) {
            fr = value;
            to = new Date(fr.getTime());
            fr.setHours(0, 0, 0, 0);
            to.setHours(23, 59, 59, 999);
        }
        switch (type) {
            case DataType.string:
                filter = Filters.Like(column);
                break;
            case DataType.integer:
                filter = Filters.Equals(column);
                break;
            case DataType.decimal:
                filter = Filters.Equals(column);
                break;
            case DataType.date:
                filter = Filters.Between(column, true);
                break;
            case DataType.datetime:
                filter = Filters.Between(column, true);
                break;
        }
        if (type != DataType.date && type != DataType.datetime)
            filter.constraint = value;
        if (type == DataType.date || type == DataType.datetime)
            filter.constraint = [fr, to];
        return (filter);
    }
}
class QueryFilter {
    value;
    filter;
    constructor(value, filter) {
        this.value = value;
        this.filter = filter;
    }
}
