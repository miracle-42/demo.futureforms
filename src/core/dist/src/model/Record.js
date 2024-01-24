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
/**
 * The state of a record.
 *
 * Records goes through different states, depending on
 * the user actions, the datasource and the type of connection.
 *
 */
export var RecordState;
(function (RecordState) {
    RecordState[RecordState["New"] = 0] = "New";
    RecordState[RecordState["Insert"] = 1] = "Insert";
    RecordState[RecordState["Inserted"] = 2] = "Inserted";
    RecordState[RecordState["Delete"] = 3] = "Delete";
    RecordState[RecordState["Deleted"] = 4] = "Deleted";
    RecordState[RecordState["Update"] = 5] = "Update";
    RecordState[RecordState["Updated"] = 6] = "Updated";
    RecordState[RecordState["Consistent"] = 7] = "Consistent";
    RecordState[RecordState["QueryFilter"] = 8] = "QueryFilter";
})(RecordState || (RecordState = {}));
export class Record {
    id$;
    values$ = [];
    initial$ = [];
    response$ = null;
    failed$ = false;
    locked$ = false;
    flushing$ = false;
    source$ = null;
    prepared$ = false;
    initiated$ = false;
    wrapper$ = null;
    dirty$ = new Set();
    status$ = RecordState.Consistent;
    constructor(source, data) {
        this.source$ = source;
        this.id$ = new Object();
        if (data != null) {
            for (let i = 0; i < data.length; i++)
                this.values$.push(data[i]);
        }
    }
    get id() {
        return (this.id$);
    }
    get block() {
        return (this.wrapper$?.block);
    }
    get initiated() {
        return (this.initiated$);
    }
    set initiated(flag) {
        this.initiated$ = flag;
    }
    get deleted() {
        switch (this.state) {
            case RecordState.Delete:
            case RecordState.Deleted:
                return (true);
        }
        return (false);
    }
    get updated() {
        switch (this.state) {
            case RecordState.Update:
            case RecordState.Updated:
                return (true);
        }
        return (false);
    }
    get inserted() {
        switch (this.state) {
            case RecordState.New:
            case RecordState.Insert:
            case RecordState.Inserted:
                return (true);
        }
        return (false);
    }
    clear() {
        this.values$ = [];
        this.initial$ = [];
        this.dirty$.clear();
        this.locked$ = false;
    }
    setClean(release) {
        this.initial$ = [];
        this.dirty$.clear();
        if (release)
            this.locked$ = false;
        this.initial$.push(...this.values$);
    }
    cleanup() {
        this.dirty$.clear();
    }
    get source() {
        return (this.source$);
    }
    get response() {
        return (this.response$);
    }
    set response(response) {
        this.response$ = response;
    }
    get wrapper() {
        return (this.wrapper$);
    }
    set wrapper(wrapper) {
        this.wrapper$ = wrapper;
    }
    get locked() {
        return (this.locked$);
    }
    set locked(flag) {
        this.locked$ = flag;
    }
    get failed() {
        return (this.failed$);
    }
    set failed(flag) {
        this.failed$ = flag;
    }
    get prepared() {
        return (this.prepared$);
    }
    set prepared(flag) {
        this.prepared$ = flag;
    }
    get synched() {
        return (this.state == RecordState.Consistent);
    }
    get flushing() {
        return (this.flushing$);
    }
    set flushing(flag) {
        this.flushing$ = flag;
    }
    get values() {
        let values = [];
        for (let i = 0; i < this.values$.length; i++)
            values.push({ name: this.column(i), value: this.values$[i] });
        return (values);
    }
    get state() {
        return (this.status$);
    }
    set state(status) {
        if (!this.wrapper?.transactional) {
            switch (status) {
                case RecordState.Deleted:
                    status = RecordState.Consistent;
                    break;
                case RecordState.Updated:
                    status = RecordState.Consistent;
                    break;
                case RecordState.Inserted:
                    status = RecordState.Consistent;
                    break;
            }
        }
        this.status$ = status;
    }
    get dirty() {
        return (this.dirty$.size > 0);
    }
    get clean() {
        return (this.dirty$.size == 0);
    }
    refresh() {
        let value = null;
        let values = [];
        this.source.columns?.forEach((col) => {
            value = this.getInitialValue(col);
            values.push({ column: col, value: value });
        });
        this.clear();
        values.forEach((entry) => { this.initialize(entry.column, entry.value); });
    }
    getValue(column) {
        if (column == null)
            return (null);
        column = column.toLowerCase();
        let idx = this.indexOf(column);
        return (this.values$[idx]);
    }
    getInitialValue(column) {
        if (column == null)
            return (null);
        column = column.toLowerCase();
        let idx = this.indexOf(column);
        return (this.initial$[idx]);
    }
    setValue(column, value) {
        if (column == null)
            return;
        column = column.toLowerCase();
        let idx = this.indexOf(column);
        let update = false;
        if (value != this.values$[idx])
            update = true;
        if (value instanceof Date || this.values$[idx] instanceof Date) {
            let nv = value;
            if (nv instanceof Date)
                nv = nv.getTime();
            let ov = value;
            if (ov instanceof Date)
                ov = ov.getTime();
            if (nv == ov)
                update = false;
        }
        if (idx < this.source.columns.length) {
            if (update && !this.flushing)
                this.dirty$.add(column);
            if (value == this.initial$[idx])
                this.dirty$.delete(column);
        }
        this.values$[idx] = value;
    }
    getDirty() {
        return ([...this.dirty$]);
    }
    setDirty(column) {
        if (column == null)
            column = this.columns[0];
        column = column?.toLowerCase();
        let idx = this.indexOf(column);
        if (idx < this.source.columns.length)
            this.dirty$.add(column);
    }
    get columns() {
        let columns = [];
        if (this.source)
            columns.push(...this.source.columns);
        if (this.wrapper)
            columns.push(...this.wrapper.columns);
        return (columns);
    }
    indexOf(column) {
        let cols = this.source.columns.length;
        let idx = this.source.columns.indexOf(column);
        if (cols == null) {
            idx = -1;
            cols = 0;
        }
        if (idx < 0 && this.wrapper)
            idx = cols + this.wrapper.indexOf(column);
        return (idx);
    }
    column(pos) {
        let len = this.source.columns.length;
        if (pos < len)
            return (this.source.columns[pos]);
        else
            return (this.wrapper?.columns[pos - len]);
    }
    toString() {
        let str = "";
        let cols = 0;
        if (this.source)
            cols += this.source.columns.length;
        if (this.wrapper)
            cols += this.wrapper?.columns.length;
        for (let i = 0; i < cols; i++)
            str += ", " + this.column(i) + "=" + this.getValue(this.column(i));
        return (RecordState[this.state] + " " + str.substring(2));
    }
    initialize(column, value) {
        if (column == null)
            return;
        column = column.toLowerCase();
        let idx = this.indexOf(column);
        this.values$[idx] = value;
        this.initial$[idx] = value;
    }
}
