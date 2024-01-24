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
import { MSGGRP } from "../messages/Internal.js";
import { SubQuery } from "./filters/SubQuery.js";
import { RecordState } from "./Record.js";
import { Messages } from "../messages/Messages.js";
import { SQLSource } from "../database/SQLSource.js";
import { QueryByExample } from "./QueryByExample.js";
import { FilterStructure } from "./FilterStructure.js";
import { MemoryTable } from "./datasources/MemoryTable.js";
import { EventType } from "../control/events/EventType.js";
import { QueryManager } from "./relations/QueryManager.js";
import { FormBacking } from "../application/FormBacking.js";
import { Block as InterfaceBlock } from '../public/Block.js';
import { DatabaseTable } from "../database/DatabaseTable.js";
import { FlightRecorder } from "../application/FlightRecorder.js";
import { FormEvents, FormEvent } from "../control/events/FormEvents.js";
export class Block {
    form$ = null;
    name$ = null;
    record$ = -1;
    view$ = null;
    queried$ = false;
    ctrlblk$ = false;
    source$ = null;
    pubfrm$ = null;
    pubblk$ = null;
    qbe = new QueryByExample(this);
    filter = new FilterStructure();
    constructor(form, name) {
        this.name$ = name;
        this.form$ = form;
        this.form.addBlock(this);
        this.pubfrm$ = form.parent;
        this.filter.name = this.name;
        this.filter.and(this.qbe.filters, "qbe");
        this.filter.and(new FilterStructure(), "masters");
        this.filter.and(new FilterStructure(), "details");
        this.datasource = form.datamodel.getDataSource(this.name);
    }
    get name() {
        return (this.name$);
    }
    get form() {
        return (this.form$);
    }
    get pubblk() {
        return (this.pubblk$);
    }
    get empty() {
        return (this.record$ < 0);
    }
    get view() {
        return (this.view$);
    }
    get ctrlblk() {
        return (this.ctrlblk$);
    }
    get queried() {
        return (this.queried$);
    }
    set queried(flag) {
        this.queried$ = flag;
    }
    get qberec() {
        return (this.qbe.record);
    }
    get querymode() {
        return (this.qbe.querymode);
    }
    set querymode(flag) {
        this.qbe.querymode = flag;
    }
    set ctrlblk(flag) {
        this.ctrlblk$ = flag;
    }
    get qbeallowed() {
        return (this.pubblk$.qbeallowed);
    }
    get queryallowed() {
        if (!this.source$.queryallowed)
            return (false);
        else
            return (this.pubblk$.queryallowed);
    }
    get insertallowed() {
        if (!this.source$.insertallowed)
            return (false);
        return (this.pubblk$.insertallowed);
    }
    get updateallowed() {
        if (!this.source$.updateallowed)
            return (false);
        return (this.pubblk$.updateallowed);
    }
    get deleteallowed() {
        if (!this.source$.deleteallowed)
            return (false);
        return (this.pubblk$.deleteallowed);
    }
    set dirty(flag) {
        this.wrapper.dirty = flag;
    }
    get dirty() {
        return (this.wrapper?.dirty);
    }
    async clear(flush) {
        this.queried = false;
        if (this.ctrlblk) {
            for (let i = 0; i < this.wrapper.getRecords(); i++)
                this.wrapper.getRecord(i).clear();
        }
        else {
            if (!await this.wrapper.clear(flush))
                return (false);
        }
        this.form.clearBlock(this);
        return (true);
    }
    hasEventTransaction() {
        return (this.form.hasEventTransaction(this));
    }
    async checkEventTransaction(event) {
        return (this.form.checkEventTransaction(event, this));
    }
    async setEventTransaction(event, record) {
        return (this.form.setEventTransaction(event, this, record));
    }
    endEventTransaction(event, success) {
        this.form.endEventTransaction(event, this, success);
    }
    get datasource() {
        return (this.source$);
    }
    set datasource(source) {
        if (this.source$ != null) {
            this.form$.datamodel.clear(this, true);
            this.form$.datamodel.setWrapper(this);
            this.view.clear(true, true, true);
        }
        this.source$ = source;
        this.ctrlblk = (source == null);
        if (this.source$)
            this.source$.name = this.name;
        this.addColumns();
    }
    reset(source) {
        if (source) {
            this.source$ = null;
            this.ctrlblk = true;
        }
        this.view.reset();
    }
    addColumns(fields) {
        if (this.view == null)
            return;
        if (this.source$ == null)
            return;
        if (fields == null)
            fields = [];
        this.view.fieldinfo.forEach((info, field) => { if (!info.derived)
            fields.push(field); });
        if (fields.length > 0)
            this.source$.addColumns(fields);
    }
    createMemorySource(recs, columns) {
        let data = [];
        if (recs == null) {
            recs = this.view$.rows;
            columns = this.view$.getFieldNames();
        }
        for (let r = 0; r < recs; r++) {
            let row = [];
            for (let c = 0; c < columns.length; c++)
                row.push(null);
            data.push(row);
        }
        return (new MemoryTable(columns, data));
    }
    get wrapper() {
        if (this.querymode)
            return (this.qbe.wrapper);
        return (this.form.datamodel.getWrapper(this));
    }
    async preInsert(record) {
        if (this.ctrlblk)
            return (true);
        if (!await this.setEventTransaction(EventType.PreInsert, record))
            return (false);
        let success = await this.fire(EventType.PreInsert);
        this.endEventTransaction(EventType.PreInsert, success);
        return (success);
    }
    async postInsert(record) {
        if (this.ctrlblk)
            return (true);
        if (!await this.setEventTransaction(EventType.PostInsert, record))
            return (false);
        let success = await this.fire(EventType.PostInsert);
        this.endEventTransaction(EventType.PostInsert, success);
        return (success);
    }
    async preUpdate(record) {
        if (this.ctrlblk)
            return (true);
        if (!await this.setEventTransaction(EventType.PreUpdate, record))
            return (false);
        let success = await this.fire(EventType.PreUpdate);
        this.endEventTransaction(EventType.PreUpdate, success);
        return (success);
    }
    async postUpdate(record) {
        if (this.ctrlblk)
            return (true);
        if (!await this.setEventTransaction(EventType.PostUpdate, record))
            return (false);
        let success = await this.fire(EventType.PostUpdate);
        this.endEventTransaction(EventType.PostUpdate, success);
        return (success);
    }
    async preDelete(record) {
        if (this.ctrlblk)
            return (true);
        if (record.state == RecordState.New)
            return (true);
        if (!await this.setEventTransaction(EventType.PreDelete, record))
            return (false);
        let success = await this.fire(EventType.PreDelete);
        this.endEventTransaction(EventType.PreDelete, success);
        return (success);
    }
    async postDelete(record) {
        if (this.ctrlblk)
            return (true);
        if (!await this.setEventTransaction(EventType.PostDelete, record))
            return (false);
        let success = await this.fire(EventType.PostDelete);
        this.endEventTransaction(EventType.PostDelete, success);
        return (success);
    }
    async preQuery() {
        if (this.ctrlblk)
            return (true);
        if (!await this.setEventTransaction(EventType.PreQuery, this.qberec))
            return (false);
        let success = await this.fire(EventType.PreQuery);
        this.endEventTransaction(EventType.PreQuery, success);
        return (success);
    }
    async onFetch(record) {
        if (this.ctrlblk)
            return (true);
        if (!await this.setEventTransaction(EventType.OnFetch, record))
            return (false);
        let success = await this.fire(EventType.OnFetch);
        this.endEventTransaction(EventType.OnFetch, success);
        return (success);
    }
    async postQuery() {
        if (this.ctrlblk)
            return (true);
        if (!await this.checkEventTransaction(EventType.PostQuery))
            return (false);
        let success = await this.fire(EventType.PostQuery);
        return (success);
    }
    async validateField(record, field) {
        if (record == null)
            return (true);
        if (!await this.view.validateDate(field, record.getValue(field)))
            return (false);
        if (!await this.setEventTransaction(EventType.WhenValidateField, record))
            return (false);
        let success = await this.fire(EventType.WhenValidateField, field);
        this.endEventTransaction(EventType.WhenValidateField, success);
        if (success) {
            if (this.querymode)
                this.setFilter(field);
            else
                success = await this.form.queryFieldDetails(this.name, field);
        }
        if (success)
            success = await this.fire(EventType.PostChange, field);
        return (success);
    }
    async validateRecord() {
        let record = this.getRecord();
        let row = this.view.displayed(record);
        if (!record || !row)
            return (true);
        if (row.validated)
            return (true);
        if (!await this.setEventTransaction(EventType.WhenValidateRecord, record))
            return (false);
        let success = await this.fire(EventType.WhenValidateRecord);
        this.endEventTransaction(EventType.WhenValidateRecord, success);
        if (success)
            success = await this.wrapper.modified(record, false);
        if (success)
            row.validated = true;
        return (success);
    }
    rewind() {
        this.record = -1;
    }
    move(delta) {
        this.record = this.record + delta;
        return (this.record$);
    }
    get record() {
        if (this.record$ < 0)
            return (0);
        else
            return (this.record$);
    }
    set record(record) {
        this.record$ = record;
    }
    get interface() {
        return (this.pubblk$);
    }
    getValue(field) {
        return (this.wrapper.getValue(this.record, field));
    }
    setValue(field, value) {
        return (this.wrapper.setValue(this.record, field, value));
    }
    locked(record) {
        if (this.querymode)
            return (true);
        if (record == null)
            record = this.getRecord(0);
        return (this.wrapper.locked(record));
    }
    async lock(record) {
        if (this.querymode)
            return (true);
        if (record == null)
            record = this.getRecord(0);
        return (this.wrapper.lock(record, false));
    }
    async refresh(offset, reset) {
        if (this.querymode)
            return;
        let record = this.getRecord(offset);
        this.view.setRecordProperties(record);
        await this.wrapper.refresh(record);
        if (reset)
            record.failed = false;
        this.view.refresh(record);
    }
    async insert(before) {
        if (before == null)
            before = false;
        if (this.querymode)
            return (false);
        if (!this.view.hasInsertableFields()) {
            Messages.warn(MSGGRP.BLOCK, 1, this.name); // No insertable fields
            return (false);
        }
        if (!await this.view.validate())
            return (false);
        if (!this.checkEventTransaction(EventType.PreInsert))
            return (false);
        let record = this.wrapper.create(this.record, before);
        if (!record)
            return (false);
        if (!await this.form.view.onCreateRecord(this.view, record)) {
            await this.wrapper.delete(record);
            return (false);
        }
        if (record != null) {
            let offset = 0;
            let noex = this.view.empty();
            let inst = this.view.form.current;
            let init = inst?.field.block.model == this;
            let last = this.view.row == this.view.rows - 1;
            if (noex) {
                before = true;
                this.view.openrow();
            }
            else {
                if (last && !before)
                    offset = 1;
                if (init && !await this.form.view.leaveField(null, offset)) {
                    await this.wrapper.delete(record);
                    return (false);
                }
                if (init && !await this.form.view.leaveRecord(this.view, offset)) {
                    await this.wrapper.delete(record);
                    return (false);
                }
            }
            this.scroll(offset, this.view.row);
            await this.view.refresh(record);
            inst = this.view.findFirstEditable(record);
            if (inst == null) {
                // Cannot navigate to record
                await this.wrapper.delete(record);
                Messages.warn(MSGGRP.BLOCK, 2, this.name);
                return (false);
            }
            let details = this.getAllDetailBlocks(true);
            for (let i = 0; i < details.length; i++) {
                if (details[i] != this)
                    await details[i].clear(true);
            }
            this.view.current = inst;
            this.view.form.blur(true);
            if (!before && !last) {
                this.move(1);
                this.view.move(1);
            }
            if (!await this.form.view.enterRecord(this.view, 0)) {
                await this.wrapper.delete(record);
                return (false);
            }
            if (!await this.form.view.enterField(inst, 0, true)) {
                await this.wrapper.delete(record);
                return (false);
            }
            if (!await this.form.view.onRecord(this.view)) {
                await this.wrapper.delete(record);
                return (false);
            }
            inst.focus(true);
            this.dirty = true;
            this.view.refresh(record);
            this.view.getRow(inst.row).activateIndicators(true);
            return (true);
        }
        return (false);
    }
    async delete() {
        if (this.querymode)
            return (false);
        if (this.getRecord().state != RecordState.New && this.getRecord().state != RecordState.Insert) {
            if (!this.source$.deleteallowed)
                return (false);
            if (!this.checkEventTransaction(EventType.PreDelete))
                return (false);
        }
        let inst = this.view.form.current;
        let empty = false;
        let offset = this.view.rows - this.view.row - 1;
        let success = await this.wrapper.modified(this.getRecord(), true);
        if (success) {
            this.view.skip();
            await this.prefetch(1, offset - 1);
            empty = this.wrapper.getRecords() <= this.record;
            if (empty) {
                this.move(-1);
                this.view.move(-1);
            }
            this.scroll(0, this.view.row);
            await this.view.refresh(this.getRecord());
            if (!empty)
                this.view.current = inst;
            else
                inst = this.view.getPreviousInstance(inst);
            this.view.getRow(this.view.row).validated = true;
            inst?.focus(true);
            this.view.getRow(inst.row).activateIndicators(true);
            if (this.getRecord() != null) {
                if (!await this.form.view.enterRecord(this.view, 0)) {
                    inst?.blur();
                    return (false);
                }
                if (!await this.form.view.enterField(inst, 0, true)) {
                    inst?.blur();
                    return (false);
                }
                if (!await this.form.view.onRecord(this.view)) {
                    inst?.blur();
                    return (false);
                }
            }
        }
        else {
            await this.view.refresh(this.getRecord());
        }
        return (true);
    }
    getDirtyCount() {
        return (this.wrapper.getDirtyCount());
    }
    getPendingCount() {
        return (this.wrapper.getPendingCount());
    }
    async undo(requery) {
        if (this.ctrlblk)
            return (true);
        if (this.qbe.querymode) {
            this.form.cancelQueryMode(this);
            return (true);
        }
        let undo = await this.wrapper?.undo();
        if (requery) {
            for (let i = 0; i < undo.length; i++)
                this.view.refresh(undo[i]);
        }
        this.view.validated = true;
        return (true);
    }
    async flush() {
        if (this.ctrlblk)
            return (true);
        if (this.qbe.querymode)
            return (true);
        let succces = await this.validateRecord();
        if (succces)
            return (this.wrapper?.flush());
        return (false);
    }
    setFilter(field, filter) {
        let qryfld = this.view.fieldinfo.get(field)?.query;
        if (qryfld == null)
            qryfld = this.source$?.columns.includes(field);
        if (qryfld)
            this.qbe.setFilter(field, filter);
    }
    cancel() {
        this.qbe.querymode = false;
    }
    async enterQuery() {
        this.queried$ = false;
        this.view.current = null;
        if (!await this.wrapper.clear(true))
            return (false);
        this.record = 0;
        this.qbe.clear();
        this.qbe.querymode = true;
        this.view.clear(true, true);
        this.view.display(0, this.qberec);
        this.view.lockUnused();
        this.view.setCurrentRow(0, true);
        return (true);
    }
    async executeQuery(qryid) {
        this.queried = true;
        let runid = null;
        this.view.current = null;
        if (!this.setMasterDependencies()) {
            this.form.clearBlock(this);
            return (false);
        }
        if (qryid == null)
            qryid = this.form.QueryManager.startNewChain();
        // Abort query if obsolete
        if (qryid != this.form.QueryManager.getQueryID())
            return (true);
        let waits = 0;
        // Wait for stale query to finish displaying rows
        runid = this.form.QueryManager.getRunning(this);
        while (runid) {
            waits++;
            await QueryManager.sleep(10);
            // Abort query if obsolete
            if (qryid != this.form.QueryManager.getQueryID()) {
                //console.log("Stale query for '"+this.name+"' aborted");
                return (true);
            }
            runid = this.form.QueryManager.getRunning(this);
            if (runid && waits > 1000) {
                waits = 0; // Waiting on previous query
                Messages.warn(MSGGRP.BLOCK, 3, this.name);
            }
        }
        this.form.QueryManager.setRunning(this, qryid);
        this.view.clear(true, true);
        this.qbe.querymode = false;
        let wrapper = this.wrapper;
        FlightRecorder.debug("@model.block: execute query " + this.name + " filter: " + this.filter.toString());
        this.record = -1;
        let record = null;
        if (!await wrapper.query(this.filter)) {
            this.form.QueryManager.setRunning(this, null);
            return (false);
        }
        while (!this.view.empty(0)) {
            // Datasource is lacking
            Messages.severe(MSGGRP.BLOCK, 4, this.name);
            return (false);
        }
        let found = false;
        for (let i = 0; i < this.view.rows; i++) {
            record = await wrapper.fetch();
            if (record == null)
                break;
            found = true;
            this.record = 0;
            this.view.display(i, record);
        }
        if (found) {
            await this.view$.setCurrentRow(0, false);
        }
        else {
            let blocks = this.getAllDetailBlocks(true);
            blocks.forEach((det) => { det.view.clear(true, true, true); });
        }
        this.form.QueryManager.setRunning(this, null);
        this.view.lockUnused();
        return (true);
    }
    showLastQuery() {
        if (this.querymode) {
            this.qbe.showLastQuery();
            this.view.clear(true, true);
            this.view.display(0, this.qberec);
            this.view$.setCurrentRow(0, false);
        }
    }
    scroll(records, offset) {
        if (this.querymode)
            return (0);
        let displayed = 0;
        this.view.clear(false, false);
        let wrapper = this.wrapper;
        let pos = this.record + records - offset;
        if (pos < 0) {
            pos = 0;
            records = offset - this.record;
        }
        for (let i = 0; i < this.view.rows; i++) {
            let rec = wrapper.getRecord(pos++);
            if (rec == null)
                break;
            displayed++;
            this.view$.display(i, rec);
        }
        if (offset >= displayed)
            records = records - offset + displayed - 1;
        this.move(records);
        this.view.lockUnused();
        return (records);
    }
    getQueryMaster() {
        return (this.form.QueryManager.qmaster$);
    }
    get QueryFilter() {
        return (this.qbe.filters);
    }
    get MasterFilter() {
        return (this.filter.getFilterStructure("masters"));
    }
    get DetailFilter() {
        return (this.filter.getFilterStructure("details"));
    }
    getDetailBlockFilter(block, create) {
        let flt = this.DetailFilter.getFilterStructure(block.name);
        if (flt == null && create) {
            flt = new FilterStructure();
            this.DetailFilter.and(flt, block.name);
        }
        return (flt);
    }
    getMasterBlockFilter(block, create) {
        let flt = this.MasterFilter.getFilterStructure(block.name);
        if (flt == null && create) {
            flt = new FilterStructure();
            this.MasterFilter.and(flt, block.name);
        }
        return (flt);
    }
    getMasterBlock(link) {
        return (this.form.BlockCoordinator.getMasterBlock(link));
    }
    getMasterBlocks() {
        if (!this.form)
            return ([]);
        return (this.form.BlockCoordinator.getMasterBlocks(this));
    }
    getMasterLinks() {
        return (this.form.BlockCoordinator.getMasterLinks(this));
    }
    getDetailBlock(link) {
        return (this.form.BlockCoordinator.getDetailBlock(link));
    }
    getDetailBlocks(all) {
        return (this.form.BlockCoordinator.getDetailBlocks(this, all));
    }
    findMasterRelation(master) {
        return (this.form.BlockCoordinator.findRelation(master, this));
    }
    getDetailLinks() {
        return (this.form.BlockCoordinator.getDetailLinks(this));
    }
    getAllDetailBlocks(all) {
        let blocks = [];
        let details = this.getDetailBlocks(all);
        details?.forEach((blk) => { blocks.push(...blk.getAllDetailBlocks(all)); });
        blocks.push(this);
        return (blocks);
    }
    setMasterDependencies() {
        this.MasterFilter.clear();
        let rels = this.getMasterLinks();
        for (let i = 0; i < rels.length; i++) {
            let link = rels[i];
            let master = this.getMasterBlock(link);
            if (master.empty)
                return (false);
            if (master.getRecord().state == RecordState.Delete)
                return (false);
            for (let i = 0; i < link.master.fields.length; i++) {
                let mfld = link.master.fields[i];
                let dfld = link.detail.fields[i];
                let value = master.getValue(mfld);
                if (value != null) {
                    let flt = Filters.Equals(dfld);
                    flt.constraint = master.getValue(mfld);
                    this.getMasterBlockFilter(master, true).and(flt, dfld);
                }
                else {
                    let flt = Filters.IsNull(dfld);
                    flt.constraint = master.getValue(mfld);
                    this.getMasterBlockFilter(master, true).and(flt, dfld);
                }
            }
        }
        return (true);
    }
    async setDetailDependencies() {
        let blocks = this.getDetailBlocks(false);
        for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].QueryFilter.empty && blocks[i].DetailFilter.empty)
                return (true);
            let rel = blocks[i].findMasterRelation(this);
            if (await this.asSubQuery(this, blocks[i], rel))
                continue;
            let src = blocks[i].datasource.clone();
            if (src instanceof DatabaseTable)
                src.columns = rel.detail.fields;
            src.name = blocks[i].name + ".subquery";
            let details = new FilterStructure();
            let filters = new FilterStructure();
            filters.and(details, "details");
            filters.and(blocks[i].QueryFilter, "qbe");
            details.and(blocks[i].DetailFilter, "subquery");
            let filter = Filters.SubQuery(rel.master.fields);
            this.getDetailBlockFilter(blocks[i], true).and(filter, blocks[i].name);
            if (!await src.query(filters))
                return (false);
            let values = [];
            while (true) {
                let recs = await src.fetch();
                if (recs == null || recs.length == 0)
                    break;
                recs.forEach((rec) => {
                    let row = [];
                    rel.detail.fields.forEach((col) => row.push(rec.getValue(col)));
                    values.push(row);
                });
            }
            filter.constraint = values;
        }
        return (true);
    }
    getQueryID() {
        return (this.form.QueryManager.getQueryID());
    }
    startNewQueryChain() {
        return (this.form.QueryManager.startNewChain());
    }
    async queryDetails(newqry) {
        if (this.querymode)
            return (true);
        if (this.view.empty())
            return (true);
        if (!this.form.finalized)
            return (true);
        let success = true;
        let qryid = this.getQueryID();
        if (newqry)
            qryid = this.startNewQueryChain();
        let blocks = this.getDetailBlocks(true);
        for (let i = 0; i < blocks.length; i++) {
            if (!await blocks[i].executeQuery(qryid))
                success = false;
        }
        return (success);
    }
    async prefetch(records, offset) {
        return (this.wrapper.prefetch(this.record + offset, records));
    }
    getRecord(offset) {
        if (offset == null)
            offset = 0;
        if (this.querymode)
            return (this.qberec);
        return (this.wrapper.getRecord(this.record + offset));
    }
    async copy(header, all) {
        return (this.wrapper?.copy(all, header));
    }
    finalize() {
        this.pubblk$ = this.form.parent.getBlock(this.name);
        this.view$ = FormBacking.getViewForm(this.form$.parent).getBlock(this.name);
        if (this.view$ == null) {
            this.view$ = FormBacking.getViewBlock(this, true);
            this.view.finalize();
        }
        if (this.pubblk$ == null) {
            this.pubblk$ = new InterfaceBlock(this.pubfrm$, this.name);
            FormBacking.getBacking(this.form.parent).setAutoGenerated(this.pubblk$);
        }
        if (!this.ctrlblk && this.datasource) {
            if (!this.datasource.queryallowed)
                this.pubblk$.qbeallowed = false;
            if (!this.datasource.insertallowed)
                this.pubblk$.insertallowed = false;
            if (!this.datasource.updateallowed)
                this.pubblk$.updateallowed = false;
        }
        if (!this.pubblk$.qbeallowed)
            this.view.disableQuery();
        if (!this.pubblk$.insertallowed)
            this.view.disableInsert();
        if (!this.pubblk$.updateallowed)
            this.view.disableUpdate();
        this.addColumns();
    }
    async asSubQuery(master, detail, rel) {
        if (!(master.datasource instanceof SQLSource))
            return (false);
        if (!(detail.datasource instanceof SQLSource))
            return (false);
        let source = detail.datasource;
        let sql = await source.getSubQuery(detail.filter, rel.master.fields, rel.detail.fields);
        if (sql != null) {
            let filter = new SubQuery(rel.master.fields);
            this.getDetailBlockFilter(detail, true).and(filter, detail.name);
            filter.subquery = sql.stmt;
            filter.setBindValues(sql.bindvalues);
            return (true);
        }
        return (false);
    }
    async fire(type, field) {
        let frmevent = FormEvent.BlockEvent(type, this.pubfrm$, this.name, field);
        return (FormEvents.raise(frmevent));
    }
}
