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
import { Record } from './Record.js';
import { Status } from '../view/Row.js';
import { MSGGRP } from '../messages/Internal.js';
import { Messages } from '../messages/Messages.js';
import { FieldProperties } from './FieldProperties.js';
import { EventType } from '../control/events/EventType.js';
import { FormBacking } from '../application/FormBacking.js';
import { FormEvents } from '../control/events/FormEvents.js';
import { FormsModule } from '../application/FormsModule.js';
import { FieldFeatureFactory } from '../view/FieldFeatureFactory.js';
/**
 * Intersection between datasource and html elements
 *
 * All generic code for a block should be put here, ie
 * 	Lookups
 * 	Triggers
 * 	List of values
 * 	etc
 */
export class Block {
    form$ = null;
    name$ = null;
    flush$ = null;
    updateallowed$ = true;
    /** Allow Query By Example */
    qbeallowed = true;
    /** Can block be queried */
    queryallowed = true;
    /** Is insert allowed */
    insertallowed = true;
    /** Is delete allowed */
    deleteallowed = true;
    /**
     * @param form : The form to attach to
     * @param name : The name of the block, used for binding elements
     */
    constructor(form, name) {
        this.form$ = form;
        this.name$ = name?.toLowerCase();
        FormBacking.getModelBlock(this, true);
        this.flush$ = FormsModule.defaultFlushStrategy;
        FormBacking.getBacking(form).blocks.set(this.name$, this);
    }
    get form() {
        return (this.form$);
    }
    get name() {
        return (this.name$);
    }
    /** Is update allowed */
    get updateallowed() {
        return (this.updateallowed$);
    }
    /** Is update allowed */
    set updateallowed(flag) {
        this.updateallowed$ = flag;
        let blk = FormBacking.getViewBlock(this);
        if (blk) {
            if (flag)
                blk.enableUpdate();
            else
                blk.disableUpdate();
        }
    }
    /** Flush when leaving row or block */
    get flushStrategy() {
        return (this.flush$);
    }
    /** Flush when leaving row or block */
    set flushStrategy(strategy) {
        this.flush$ = strategy;
    }
    /** The dynamic query filters applied to this block */
    get filter() {
        return (FormBacking.getModelBlock(this).QueryFilter);
    }
    /** Current row number in block */
    get row() {
        return (FormBacking.getViewBlock(this).row);
    }
    /** Number of displayed rows in block */
    get rows() {
        return (FormBacking.getViewBlock(this).rows);
    }
    /** Set focus on this block */
    async focus() {
        return (FormBacking.getViewBlock(this).focus());
    }
    /** Current record number in block */
    get record() {
        return (FormBacking.getModelBlock(this).record);
    }
    /** The state of the current record */
    get state() {
        return (this.getRecord()?.state);
    }
    /** Get all field names */
    get fields() {
        return (FormBacking.getViewBlock(this).getFieldNames());
    }
    /** Flush changes to backend */
    flush() {
        FormBacking.getModelBlock(this).flush();
    }
    /** Clear the block. If force, no validation will take place */
    async clear(force) {
        return (FormBacking.getModelBlock(this).clear(!force));
    }
    /** Is the block in query mode */
    queryMode() {
        return (FormBacking.getModelBlock(this).querymode);
    }
    /** Is the block empty */
    empty() {
        return (FormBacking.getModelBlock(this).empty);
    }
    /** Refresh (re-query) the record @param offset : offset to current record */
    async refresh(offset) {
        if (offset == null)
            offset = 0;
        await FormBacking.getModelBlock(this).refresh(offset, true);
    }
    /** Is field bound to this block */
    hasField(name) {
        return (this.fields.includes(name?.toLowerCase()));
    }
    /** Show the datepicker for the specified field */
    showDatePicker(field, row) {
        field = field?.toLowerCase();
        FormBacking.getViewForm(this.form).showDatePicker(this.name, field, row);
    }
    /** Show the LOV associated with the field. Normally only 1 LOV can be active, force overrules this rule */
    showListOfValues(field, row) {
        field = field?.toLowerCase();
        FormBacking.getViewForm(this.form).showListOfValues(this.name, field, row);
    }
    /** Simulate keystroke @param key: the keystroke @param field: send from field @param clazz: narrow in field */
    async sendkey(key, field, clazz) {
        return (this.form.sendkey(key, this.name, field, clazz));
    }
    /** Perform the query details operation */
    async querydetails(field) {
        if (!field)
            return (FormBacking.getModelBlock(this).queryDetails(true));
        else
            return (FormBacking.getModelForm(this.form).queryFieldDetails(this.name, field));
    }
    /** Navigate to previous record */
    async prevrecord() {
        return (FormBacking.getViewBlock(this).prevrecord());
    }
    /** Navigate to next record */
    async nextrecord() {
        return (FormBacking.getViewBlock(this).nextrecord());
    }
    /** Navigate to row and optionally field @param row: the to navigate to*/
    async goRow(row) {
        return (FormBacking.getViewBlock(this).goRow(row));
    }
    /** Navigate to field @param clazz: narrow in field*/
    async goField(field, clazz) {
        return (FormBacking.getViewBlock(this).goField(field, clazz));
    }
    /** Is this a control block (not bound to a datasource) */
    isControlBlock() {
        return (FormBacking.getModelBlock(this).ctrlblk);
    }
    /** Get the LOV for the given block and field */
    getListOfValues(field) {
        return (FormBacking.getBacking(this.form).getListOfValues(this.name, field));
    }
    /** Bind LOV to field(s) */
    setListOfValues(lov, field) {
        if (!Array.isArray(field))
            field = [field];
        for (let i = 0; i < field.length; i++)
            FormBacking.getBacking(this.form).setListOfValues(this.name, field[i], lov);
    }
    /** Remove LOV from field(s) */
    removeListOfValues(field) {
        if (!Array.isArray(field))
            field = [field];
        for (let i = 0; i < field.length; i++)
            FormBacking.getBacking(this.form).removeListOfValues(this.name, field[i]);
    }
    /** Specify a constraint on possible valid dates */
    setDateConstraint(constraint, field) {
        if (!Array.isArray(field))
            field = [field];
        for (let i = 0; i < field.length; i++)
            FormBacking.getBacking(this.form).setDateConstraint(this.name, field[i], constraint);
    }
    /** Get data from datasource @param header: include column names @param all: fetch all data from datasource */
    async getSourceData(header, all) {
        return (FormBacking.getModelBlock(this).copy(all, header));
    }
    /** As getSourceData but copies the data to the clipboard. Requires https */
    async saveDataToClipBoard(header, all) {
        let str = "";
        let data = await this.getSourceData(header, all);
        data.forEach((rec) => {
            let row = "";
            rec.forEach((col) => { row += ", " + col; });
            str += row.substring(2) + "\n";
        });
        str = str.substring(0, str.length - 1);
        navigator.clipboard.writeText(str);
    }
    get datasource() {
        return (FormBacking.getModelBlock(this, true).datasource);
    }
    set datasource(source) {
        FormBacking.getModelBlock(this, true).datasource = source;
    }
    /** Delete the current record */
    async delete() {
        return (FormBacking.getModelBlock(this)?.delete());
    }
    /** Insert a blank record @param before: Insert above the current row */
    async insert(before) {
        return (FormBacking.getModelBlock(this)?.insert(before));
    }
    getValue(field) {
        return (this.getRecord()?.getValue(field));
    }
    setValue(field, value) {
        this.getRecord()?.setValue(field, value);
    }
    /** Is the block in a valid state */
    isValid(field) {
        return (FormBacking.getViewBlock(this).isValid(field));
    }
    /** Mark the field valid */
    setValid(field, flag) {
        FormBacking.getViewBlock(this).setValid(field, flag);
    }
    getCurrentField() {
        return (FormBacking.getViewBlock(this).current.name);
    }
    /** Is block synchronized with backend */
    hasPendingChanges() {
        return (FormBacking.getModelBlock(this).getPendingCount() > 0);
    }
    /** Show the last query for this block */
    showLastQuery() {
        FormBacking.getModelBlock(this).showLastQuery();
    }
    /** setAndValidate field value as if changed by a user (fire all events) */
    async setAndValidate(field, value) {
        return (this.getRecord().setAndValidate(field, value));
    }
    /** Lock current record */
    async lock() {
        this.getRecord().lock();
    }
    /** Mark the current record as dirty */
    setDirty(field) {
        this.getRecord().setDirty(field);
    }
    getRecord(offset) {
        let intrec = null;
        if (offset == null)
            offset = 0;
        let block = FormBacking.getModelBlock(this);
        if (!FormBacking.getModelForm(this.form).hasEventTransaction(block)) {
            intrec = block.getRecord(offset);
        }
        else {
            if (offset != 0) {
                let running = FormBacking.getModelForm(this.form).eventTransaction.getEvent(block);
                // During transaction, only current record ...
                Messages.severe(MSGGRP.FRAMEWORK, 16, EventType[running]);
                return (null);
            }
            intrec = FormBacking.getModelForm(this.form).eventTransaction.getRecord(block);
        }
        return (intrec == null ? null : new Record(intrec));
    }
    /** Rehash the fields. Typically after dynamic insert/delete of HTML elements */
    reIndexFieldOrder() {
        FormBacking.getViewForm(this.form).rehash(this.name);
    }
    /** Get properties used in Query By Example mode */
    getQBEProperties(field) {
        field = field?.toLowerCase();
        let inst = FormBacking.getViewBlock(this).getFields(field);
        if (inst.length > 0)
            return (new FieldProperties(inst[0].qbeProperties));
        return (null);
    }
    /** Get properties used in insert mode */
    getInsertProperties(field) {
        field = field?.toLowerCase();
        let inst = FormBacking.getViewBlock(this).getFields(field);
        if (inst.length > 0)
            return (new FieldProperties(inst[0].insertProperties));
        return (null);
    }
    /** Get properties used in display mode */
    getDefaultProperties(field) {
        field = field?.toLowerCase();
        let inst = FormBacking.getViewBlock(this).getFields(field);
        if (inst.length > 0)
            return (new FieldProperties(inst[0].updateProperties));
        return (null);
    }
    /** As in getQBEProperties, but narrow down on the field id */
    getQBEPropertiesById(field, id) {
        id = id?.toLowerCase();
        field = field?.toLowerCase();
        let inst = FormBacking.getViewBlock(this).getFieldById(field, id);
        if (inst != null)
            return (new FieldProperties(inst.qbeProperties));
        return (null);
    }
    /** As in getInsertProperties, but narrow down on the field id */
    getInsertPropertiesById(field, id) {
        id = id?.toLowerCase();
        field = field?.toLowerCase();
        let inst = FormBacking.getViewBlock(this).getFieldById(field, id);
        if (inst != null)
            return (new FieldProperties(inst.insertProperties));
        return (null);
    }
    /** As in getDefaultProperties, but narrow down on the field id */
    getDefaultPropertiesById(field, id) {
        id = id?.toLowerCase();
        field = field?.toLowerCase();
        let inst = FormBacking.getViewBlock(this).getFieldById(field, id);
        if (inst != null)
            return (new FieldProperties(inst.updateProperties));
        return (null);
    }
    /** As in getQBEProperties, but narrow down on a given class */
    getQBEPropertiesByClass(field, clazz) {
        let props = this.getAllQBEPropertiesByClass(field, clazz);
        return (props.length == 0 ? null : props[0]);
    }
    /** As in getInsertProperties, but narrow down a given class */
    getInsertPropertiesByClass(field, clazz) {
        let props = this.getAllInsertPropertiesByClass(field, clazz);
        return (props.length == 0 ? null : props[0]);
    }
    /** As in getDefaultProperties, but narrow down a given class */
    getDefaultPropertiesByClass(field, clazz) {
        let props = this.getAllDefaultPropertiesByClass(field, clazz);
        return (props.length == 0 ? null : props[0]);
    }
    /** Get properties for all fields in Query By Example mode */
    getAllQBEPropertiesByClass(field, clazz) {
        clazz = clazz?.toLowerCase();
        field = field?.toLowerCase();
        let props = [];
        FormBacking.getViewBlock(this).getInstancesByClass(field, clazz).
            forEach((inst) => { props.push(new FieldProperties(inst.qbeProperties)); });
        return (props);
    }
    /** Get properties for all fields in insert mode */
    getAllInsertPropertiesByClass(field, clazz) {
        clazz = clazz?.toLowerCase();
        field = field?.toLowerCase();
        let props = [];
        FormBacking.getViewBlock(this).getInstancesByClass(field, clazz).
            forEach((inst) => { props.push(new FieldProperties(inst.insertProperties)); });
        return (props);
    }
    /** Get properties for all fields in display mode */
    getAllDefaultPropertiesByClass(field, clazz) {
        clazz = clazz?.toLowerCase();
        field = field?.toLowerCase();
        let props = [];
        FormBacking.getViewBlock(this).getInstancesByClass(field, clazz).
            forEach((inst) => { props.push(new FieldProperties(inst.updateProperties)); });
        return (props);
    }
    /** Apply Query By Example properties to field @param clazz: narrow down on class */
    setQBEProperties(props, field, clazz) {
        field = field?.toLowerCase();
        clazz = clazz?.toLowerCase();
        FormBacking.getViewBlock(this).getInstancesByClass(field, clazz).
            forEach((inst) => { FieldFeatureFactory.replace(props, inst, Status.qbe); });
    }
    /** Apply insert properties to field @param clazz: narrow down on class */
    setInsertProperties(props, field, clazz) {
        field = field?.toLowerCase();
        clazz = clazz?.toLowerCase();
        FormBacking.getViewBlock(this).getInstancesByClass(field, clazz).
            forEach((inst) => { FieldFeatureFactory.replace(props, inst, Status.insert); });
    }
    /** Apply display properties to field @param clazz: narrow down on class */
    setDefaultProperties(props, field, clazz) {
        field = field?.toLowerCase();
        clazz = clazz?.toLowerCase();
        FormBacking.getViewBlock(this).getInstancesByClass(field, clazz).
            forEach((inst) => { FieldFeatureFactory.replace(props, inst, Status.update); });
    }
    /** Apply Query By Example properties to field @param clazz: narrow down on id */
    setQBEPropertiesById(props, field, id) {
        id = id?.toLowerCase();
        field = field?.toLowerCase();
        let inst = FormBacking.getViewBlock(this).getFieldById(field, id);
        FieldFeatureFactory.replace(props, inst, Status.qbe);
    }
    /** Apply insert properties to field @param clazz: narrow down on id */
    setInsertPropertiesById(props, field, id) {
        id = id?.toLowerCase();
        field = field?.toLowerCase();
        let inst = FormBacking.getViewBlock(this).getFieldById(field, id);
        FieldFeatureFactory.replace(props, inst, Status.insert);
    }
    /** Apply display properties to field @param clazz: narrow down on id */
    setDefaultPropertiesById(props, field, id) {
        id = id?.toLowerCase();
        field = field?.toLowerCase();
        let inst = FormBacking.getViewBlock(this).getFieldById(field, id);
        FieldFeatureFactory.replace(props, inst, Status.update);
    }
    /** Re query the block with current filters */
    async reQuery() {
        return (FormBacking.getModelForm(this.form).executeQuery(this.name, true, true));
    }
    /** Escape Query By Example mode */
    cancelQueryMode() {
        FormBacking.getModelForm(this.form).cancelQueryMode(this.name);
    }
    /** Enter Query By Example mode */
    async enterQueryMode() {
        return (FormBacking.getModelForm(this.form).enterQuery(this.name));
    }
    /** Execute query on block */
    async executeQuery() {
        return (FormBacking.getModelForm(this.form).executeQuery(this.name, false, true));
    }
    /** Remove event listener @param handle: the handle returned when applying the event listener */
    removeEventListener(handle) {
        FormEvents.removeListener(handle);
    }
    /** Apply event listener @param filter: filter on the event */
    addEventListener(method, filter) {
        if (!filter)
            filter = {};
        filter.block = this.name;
        return (FormEvents.addListener(this.form, this, method, filter));
    }
    /** Dump the fetched records to the console */
    dump() {
        FormBacking.getModelBlock(this).wrapper.dump();
    }
}
