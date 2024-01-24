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
import { Record, RecordState } from "../Record.js";
import { FilterStructure } from "../FilterStructure.js";
import { LockMode } from "../interfaces/DataSource.js";
export class MemoryTable {
    name;
    arrayfecth = 1;
    rowlocking = LockMode.None;
    queryallowed = true;
    insertallowed = true;
    updateallowed = true;
    deleteallowed = true;
    pos$ = 0;
    order$ = null;
    dirty$ = [];
    columns$ = [];
    records$ = [];
    sorting$ = [];
    limit$ = null;
    filter;
    /**
     * Datasource based on data in memory
     */
    /**
     * @param columns: columns in the table
     * @param records : number of records or actual data
     */
    constructor(columns, records) {
        if (columns == null)
            columns = [];
        if (records == null)
            records = [];
        this.name = this.constructor.name.toLowerCase();
        if (!Array.isArray(columns))
            columns = [columns];
        this.columns$ = columns;
        if (typeof records === "number") {
            let rows = records;
            records = [];
            if (columns != null && columns.length > 0) {
                for (let r = 0; r < rows; r++) {
                    let row = [];
                    for (let c = 0; c < columns.length; c++)
                        row.push(null);
                    records.push(row);
                }
            }
        }
        records.forEach((rec) => {
            let record = new Record(this, rec);
            this.records$.push(record);
        });
    }
    /** Clear all records */
    clear() {
        this.dirty$ = [];
        this.records$.forEach((rec) => { rec.refresh(); });
    }
    /** Memory source is not transactional */
    get transactional() {
        return (false);
    }
    /** Set table data */
    setData(data) {
        this.records$ = [];
        data.forEach((rec) => {
            let record = new Record(this, rec);
            this.records$.push(record);
        });
    }
    /** Clones the datasource */
    clone(columns) {
        let table = [];
        if (columns == null) {
            columns = [];
            columns.push(...this.columns$);
        }
        if (!Array.isArray(columns))
            columns = [columns];
        for (let r = 0; r < this.records$.length; r++) {
            let row = [];
            for (let c = 0; c < columns.length; c++)
                row[c] = this.records$[r].getValue(columns[c]);
            table.push(row);
        }
        let clone = new MemoryTable(columns, table);
        clone.sorting = this.sorting;
        clone.arrayfecth = this.arrayfecth;
        return (clone);
    }
    /** Sorting (works like order by) */
    get sorting() {
        return (this.order$);
    }
    /** Sorting (works like order by) */
    set sorting(order) {
        this.order$ = order;
        this.sorting$ = SortOrder.parse(order);
    }
    /** The columns used by this datasource */
    get columns() {
        return (this.columns$);
    }
    /** Add columns used by this datasource */
    addColumns(columns) {
        if (!Array.isArray(columns))
            columns = [columns];
        columns.forEach((column) => {
            column = column?.toLowerCase();
            if (column && !this.columns$.includes(column))
                this.columns$.push(column);
        });
        return (this);
    }
    /** Remove columns used by this datasource */
    removeColumns(columns) {
        if (!Array.isArray(columns))
            columns = [columns];
        let cols = [];
        for (let i = 0; i < columns.length; i++)
            columns[i] = columns[i]?.toLowerCase();
        for (let i = 0; i < this.columns$.length; i++) {
            if (!columns.includes(this.columns$[i]))
                cols.push(this.columns$[i]);
        }
        this.columns$ = cols;
        return (this);
    }
    /** Return the default filters */
    getFilters() {
        return (this.limit$);
    }
    /** Add a default filter */
    addFilter(filter) {
        if (this.limit$ == null) {
            if (filter instanceof FilterStructure) {
                this.limit$ = filter;
                return (this);
            }
            this.limit$ = new FilterStructure();
        }
        this.limit$.and(filter);
        return (this);
    }
    /** Not applicable for this type of datasource */
    async lock(_record) {
        return (true);
    }
    /** Undo changes */
    async undo() {
        let undo = [];
        for (let i = 0; i < this.dirty$.length; i++) {
            this.dirty$[i].refresh();
            undo.push(this.dirty$[i]);
            switch (this.dirty$[i].state) {
                case RecordState.New:
                case RecordState.Insert:
                    this.delete(this.dirty$[i]);
                    this.dirty$[i].state = RecordState.Delete;
                    break;
                case RecordState.Update:
                    this.dirty$[i].state = RecordState.Consistent;
                    break;
                case RecordState.Delete:
                    this.dirty$[i].state = RecordState.Consistent;
                    break;
            }
        }
        return (undo);
    }
    /** Flush changes to datasource */
    async flush() {
        let processed = [];
        this.dirty$.forEach((rec) => {
            if (rec.state == RecordState.Insert) {
                processed.push(rec);
                this.records$.push(rec);
                rec.response = { status: "inserted" };
            }
            if (rec.state == RecordState.Update) {
                processed.push(rec);
                rec.response = { status: "updated" };
            }
            if (rec.state == RecordState.Delete) {
                processed.push(rec);
                rec.response = { status: "deleted" };
                let recno = this.indexOf(this.records$, rec.id);
                if (recno >= 0) {
                    this.pos$--;
                    this.records$.splice(recno, 1);
                }
            }
        });
        this.dirty$ = [];
        return (processed);
    }
    /** Re-fetch the given record from memory */
    async refresh(record) {
        record.refresh();
        return (true);
    }
    /** Create a record for inserting a row in the table */
    async insert(record) {
        if (!this.dirty$.includes(record))
            this.dirty$.push(record);
        return (true);
    }
    /** Mark a record for updating a row in the table */
    async update(record) {
        if (!this.dirty$.includes(record))
            this.dirty$.push(record);
        return (true);
    }
    /** Mark a record for deleting a row in the table */
    async delete(record) {
        if (!this.dirty$.includes(record))
            this.dirty$.push(record);
        return (true);
    }
    /** Execute the query */
    async query(filter) {
        this.pos$ = 0;
        this.filter = filter;
        this.records$.forEach((rec) => { rec.prepared = false; });
        if (this.limit$ != null) {
            if (!this.filter)
                this.filter = this.limit$;
            else
                this.filter.and(this.limit$, "limit");
        }
        if (this.sorting$.length > 0) {
            this.records$ = this.records$.sort((r1, r2) => {
                for (let i = 0; i < this.sorting$.length; i++) {
                    let column = this.sorting$[i].column;
                    let ascending = this.sorting$[i].ascending;
                    let value1 = r1.getValue(column);
                    let value2 = r2.getValue(column);
                    if (value1 < value2)
                        return (ascending ? -1 : 1);
                    if (value1 > value2)
                        return (ascending ? 1 : -1);
                    return (0);
                }
            });
        }
        return (true);
    }
    /** Fetch a set of records */
    async fetch() {
        if (this.pos$ >= this.records$.length)
            return ([]);
        while (this.pos$ < this.records$.length) {
            let rec = this.records$[this.pos$++];
            if (rec == null)
                return ([]);
            if (this.filter.empty)
                return ([rec]);
            if (await this.filter.evaluate(rec))
                return ([rec]);
        }
        return ([]);
    }
    /** Cursers is not used with this datasource */
    async closeCursor() {
        return (true);
    }
    indexOf(records, oid) {
        for (let i = 0; i < records.length; i++) {
            if (records[i].id == oid)
                return (i);
        }
        return (-1);
    }
}
class SortOrder {
    column;
    ascending = true;
    static parse(order) {
        let sorting = [];
        if (order != null) {
            let parts = order.split(",");
            parts.forEach((column) => {
                column = column.trim();
                if (column.length > 0) {
                    let ascending = null;
                    if (column.includes(' ')) {
                        let tokens = column.split(' ');
                        column = tokens[0].trim();
                        ascending = tokens[1].trim();
                    }
                    column = column.toLowerCase();
                    ascending = ascending?.toLowerCase();
                    let part = new SortOrder();
                    part.column = column;
                    if (ascending == "desc")
                        part.ascending = false;
                    sorting.push(part);
                }
            });
        }
        return (sorting);
    }
}
