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
import { Row, Status } from "./Row.js";
import { DataType } from "./fields/DataType.js";
import { MSGGRP } from "../messages/Internal.js";
import { FieldInfo } from "./fields/FieldInfo.js";
import { KeyMap } from "../control/events/KeyMap.js";
import { RecordProperties } from "./RecordProperties.js";
import { RecordState } from "../model/Record.js";
import { Properties } from "../application/Properties.js";
import { Level, Messages } from "../messages/Messages.js";
import { EventType } from "../control/events/EventType.js";
import { FormBacking } from "../application/FormBacking.js";
import { FieldFeatureFactory } from "./FieldFeatureFactory.js";
import { FieldState } from "./fields/interfaces/FieldImplementation.js";
import { FormEvent, FormEvents } from "../control/events/FormEvents.js";
export class Block {
    rc$ = -1;
    row$ = -1;
    form$ = null;
    name$ = null;
    model$ = null;
    finalized$ = false;
    fieldnames$ = null;
    curinst$ = null;
    rows$ = new Map();
    displayed$ = new Map();
    recprops$ = new RecordProperties();
    fieldinfo$ = new Map();
    constructor(form, name) {
        this.name$ = name;
        this.form$ = form;
        this.fieldnames$ = [];
        this.form.addBlock(this);
        FormBacking.getModelBlock(this, true);
    }
    get row() {
        if (this.row$ < 0)
            return (0);
        else
            return (this.row$);
    }
    get rows() {
        return (this.rc$);
    }
    get name() {
        return (this.name$);
    }
    get form() {
        return (this.form$);
    }
    get model() {
        return (this.model$);
    }
    get visited() {
        return (this.curinst$ != null);
    }
    get current() {
        if (this.curinst$ == null)
            return (this.getCurrentRow().getFirstInstance(Status.na));
        return (this.curinst$);
    }
    set current(inst) {
        this.curinst$ = inst;
    }
    skip() {
        this.current?.skip();
    }
    blur(ignore) {
        this.current?.blur(ignore);
    }
    async focus(ignore) {
        if (this.form.block != this && this.form.current) {
            if (!await this.form.current.field.validate(this.form.current))
                return (false);
            if (!await this.form.leave(this.form.current))
                return (false);
            this.form.current.blur(true);
        }
        if (this.curinst$) {
            this.curinst$.focus(ignore);
            return (true);
        }
        else {
            let state = this.model.getRecord()?.state;
            if (state == null)
                state = RecordState.Update;
            let inst = this.getCurrentRow()?.getFirstInstance(this.convert(state));
            if (inst == null)
                inst = this.getRow(-1)?.getFirstInstance(this.convert(state));
            if (!inst) {
                let cf = this.getRow(-1)?.getFieldInstances()?.length;
                let rf = this.getCurrentRow()?.getFieldInstances()?.length;
                if (cf == null)
                    cf = 0;
                if (rf == null)
                    rf = 0;
                if (cf + rf > 0)
                    console.log("No available fields in " + this.name + " in state " + RecordState[state]);
                return (false);
            }
            if (!await this.form.enter(inst))
                return (false);
            inst?.focus(true);
            return (true);
        }
    }
    isValid(field) {
        let valid = true;
        field = field?.toLowerCase();
        this.getCurrentFields(field).forEach((fld) => { if (!fld.valid)
            valid = false; });
        return (valid);
    }
    setValid(field, flag) {
        field = field?.toLowerCase();
        this.getCurrentFields(field).forEach((fld) => fld.setInstanceValidity(flag));
    }
    async goField(field, clazz) {
        field = field?.toLowerCase();
        clazz = clazz?.toLowerCase();
        let inst = null;
        let state = this.model.getRecord()?.state;
        let ifield = this.getCurrentRow().getField(field);
        if (ifield == null)
            ifield = this.getRow(-1)?.getField(field);
        if (ifield != null) {
            let instances = ifield?.getInstancesByClass(clazz);
            if (instances.length > 0)
                inst = instances[0];
        }
        if (!inst) {
            let cf = this.getRow(-1)?.getFieldInstances()?.length;
            let rf = this.getCurrentRow()?.getFieldInstances()?.length;
            if (cf == null)
                cf = 0;
            if (rf == null)
                rf = 0;
            if (cf + rf > 0)
                console.log("No available fields named '" + field + "' in block '" + this.name + "' in state " + RecordState[state]);
            return (false);
        }
        if (this.form.current) {
            this.form.current.blur(true);
            if (!await this.form.leave(this.form.current))
                return (false);
        }
        inst.focus(true);
        if (inst.hasFocus())
            return (this.form.enter(inst));
        return (false);
    }
    empty(rownum) {
        if (rownum == null)
            rownum = this.row;
        let row = this.getRow(rownum);
        if (row.status == Status.na)
            return (true);
        if (row.status == Status.new)
            return (true);
        if (row.status == Status.qbe)
            return (true);
        return (false);
    }
    get fieldinfo() {
        return (this.fieldinfo$);
    }
    getAllFields(field) {
        let fields = [];
        let current = this.getRow(-1);
        if (field == null) {
            if (current != null)
                fields.push(...current.getFields());
            for (let i = 0; i < this.rows; i++)
                fields.push(...this.getRow(i).getFields());
        }
        else {
            if (current != null) {
                let fld = current.getField(field);
                if (fld != null)
                    fields.push(fld);
            }
            for (let i = 0; i < this.rows; i++) {
                let fld = this.getRow(i).getField(field);
                if (fld != null)
                    fields.push(fld);
            }
        }
        return (fields);
    }
    getCurrentFields(name) {
        let row = null;
        let fields = [];
        if (this.model.empty)
            return (fields);
        row = this.getRow(this.row);
        if (row != null)
            fields.push(...row.getFields());
        row = this.getRow(-1);
        if (row != null)
            fields.push(...row.getFields());
        if (name != null) {
            let named = [];
            name = name.toLowerCase();
            fields.forEach((fld) => {
                if (fld.name == name)
                    named.push(fld);
            });
            fields = named;
        }
        return (fields);
    }
    getFields(field) {
        let matched = [];
        let fields = this.getAllFields(field);
        for (let f = 0; f < fields.length; f++)
            matched.push(...fields[f].getInstances());
        return (matched);
    }
    getFieldById(field, id) {
        let fields = this.getAllFields(field);
        for (let f = 0; f < fields.length; f++) {
            let instances = fields[f].getInstances();
            for (let i = 0; i < instances.length; i++) {
                if (instances[i].id == id)
                    return (instances[i]);
            }
        }
        return (null);
    }
    getInstancesByName(field, all) {
        let instances = [];
        if (all) {
            instances = this.getInstancesByClass(field);
        }
        else {
            this.getCurrentFields(field).forEach((fld) => { instances.push(...fld.getInstances()); });
        }
        return (instances);
    }
    getInstancesByClass(field, clazz) {
        let matched = [];
        let fields = this.getAllFields(field);
        for (let f = 0; f < fields.length; f++) {
            let instances = fields[f].getInstances();
            if (clazz == null) {
                matched.push(...instances);
            }
            else {
                for (let i = 0; i < instances.length; i++) {
                    if (instances[i].properties.hasClass(clazz))
                        matched.push(instances[i]);
                }
            }
        }
        return (matched);
    }
    getFieldInstances(allrows) {
        let row = null;
        let instances = [];
        if (allrows) {
            this.rows$.forEach((row) => { instances.push(...row.getFieldInstances()); });
            return (instances);
        }
        row = this.getRow(this.row);
        if (row != null)
            instances.push(...row.getFieldInstances());
        row = this.getRow(-1);
        if (row != null)
            instances.push(...row.getFieldInstances());
        return (instances);
    }
    getFieldNames() {
        return (this.fieldnames$);
    }
    getRecordProperties(record, field, clazz) {
        let props = this.recprops$.get(record, field, clazz);
        if (props == null) {
            let instances = this.getFieldInstances();
            for (let i = 0; i < instances.length; i++) {
                if (instances[i].name == field) {
                    if (clazz == null)
                        return (instances[i].properties);
                    if (instances[i].properties.hasClass(clazz))
                        return (instances[i].properties);
                }
            }
        }
        return (props);
    }
    setRecordProperties(record, field, clazz, props) {
        if (props == null) {
            this.recprops$.delete(record, field, clazz);
            let row = this.displayed(record);
            this.recprops$.reset(row, field, clazz);
            if (this.row == row?.rownum) {
                row = this.getRow(-1);
                this.recprops$.reset(row, field, clazz);
            }
        }
        else {
            this.recprops$.set(record, field, clazz, props);
            if (this.displayed(record)) {
                this.applyRecordProperties(record, true, field);
                this.applyRecordProperties(record, false, field);
            }
        }
    }
    applyRecordProperties(record, baserec, field) {
        let row = this.displayed(record);
        if (!baserec)
            row = this.getRow(-1);
        if (row) {
            if (baserec)
                row.setIndicatorState(RecordState[record.state], record.failed);
            this.recprops$.apply(row, record, field);
        }
    }
    async setEventTransaction(event) {
        let record = this.model.getRecord();
        await this.model.setEventTransaction(event, record);
    }
    async wait4EventTransaction(event) {
        return (this.model.checkEventTransaction(event));
    }
    endEventTransaction(event, apply) {
        this.model.endEventTransaction(event, apply);
    }
    async lock() {
        let success = await this.model.lock();
        if (!success) {
            await this.model.refresh(0, false);
            return (false);
        }
        return (success);
    }
    async validateDate(field, date) {
        let success = true;
        let type = this.fieldinfo.get(field)?.type;
        if (type == DataType.date || type == DataType.datetime) {
            let backing = FormBacking.getBacking(this.form.parent);
            let datecstr = backing.getDateConstraint(this.name, field);
            if (datecstr) {
                success = datecstr.valid(date);
                if (!success)
                    Messages.handle(MSGGRP.VALIDATION, datecstr.message, Level.warn);
            }
        }
        return (success);
    }
    async setValidated(inst) {
        let value = inst.getValue();
        if (this.model.getValue(inst.name) == value)
            return (true);
        let success = this.model.setValue(inst.name, value);
        if (success) {
            if (this.model.querymode)
                this.model.setFilter(inst.name);
            else
                success = await this.model.form.queryFieldDetails(this.name, inst.name);
        }
        return (true);
    }
    async validateField(inst) {
        let value = inst.getValue();
        if (this.model.getValue(inst.name) == value)
            return (inst.valid);
        if (!await this.validateDate(inst.name, value))
            return (false);
        await this.setEventTransaction(EventType.WhenValidateField);
        let success = await this.fireFieldEvent(EventType.WhenValidateField, inst);
        this.endEventTransaction(EventType.WhenValidateField, success);
        if (success) {
            // refresh
            value = inst.getValue();
            success = this.model.setValue(inst.name, value);
            if (success) {
                if (this.model.querymode)
                    this.model.setFilter(inst.name);
                else
                    success = await this.model.form.queryFieldDetails(this.name, inst.name);
            }
        }
        if (success)
            success = await this.fireFieldEvent(EventType.PostChange, inst);
        return (success);
    }
    async validateRow() {
        if (!this.getCurrentRow().exist)
            return (true);
        if (this.getCurrentRow().validated)
            return (true);
        if (!await this.current.field.validate(this.current))
            return (false);
        return (this.getRow(this.row).validate());
    }
    async validate() {
        return (this.validateRow());
    }
    set validated(flag) {
        let row = this.getRow(this.row);
        if (flag && row && row.status == Status.new)
            row.status = Status.insert;
        if (row)
            row.validated = flag;
    }
    get validated() {
        return (this.getRow(this.row).validated);
    }
    reset() {
        this.rows$.forEach((row) => {
            row.status = Status.na;
            row.clear();
            row.setFieldState(FieldState.OPEN);
        });
    }
    cancel() {
        this.model.cancel();
        this.clear(true, true, true);
    }
    clear(props, rewind, fields) {
        if (this.current?.hasFocus() && this.row > 0)
            this.current.skip();
        this.current = null;
        if (!this.model.ctrlblk)
            this.displayed$.clear();
        if (rewind) {
            this.row$ = -1;
            this.model.rewind();
        }
        if (props)
            this.recprops$.clear();
        if (fields)
            this.model.querymode = false;
        if (this.model.ctrlblk) {
            if (fields) {
                this.rows$.forEach((row) => { row.clear(); });
                this.getRow(this.row).activateIndicators(true);
            }
            return;
        }
        this.rows$.forEach((row) => {
            row.status = Status.na;
            if (fields)
                row.clear();
        });
        if (fields)
            this.lockUnused();
        this.getRow(0).activateIndicators(true);
    }
    addInstance(inst) {
        if (this.fieldnames$.indexOf(inst.name) < 0)
            this.fieldnames$.push(inst.name);
    }
    async onEdit(inst) {
        this.curinst$ = inst;
        if (!this.fieldinfo.get(inst.name)?.derived) {
            if (!await this.lock())
                return (false);
        }
        this.model.dirty = true;
        await this.setEventTransaction(EventType.OnEdit);
        let success = await this.fireFieldEvent(EventType.OnEdit, inst);
        this.endEventTransaction(EventType.OnEdit, success);
        return (success);
    }
    async goRow(rownum) {
        if (!rownum)
            rownum = this.row;
        if (!(typeof rownum === "number"))
            rownum = +rownum;
        if (rownum < 0)
            return (false);
        if (rownum == this.row)
            return (true);
        if (rownum > this.rows)
            return (false);
        let row = this.getRow(rownum);
        let inst = this.current;
        if (!inst)
            inst = this.getFieldInstances()[0];
        if (!row)
            return (false);
        if (!inst)
            return (false);
        if (row.status == Status.na)
            return (false);
        if (inst.row >= 0) {
            let idx = this.getCurrentRow().getFieldIndex(this.current);
            inst = this.getRow(rownum)?.getFieldByIndex(idx);
            if (inst) {
                if (this.form.current) {
                    this.form.current.blur(true);
                    if (!await this.form.leave(this.form.current))
                        return (false);
                }
                inst.focus(true);
                if (inst.hasFocus())
                    return (this.form.enter(inst));
            }
        }
        else {
            if (this.form.current) {
                this.form.current.blur(true);
                if (!await this.form.leave(this.form.current))
                    return (false);
                if (!await this.form.leaveRecord(this))
                    return (false);
            }
            let move = rownum - this.row;
            this.setIndicators(this.row, null);
            this.move(move);
            this.model.move(move);
            this.refresh(this.model.getRecord());
            inst.focus(true);
            if (inst.hasFocus()) {
                if (!await this.form.enterRecord(this, 0))
                    return (false);
                if (!await this.form.enterField(inst, 0, true))
                    return (false);
                if (!await this.form.onRecord(this))
                    return (false);
            }
            return (true);
        }
        return (false);
    }
    async prevrecord() {
        return (this.navigateBlock(KeyMap.prevrecord, this.current));
    }
    async nextrecord() {
        return (this.navigateBlock(KeyMap.nextrecord, this.current));
    }
    async navigateRow(key, inst) {
        let next = inst;
        switch (key) {
            case KeyMap.nextfield:
                {
                    next = inst.field.row.nextField(inst);
                    break;
                }
            case KeyMap.prevfield:
                {
                    next = inst.field.row.prevField(inst);
                    break;
                }
        }
        if (next != inst)
            inst.blur();
        next.focus();
        return (true);
    }
    async navigateBlock(key, inst) {
        let nav = false;
        let next = inst;
        if (this.model.querymode)
            return (false);
        if (this.getCurrentRow().status == Status.na)
            return (false);
        if (!await inst.field.validate(inst)) {
            next.focus();
            return (false);
        }
        switch (key) {
            case KeyMap.nextrecord:
                {
                    nav = true;
                    next = await this.scroll(inst, 1);
                    break;
                }
            case KeyMap.prevrecord:
                {
                    nav = true;
                    next = await this.scroll(inst, -1);
                    break;
                }
            case KeyMap.pageup:
                {
                    nav = true;
                    next = await this.scroll(inst, -this.rows);
                    break;
                }
            case KeyMap.pagedown:
                {
                    nav = true;
                    next = await this.scroll(inst, this.rows);
                    break;
                }
        }
        if (next != inst)
            inst.blur();
        next.focus();
        return (nav);
    }
    offset(inst) {
        let row = inst.row;
        if (row < 0)
            row = this.row;
        return (row - this.row);
    }
    move(delta) {
        this.row$ = this.row + delta;
        return (this.row$);
    }
    getCurrentRow() {
        return (this.rows$.get(this.row));
    }
    async setCurrentRow(rownum, newqry) {
        let success = true;
        if (this.row$ < 0) {
            this.row$ = 0;
            if (rownum > 0)
                this.row$ = rownum;
            if (this.getRow(this.row).status != Status.na) {
                this.openrow();
                this.displaycurrent();
                if (this.getRow(this.row).status != Status.qbe)
                    success = await this.model.queryDetails(newqry);
            }
            this.setIndicators(null, rownum);
            return (success);
        }
        if (rownum == this.row || rownum == -1)
            return (success);
        this.model$.move(rownum - this.row);
        this.setIndicators(this.row$, rownum);
        let prev = this.getRow(this.row);
        if (prev.status != Status.na)
            prev.setFieldState(FieldState.READONLY);
        this.row$ = rownum;
        if (this.getRow(this.row).status != Status.na) {
            this.openrow();
            if (this.getRow(this.row).status != Status.qbe)
                success = await this.model.queryDetails(newqry);
        }
        this.displaycurrent();
        return (success);
    }
    addRow(row) {
        this.rows$.set(row.rownum, row);
    }
    getRow(rownum) {
        return (this.rows$.get(rownum));
    }
    displayed(record) {
        return (this.displayed$.get(record?.id));
    }
    getRecord(row) {
        if (!row || row < 0)
            row = this.row;
        return (this.model.getRecord(row - this.row));
    }
    setAttributes(record) {
        if (record == null) {
            let offset = -this.row;
            for (let i = 0; i < this.rows; i++) {
                let rec = this.model.getRecord(i + offset);
                if (rec)
                    this.setAttributes(rec);
            }
        }
        let row = this.displayed(record);
        if (row == null)
            return;
        row.setState(this.convert(record.state));
        this.applyRecordProperties(record, true);
        if (row.rownum == this.row) {
            row = this.getRow(-1);
            if (row) {
                row.setState(this.convert(record.state));
                this.applyRecordProperties(record, false);
            }
        }
    }
    display(rownum, record) {
        let row = this.getRow(rownum);
        this.displayed$.set(record.id, row);
        if (row.getFieldState() == FieldState.DISABLED)
            row.setFieldState(FieldState.READONLY);
        row.status = this.convert(record.state);
        row.clear();
        this.applyRecordProperties(record, true);
        record.values.forEach((field) => { row.distribute(field.name, field.value, false); });
    }
    lockUnused() {
        let row = this.getRow(0);
        if (this.getCurrentRow().status == Status.na) {
            let curr = this.getRow(-1);
            if (curr != null) {
                curr.clear();
                curr.setFieldState(FieldState.READONLY);
            }
        }
        if (row.status == Status.na) {
            row.clear();
            row.setFieldState(FieldState.READONLY);
        }
        for (let i = 1; i < this.rows; i++) {
            row = this.getRow(i);
            if (row.status == Status.na) {
                row.clear();
                row.setFieldState(FieldState.DISABLED);
            }
        }
    }
    async refresh(record) {
        if (record == null)
            return (false);
        let row = this.displayed(record);
        if (row == null)
            return;
        row.validated = true;
        this.display(row.rownum, record);
        if (row.rownum == this.row) {
            this.displaycurrent();
            if (!await this.model.queryDetails(true))
                return (false);
            this.setIndicators(null, this.row);
        }
        return (true);
    }
    swapInstances(inst1, inst2) {
        let swp1 = document.createElement("p");
        let swp2 = document.createElement("p");
        inst1.element.replaceWith(swp1);
        inst2.element.replaceWith(swp2);
        swp1.replaceWith(inst2.element);
        swp2.replaceWith(inst1.element);
        this.getRow(inst1.row).swapInstances(inst1, inst2);
    }
    openrow() {
        let row = this.getRow(this.row);
        let current = this.rows$.get(-1);
        if (row.getFieldState() == FieldState.READONLY) {
            row.setFieldState(FieldState.OPEN);
            if (current != null) {
                if (current.getFieldState() == FieldState.READONLY)
                    current.setFieldState(FieldState.OPEN);
            }
        }
    }
    displaycurrent() {
        let current = this.rows$.get(-1);
        if (current != null && this.getCurrentRow().exist) {
            let record = this.model.getRecord();
            current.status = this.convert(record.state);
            current.clear();
            this.applyRecordProperties(record, false);
            record.values.forEach((field) => { current.distribute(field.name, field.value, false); });
        }
    }
    setIndicators(prev, next) {
        if (prev == next)
            prev = null;
        if (next != null)
            this.getRow(next)?.activateIndicators(true);
        if (prev != null)
            this.getRow(prev)?.activateIndicators(false);
    }
    setFilterIndicators(indicators, flag) {
        indicators?.forEach((ind) => {
            if (flag)
                ind.element.classList.add(Properties.Classes.FilterIndicator);
            else
                ind.element.classList.remove(Properties.Classes.FilterIndicator);
        });
    }
    async scroll(inst, scroll) {
        let next = inst;
        if (!await this.validateRow())
            return (next);
        if (this.row + scroll < 0 || this.row + scroll >= this.rows) {
            let available = 0;
            let crow = this.row;
            // fetch up from first, down from last
            if (scroll < 0)
                available = await this.model.prefetch(scroll, -this.row);
            else
                available = await this.model.prefetch(scroll, this.rows - this.row - 1);
            if (available <= 0)
                return (next);
            let move = (scroll > 1 && available <= this.row);
            if (move) {
                inst.ignore = "blur";
                if (inst.row < 0) {
                    next = inst;
                }
                else {
                    let row = this.getRow(available - 1);
                    let idx = this.getCurrentRow().getFieldIndex(inst);
                    next = row.getFieldByIndex(idx);
                    if (!next.focusable(row.status))
                        next = row.getFirstInstance(row.status);
                }
                next.ignore = "focus";
            }
            if (!await this.form.leaveField(inst, 0, true))
                return (next);
            if (!await this.form.leaveRecord(this))
                return (next);
            let moved = this.model.scroll(scroll, this.row);
            if (!await this.form.enterRecord(this, 0)) {
                this.model.scroll(-scroll, this.row);
                this.setIndicators(null, this.row$);
                return (next);
            }
            if (!await this.form.enterField(next, 0, true)) {
                this.model.scroll(-scroll, this.row);
                this.setIndicators(null, this.row$);
                return (next);
            }
            if (!await this.form.onRecord(next.field.block)) {
                this.model.scroll(-scroll, this.row);
                this.setIndicators(null, this.row$);
                return (next);
            }
            if (moved < scroll)
                this.row$ -= scroll - moved;
            this.displaycurrent();
            this.model.queryDetails(true);
            this.setIndicators(crow, this.row$);
            return (next);
        }
        let idx = inst.field.row.getFieldIndex(inst);
        if (inst.row < 0) {
            if (this.getRow(this.row + scroll).status == Status.na)
                return (inst);
            if (!await this.form.leaveField(inst, 0, true))
                return (inst);
            if (!await this.form.leaveRecord(this))
                return (inst);
            if (!await this.form.enterRecord(this, scroll))
                return (inst);
            if (!await this.form.enterField(inst, scroll, true))
                return (inst);
            this.setCurrentRow(this.row + scroll, true);
        }
        else {
            let row = this.getRow(this.row + scroll);
            if (row.status != Status.na)
                next = row.getFieldByIndex(idx);
            if (!next.focusable(row.status))
                next = row.getFirstInstance(row.status);
        }
        return (next);
    }
    findFirst(record) {
        let inst = null;
        let row = this.displayed(record);
        let curr = this.current.row < 0;
        let status = this.convert(record?.state);
        if (curr) {
            inst = this.getRow(-1)?.getFirstInstance(status);
            if (inst == null)
                inst = row?.getFirstInstance(status);
        }
        else {
            inst = row?.getFirstInstance(status);
            if (inst == null)
                inst = this.getRow(-1)?.getFirstInstance(status);
        }
        return (inst);
    }
    hasQueryableFields() {
        let row = this.getRow(0);
        let curr = this.getRow(-1);
        let inst = null;
        inst = row?.getFirstEditableInstance(Status.qbe);
        if (!inst)
            inst = curr?.getFirstEditableInstance(Status.qbe);
        return (inst != null);
    }
    hasInsertableFields() {
        let row = this.getRow(0);
        let curr = this.getRow(-1);
        let inst = null;
        inst = row?.getFirstEditableInstance(Status.new);
        if (!inst)
            inst = curr?.getFirstEditableInstance(Status.new);
        return (inst != null);
    }
    findFirstEditable(record) {
        let inst = null;
        let row = this.displayed(record);
        let curr = this.current.row < 0;
        let status = this.convert(record?.state);
        if (curr) {
            inst = this.getRow(-1)?.getFirstEditableInstance(status);
            if (inst == null)
                inst = row?.getFirstEditableInstance(status);
        }
        else {
            inst = row?.getFirstEditableInstance(status);
            if (inst == null)
                inst = this.getRow(-1)?.getFirstEditableInstance(status);
        }
        return (inst);
    }
    getQBEInstance(inst) {
        if (inst?.row > 0) {
            let idx = this.getRow(inst.row).getFieldIndex(inst);
            inst = this.getRow(0).getFieldByIndex(idx);
        }
        if (!inst?.focusable(Status.qbe))
            return (null);
        return (inst);
    }
    getPreviousInstance(inst) {
        if (inst?.row > 0) {
            let idx = this.getRow(inst.row).getFieldIndex(inst);
            inst = this.getRow(inst.row - 1).getFieldByIndex(idx);
        }
        return (inst);
    }
    finalize() {
        let rows = [];
        this.rows$.forEach((row) => { rows.push(row); });
        this.form.getIndicators(this.name).forEach((ind) => this.getRow(ind.row)?.setIndicator(ind));
        if (rows.length == 0)
            rows.push(new Row(this, 0));
        if (this.model == null)
            this.model$ = FormBacking.getModelBlock(this, true);
        /*
         * If only 1 row, set rownum to 0;
         * Otherwise sort all rows and re-number then from 0 - rows
        */
        if (rows.length == 1)
            rows[0].setSingleRow();
        if (rows.length > 1) {
            let n = 0;
            rows = rows.sort((r1, r2) => { return (r1.rownum - r2.rownum); });
            for (let i = 0; i < rows.length; i++) {
                if (rows[i].rownum >= 0)
                    rows[i].rownum = n++;
            }
        }
        this.rows$.clear();
        rows.forEach((row) => { this.rows$.set(row.rownum, row); });
        this.rc$ = rows.length;
        if (this.getRow(-1) != null)
            this.rc$--;
        this.rows$.forEach((row) => {
            row.finalize();
            if (row.rownum > 0)
                row.setFieldState(FieldState.DISABLED);
        });
        this.setIndicators(null, 0);
        this.getRow(0)?.setFieldState(FieldState.READONLY);
        this.getRow(-1)?.setFieldState(FieldState.READONLY);
        // set most restrictive datatype and derived
        this.getFieldNames().forEach((name) => {
            let type = null;
            let tdiff = false;
            let ddiff = false;
            let query = false;
            let derived = null;
            let advquery = true;
            this.getAllFields(name).forEach((fld) => {
                fld.getInstances().forEach((inst) => {
                    if (type == null)
                        type = inst.datatype;
                    if (derived == null)
                        derived = inst.properties.derived;
                    if (inst.properties.derived != derived)
                        ddiff = true;
                    if (advquery == true)
                        advquery = inst.properties.advquery;
                    if (inst.properties.derived)
                        derived = true;
                    if (!inst.qbeProperties.readonly)
                        query = true;
                    if (!inst.qbeProperties.advquery)
                        advquery = true;
                    if (inst.properties.listofvalues)
                        FormBacking.getBacking(this.form.parent).setListOfValues(this.name, inst.name, inst.properties.listofvalues);
                    if (inst.datatype != type) {
                        switch (type) {
                            case DataType.string:
                                {
                                    if (inst.datatype != DataType.string) {
                                        tdiff = true;
                                        type = inst.datatype;
                                    }
                                }
                                break;
                            case DataType.integer:
                                {
                                    if (inst.datatype != DataType.integer)
                                        tdiff = true;
                                }
                                break;
                            case DataType.decimal:
                                {
                                    if (inst.datatype != DataType.integer)
                                        type = DataType.integer;
                                    if (inst.datatype != DataType.decimal)
                                        tdiff = true;
                                }
                                break;
                            case DataType.date:
                            case DataType.datetime:
                                {
                                    if (inst.datatype == DataType.string)
                                        tdiff = true;
                                    if (inst.datatype == DataType.integer)
                                        tdiff = true;
                                    if (inst.datatype == DataType.decimal)
                                        tdiff = true;
                                }
                                break;
                        }
                    }
                });
            });
            if (tdiff || ddiff || !advquery) {
                this.getAllFields(name).forEach((fld) => {
                    fld.getInstances().forEach((inst) => {
                        if (tdiff) {
                            inst.datatype = type;
                            inst.defaultProperties.setType(type);
                            FieldFeatureFactory.applyType(inst);
                        }
                        if (ddiff) {
                            inst.defaultProperties.derived = derived;
                        }
                        if (!advquery) {
                            inst.qbeProperties.advquery = advquery;
                        }
                    });
                });
            }
            this.fieldinfo$.set(name, new FieldInfo(type, query, derived));
        });
        this.finalized$ = true;
        this.getRow(0)?.setIndicatorState("na", false);
        this.model$ = FormBacking.getModelForm(this.form.parent).getBlock(this.name);
    }
    disableQuery() {
        let instances = this.getFieldInstances(true);
        for (let i = 0; i < instances.length; i++)
            instances[i].qbeProperties.readonly = true;
    }
    disableInsert() {
        let instances = this.getFieldInstances(true);
        for (let i = 0; i < instances.length; i++)
            instances[i].insertProperties.readonly = true;
    }
    disableUpdate() {
        let instances = this.getFieldInstances(true);
        for (let i = 0; i < instances.length; i++) {
            if (!this.fieldinfo.get(instances[i].name)?.derived) {
                let update = this.finalized$;
                if (this.model.querymode)
                    update = false;
                if (this.getRow(instances[i].row).status != Status.update)
                    update = false;
                instances[i].updateProperties.readonly = true;
                if (update)
                    instances[i].applyProperties(instances[i].updateProperties);
            }
        }
    }
    enableUpdate() {
        let instances = this.getFieldInstances(true);
        for (let i = 0; i < instances.length; i++) {
            if (!this.fieldinfo.get(instances[i].name)?.derived) {
                let update = this.finalized$;
                if (this.model.querymode)
                    update = false;
                if (this.getRow(instances[i].row).status != Status.update)
                    update = false;
                instances[i].updateProperties.readonly = false;
                if (update)
                    instances[i].applyProperties(instances[i].updateProperties);
            }
        }
    }
    distribute(field, value, dirty) {
        let cr = this.row$;
        let fr = field.row.rownum;
        if (fr >= 0)
            this.getRow(-1)?.distribute(field.name, value, dirty);
        else
            this.getRow(cr)?.distribute(field.name, value, dirty);
    }
    convert(status) {
        switch (status) {
            case null: return (Status.na);
            case RecordState.New: return (Status.new);
            case RecordState.Insert: return (Status.insert);
            case RecordState.Inserted: return (Status.insert);
            case RecordState.Delete: return (Status.delete);
            case RecordState.Deleted: return (Status.delete);
            case RecordState.Update: return (Status.update);
            case RecordState.Updated: return (Status.update);
            case RecordState.Consistent: return (Status.update);
            case RecordState.QueryFilter: return (Status.qbe);
        }
    }
    linkModel() {
        this.model$ = FormBacking.getModelForm(this.form.parent).getBlock(this.name);
    }
    async fireFieldEvent(type, inst) {
        let frmevent = FormEvent.FieldEvent(type, inst);
        return (FormEvents.raise(frmevent));
    }
    async fireBlockEvent(type, inst) {
        let frmevent = FormEvent.BlockEvent(type, this.form.parent, this.name, inst);
        return (FormEvents.raise(frmevent));
    }
}
