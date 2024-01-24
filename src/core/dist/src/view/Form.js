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
import { Status } from './Row.js';
import { FieldDrag } from './FieldDrag.js';
import { DataType } from './fields/DataType.js';
import { Classes } from '../internal/Classes.js';
import { MSGGRP } from '../messages/Internal.js';
import { Messages } from '../messages/Messages.js';
import { Form as Internal } from '../internal/Form.js';
import { Logger, Type } from '../application/Logger.js';
import { Form as InterfaceForm } from '../public/Form.js';
import { EventType } from '../control/events/EventType.js';
import { FormBacking } from '../application/FormBacking.js';
import { FormsModule } from '../application/FormsModule.js';
import { EventStack } from '../control/events/EventStack.js';
import { FieldProperties } from '../public/FieldProperties.js';
import { BrowserEvent } from '../control/events/BrowserEvent.js';
import { KeyMap, KeyMapping } from '../control/events/KeyMap.js';
import { FlightRecorder } from '../application/FlightRecorder.js';
import { FormEvent, FormEvents } from '../control/events/FormEvents.js';
import { MouseMapParser } from '../control/events/MouseMap.js';
import { ApplicationHandler } from '../control/events/ApplicationHandler.js';
export class Form {
    static current() {
        return (FormBacking.getCurrentViewForm());
    }
    static previous() {
        return (FormBacking.getPreviousViewForm());
    }
    focus$ = null;
    canvas$ = null;
    modfrm$ = null;
    parent$ = null;
    curinst$ = null;
    lastinst$ = null;
    blocks$ = new Map();
    indicators = new Map();
    fltindicators = new Map();
    constructor(parent) {
        this.parent$ = parent;
        FormBacking.setViewForm(parent, this);
        this.modfrm$ = FormBacking.getModelForm(this.parent, true);
        Logger.log(Type.formbinding, "Create viewform: " + this.parent.name);
    }
    get name() {
        return (this.parent.name);
    }
    get parent() {
        return (this.parent$);
    }
    get canvas() {
        return (this.canvas$);
    }
    set canvas(canvas) {
        this.canvas$ = canvas;
        this.canvas$.getView().setAttribute("form", this.name);
        this.canvas$.getContent()?.addEventListener("focus", this);
        if (this.parent instanceof Internal)
            this.canvas$.getView().setAttribute("internal", "true");
    }
    get model() {
        return (this.modfrm$);
    }
    get block() {
        return (this.current?.field.block);
    }
    get current() {
        return (this.curinst$);
    }
    set current(inst) {
        this.curinst$ = inst;
    }
    async clear(flush) {
        if (flush && !await this.model.flush())
            return (false);
        this.blocks$.forEach((block) => {
            if (block.model.ctrlblk) {
                block.clear(true, true, true);
            }
            else {
                block.model.clear(false);
                for (let i = 0; i < block.rows; i++)
                    block.getRow(i).clear();
            }
        });
        return (true);
    }
    getBlock(name) {
        return (this.blocks$.get(name));
    }
    getBlocks() {
        let blocks = [];
        this.blocks$.forEach((block) => { blocks.push(block); });
        return (blocks);
    }
    addBlock(block) {
        this.blocks$.set(block.name, block);
        Logger.log(Type.formbinding, "Add block '" + block.name + "' to viewform: " + this.parent.name);
    }
    getIndicators(block) {
        let indicators = this.indicators.get(block);
        if (indicators == null)
            return ([]);
        return (indicators);
    }
    addIndicator(ind) {
        let block = ind.binding.toLowerCase();
        let indicators = this.indicators.get(block);
        if (indicators == null) {
            indicators = [];
            this.indicators.set(block, indicators);
        }
        indicators.push(ind);
    }
    setFilterIndicator(block, flag) {
        block.view.setFilterIndicators(this.fltindicators.get(block.name), flag);
    }
    addFilterIndicator(ind) {
        let block = ind.binding.toLowerCase();
        let fltindicators = this.fltindicators.get(block);
        if (fltindicators == null) {
            fltindicators = [];
            this.fltindicators.set(block, fltindicators);
        }
        fltindicators.push(ind);
    }
    skip() {
        this.current?.skip();
    }
    blur(ignore, stay) {
        this.current?.blur(ignore);
        // Should postfield trigger or not
        if (!stay)
            this.lastinst$ = this.current;
    }
    async focus() {
        let inst = this.current;
        if (!inst && this.blocks$.size > 0)
            inst = this.blocks$.values().next().value.current;
        if (!inst)
            return (false);
        inst.focus();
    }
    dragfields(header) {
        let fd = new FieldDrag(this, header);
        fd.start();
    }
    async validate() {
        let inst = this.current;
        if (inst == null)
            return (true);
        if (!await inst.field.block.validate())
            return (false);
        return (this.model.flush());
    }
    validated() {
        let valid = true;
        this.blocks$.forEach((blk) => {
            if (!blk.validated)
                valid = false;
        });
        if (!valid) {
            this.focus();
            return (false);
        }
        return (true);
    }
    async onCanvasFocus() {
        let preform = Form.current();
        if (preform && preform != this) {
            if (!await preform.validate()) {
                preform.focus();
                return (false);
            }
            if (!await this.leaveForm(preform)) {
                preform.focus();
                return (false);
            }
            if (!await this.enterForm(this)) {
                preform.focus();
                return (false);
            }
            this.setURL();
            this.canvas.activate();
            FormBacking.setCurrentForm(this);
        }
        return (true);
    }
    async enter(inst) {
        let preform = Form.current();
        let preinst = this.current;
        let preblock = this.current?.field.block;
        let nxtblock = inst.field.block;
        let visited = nxtblock.visited;
        let recoffset = nxtblock.offset(inst);
        if (preform == this && inst == this.current)
            return (true);
        /**********************************************************************
            Go to form
         **********************************************************************/
        let backing = FormBacking.getBacking(this.parent);
        // Check if 'I' have been closed
        if (backing == null)
            return (false);
        if (this != preform) {
            // When modal call, allow leaving former form in any state
            let modal = false;
            if (backing.wasCalled) {
                if (!preform || preform.parent == backing.parent)
                    modal = true;
            }
            if (!modal) {
                if (preform != null) {
                    preform.blur(true);
                    if (!await this.checkLeave(preform)) {
                        FormBacking.setCurrentForm(null);
                        preform.focus();
                        return (false);
                    }
                    inst.focus(true);
                }
            }
            if (!await this.enterForm(this)) {
                preform.focus();
                return (false);
            }
        }
        /**********************************************************************
            Leave this forms current record and block
         **********************************************************************/
        if (preblock != null) {
            // PostField already fired on blur
            if (preblock != nxtblock) {
                if (!await preblock.validate()) {
                    this.focus();
                    return (false);
                }
                if (!await this.leaveRecord(preblock)) {
                    this.focus();
                    return (false);
                }
                if (!await this.leaveBlock(preblock)) {
                    this.focus();
                    return (false);
                }
            }
            else if (recoffset != 0) {
                if (!await nxtblock.validateRow()) {
                    this.focus();
                    return (false);
                }
                if (!await this.leaveRecord(preblock)) {
                    this.focus();
                    return (false);
                }
            }
        }
        /**********************************************************************
            Enter this forms current block and record
         **********************************************************************/
        if (nxtblock != preblock) {
            if (!await this.enterBlock(nxtblock, recoffset)) {
                this.focus();
                return (false);
            }
            if (!await this.enterRecord(nxtblock, recoffset)) {
                this.focus();
                return (false);
            }
        }
        else if (recoffset != 0) {
            if (!await this.enterRecord(nxtblock, recoffset)) {
                this.focus();
                return (false);
            }
        }
        nxtblock.current = inst;
        FormBacking.setCurrentForm(this);
        nxtblock.setCurrentRow(inst.row, true);
        if (preform)
            this.parent.canvas.activate();
        // Prefield
        if (inst != preinst) {
            if (!await this.enterField(inst, 0)) {
                inst.blur(true);
                if (preform != this)
                    preform.focus();
                else if (this.current)
                    this.current.focus(true);
                return (false);
            }
        }
        if (preblock != nxtblock || recoffset != 0 || !visited) {
            if (nxtblock.getRecord(recoffset))
                await this.onRecord(nxtblock);
        }
        this.setURL();
        this.current = inst;
        return (true);
    }
    async checkLeave(curr) {
        if (!await curr.validate())
            return (false);
        if (this.focus$ && !await curr.leaveField(null, 0, true))
            return (false);
        if (!await this.leaveForm(curr))
            return (false);
        return (true);
    }
    async leave(inst) {
        if (!await this.leaveField(inst)) {
            Form.current().focus();
            return (false);
        }
        return (true);
    }
    async enterForm(form) {
        FormBacking.setCurrentForm(form);
        if (!await this.setEventTransaction(EventType.PreForm))
            return (false);
        let success = await this.fireFormEvent(EventType.PreForm, form.parent);
        this.model.endEventTransaction(EventType.PreForm, null, success);
        if (success) {
            form.focus$ = true;
            if (FormsModule.showurl)
                this.setURL();
        }
        else {
            FormBacking.setCurrentForm(null);
        }
        return (success);
    }
    async enterBlock(block, offset) {
        if (!await this.setEventTransaction(EventType.PreBlock, block, offset))
            return (false);
        let success = await this.fireBlockEvent(EventType.PreBlock, block.name);
        block.model.endEventTransaction(EventType.PreBlock, success);
        return (success);
    }
    async enterRecord(block, offset) {
        if (block.model.getRecord(offset) == null)
            return (true);
        if (!await this.setEventTransaction(EventType.PreRecord, block, offset))
            return (false);
        let success = await this.fireBlockEvent(EventType.PreRecord, block.name);
        block.model.endEventTransaction(EventType.PreRecord, success);
        return (success);
    }
    async onRecord(block) {
        if (!block)
            return (true);
        if (!await this.model.checkEventTransaction(EventType.OnRecord, null))
            return (false);
        let success = await this.fireBlockEvent(EventType.OnRecord, block.name);
        block.model.endEventTransaction(EventType.OnRecord, success);
        return (success);
    }
    async onCreateRecord(block, record) {
        if (!await this.setEventTransaction(EventType.OnCreateRecord, block, record))
            return (false);
        let success = await this.fireBlockEvent(EventType.OnCreateRecord, block.name);
        block.model.endEventTransaction(EventType.OnCreateRecord, success);
        return (success);
    }
    async enterField(inst, offset, force) {
        if (inst == null)
            return (false);
        if (!force && inst == this.current)
            return (true);
        this.current = inst;
        this.lastinst$ = null;
        if (!force && inst?.field.row.status == Status.na)
            return (true);
        if (!await this.setEventTransaction(EventType.PreField, inst.field.block, offset))
            return (false);
        let success = await this.fireFieldEvent(EventType.PreField, inst);
        inst.field.block.model.endEventTransaction(EventType.PreField, success);
        return (success);
    }
    async leaveForm(form) {
        if (!form.focus$)
            return (true);
        if (!await this.setEventTransaction(EventType.PostForm))
            return (false);
        let success = await this.fireFormEvent(EventType.PostForm, form.parent);
        this.endEventTransaction(EventType.PostBlock, success);
        if (success)
            form.focus$ = false;
        return (success);
    }
    async leaveBlock(block, offset) {
        if (!await this.setEventTransaction(EventType.PostBlock, block, offset))
            return (false);
        let success = await this.fireBlockEvent(EventType.PostBlock, block.name);
        block.endEventTransaction(EventType.PostBlock, success);
        if (success)
            success = await block.model.flush();
        return (success);
    }
    async leaveRecord(block, offset) {
        if (block.model.getRecord(offset) == null)
            return (true);
        if (!await this.setEventTransaction(EventType.PostRecord, block, offset))
            return (false);
        let success = await this.fireBlockEvent(EventType.PostRecord, block.name);
        block.endEventTransaction(EventType.PostRecord, success);
        return (success);
    }
    async leaveField(inst, offset, force) {
        if (inst == null)
            inst = this.current;
        if (!force && inst == this.lastinst$)
            return (true);
        if (inst?.field.row.status == Status.na)
            return (true);
        this.lastinst$ = inst;
        if (!inst)
            return (true);
        if (!await this.setEventTransaction(EventType.PostField, inst.field.block, offset))
            return (false);
        let success = await this.fireFieldEvent(EventType.PostField, inst);
        inst.field.block.model.endEventTransaction(EventType.PostField, success);
        return (success);
    }
    sendkey(key, block, field, clazz) {
        block = block?.toLowerCase();
        field = field?.toLowerCase();
        let brwevent = BrowserEvent.get().clone();
        brwevent.setKeyEvent(key);
        if (this.current) {
            if (!field)
                field = this.current.field.name;
            if (!block)
                block = this.current.field.block.name;
        }
        if (!block || !field) {
            // Unable to locate field or block
            Messages.warn(MSGGRP.FRAMEWORK, 17, block + "." + field);
            return (false);
        }
        if (this.current) {
            // If field matches current field instance, then use that
            if (field == this.current.field.name && block == this.current.field.block.name) {
                if (!clazz || (clazz && !this.current.properties.hasClass(clazz))) {
                    EventStack.send(this.current, brwevent);
                    return (true);
                }
            }
        }
        let blk = this.getBlock(block.toLowerCase());
        let match = blk?.getInstancesByClass(field, clazz);
        if (!match || match.length == 0) {
            // Unable to locate field or block
            Messages.warn(MSGGRP.FRAMEWORK, 17, block + "." + field);
            return (false);
        }
        EventStack.send(match[0], brwevent);
        return (true);
    }
    async keyhandler(key, inst) {
        let success = false;
        if (key == null)
            return (true);
        let block = inst?.field.block;
        let mblock = inst?.field.block.model;
        if (key == KeyMap.dump) {
            FlightRecorder.dump();
            return (true);
        }
        if (inst == null) {
            if (key == KeyMap.lov)
                inst = this.current;
            if (key == KeyMap.calendar)
                inst = this.current;
            if (key == KeyMap.delete)
                inst = this.current;
            if (key == KeyMap.refresh)
                inst = this.current;
            if (key == KeyMap.lastquery)
                inst = this.current;
            if (key == KeyMap.enterquery)
                inst = this.current;
            if (key == KeyMap.executequery)
                inst = this.current;
            if (key == KeyMap.insert || KeyMap.insertAbove)
                inst = this.current;
            block = inst?.field.block;
            mblock = inst?.field.block.model;
        }
        if (key == KeyMap.enter) {
            if (mblock && mblock.querymode)
                key = KeyMap.executequery;
            else if (this.current?.field.block.model.querymode)
                key = KeyMap.executequery;
        }
        let frmevent = FormEvent.KeyEvent(this.parent, inst, key);
        if (!await FormEvents.raise(frmevent))
            return (false);
        if (key == KeyMap.clearform)
            return (this.clear(false));
        if (inst != null) {
            let qmode = mblock?.querymode;
            if (key == KeyMap.clearblock)
                return (inst.field.block.model.clear(true));
            if (KeyMapping.isRowNav(key)) {
                success = await block.navigateRow(key, inst);
                return (success);
            }
            if (KeyMapping.isBlockNav(key)) {
                success = await block.navigateBlock(key, inst);
                return (success);
            }
            if (KeyMapping.isFormNav(key)) {
                success = await this.navigateForm(key, inst);
                ;
                return (success);
            }
            if (key == KeyMap.escape) {
                if (inst.field.row.status == Status.qbe) {
                    this.model.cancelQueryMode(inst.field.block.model);
                    return (success);
                }
                if (inst.field.row.status == Status.new || inst.field.row.status == Status.insert)
                    key = KeyMap.delete;
            }
            if (key == KeyMap.enter) {
                if (inst.field.block.empty())
                    return (true);
                success = await block.validateRow();
                if (success)
                    success = await block.model.flush();
                return (success);
            }
            if (key == KeyMap.refresh) {
                if (qmode)
                    return (false);
                if (inst.field.block.empty())
                    return (true);
                await mblock.refresh(0, true);
                return (true);
            }
            if (key == KeyMap.lastquery) {
                if (qmode)
                    mblock.showLastQuery();
                return (true);
            }
            if (key == KeyMap.enterquery) {
                if (qmode)
                    return (true);
                if (!inst.field.block.model.queryallowed)
                    return (false);
                success = await this.model.enterQuery(inst.field.block.model);
                return (success);
            }
            if (key == KeyMap.executequery) {
                if (mblock.queryallowed) {
                    success = await this.model.executeQuery(mblock, false, true);
                    return (success);
                }
            }
            if (key == KeyMap.queryeditor) {
                if (!qmode)
                    return (false);
                if (!inst.qbeProperties.advquery)
                    return (true);
                let params = new Map();
                params.set("form", this.parent);
                params.set("field", inst.name);
                params.set("block", inst.block);
                params.set("value", inst.getValue());
                params.set("type", DataType[block.fieldinfo.get(inst.name).type]);
                params.set("properties", new FieldProperties(inst.defaultProperties));
                await this.parent.callform(Classes.AdvancedQueryClass, params);
                return (true);
            }
            if (key == KeyMap.insert) {
                if (qmode)
                    return (false);
                let ok = mblock.insertallowed;
                mblock.getMasterBlocks().forEach((blk) => { if (blk.empty)
                    ok = false; });
                if (!mblock.ctrlblk && ok)
                    await mblock.insert(false);
                return (true);
            }
            if (key == KeyMap.insertAbove) {
                if (qmode)
                    return (false);
                let ok = mblock.insertallowed;
                mblock.getMasterBlocks().forEach((blk) => { if (blk.empty)
                    ok = false; });
                if (!mblock.ctrlblk && ok)
                    mblock.insert(true);
                return (true);
            }
            if (key == KeyMap.delete) {
                if (qmode)
                    return (false);
                if (inst.field.row.status == Status.na)
                    return (false);
                let ok = mblock.deleteallowed;
                if (inst.field.row.status == Status.new)
                    ok = true;
                if (inst.field.row.status == Status.insert)
                    ok = true;
                if (!mblock.ctrlblk && ok)
                    mblock.delete();
                return (true);
            }
            // Allow Lov and Calendar to map to same key
            if (key?.signature == KeyMap.lov.signature) {
                if (mblock.empty && !qmode)
                    return (true);
                let backing = FormBacking.getBacking(this.parent);
                let lov = backing.getListOfValues(inst.block, inst.name);
                if (lov != null) {
                    if (qmode && lov.inQueryMode == false)
                        return (true);
                    if (!qmode && inst.properties.readonly && !lov.inReadOnlyMode)
                        return (true);
                    if (await this.showListOfValues(inst.block, inst.name))
                        return (true);
                }
            }
            // As with Lov
            if (key?.signature == KeyMap.calendar.signature) {
                if (mblock.empty && !qmode)
                    return (true);
                if (inst.properties.readonly)
                    return (true);
                if (await this.showDatePicker(inst.block, inst.name))
                    return (true);
            }
        }
        if (!await ApplicationHandler.instance.keyhandler(key))
            return (false);
        return (true);
    }
    async mousehandler(mevent, event, inst) {
        if (mevent == null)
            return (true);
        let frmevent = FormEvent.MouseEvent(this.parent, mevent, inst);
        if (!await FormEvents.raise(frmevent))
            return (false);
        if (!await ApplicationHandler.instance.mousehandler(mevent))
            return (false);
        return (true);
    }
    async showDatePicker(block, field, row) {
        let blk = this.getBlock(block);
        let type = blk.fieldinfo.get(field)?.type;
        if (!blk)
            return (false);
        if (!this.model.getBlock(block)?.getRecord())
            return (false);
        if (type == DataType.date || type == DataType.datetime) {
            if (!await blk.goRow(row))
                return (false);
            let value = blk.model.getValue(field);
            let params = new Map();
            let backing = FormBacking.getBacking(this.parent);
            let datecstr = backing.getDateConstraint(block, field);
            params.set("field", field);
            params.set("block", block);
            params.set("value", value);
            params.set("form", this.parent);
            params.set("constraint", datecstr);
            this.parent.callform(Classes.DatePickerClass, params);
            return (true);
        }
        return (false);
    }
    async showListOfValues(block, field, row, force) {
        let blk = this.getBlock(block);
        let params = new Map();
        let backing = FormBacking.getBacking(this.parent);
        let lov = backing.getListOfValues(block, field);
        if (!blk)
            return (false);
        if (!blk.model?.getRecord())
            return (false);
        if (lov != null) {
            if (!force) {
                // Only 1 LOV can be running
                if (FormBacking.getChildForms(this.parent, Classes.ListOfValuesClass).length > 0)
                    return (false);
            }
            if (!await blk.goRow(row))
                return (false);
            params.set("lov", lov);
            params.set("field", field);
            params.set("block", block);
            params.set("form", this.parent);
            this.parent.callform(Classes.ListOfValuesClass, params);
            return (true);
        }
        return (false);
    }
    async navigateForm(key, inst) {
        let next = null;
        switch (key) {
            case KeyMap.nextblock:
                {
                    let blks = [...this.blocks$.values()];
                    let nxt = false;
                    next = blks[blks.length - 1];
                    for (let i = 0; i < blks.length; i++) {
                        if (nxt) {
                            next = blks[i];
                            break;
                        }
                        if (blks[i] == inst.field.block)
                            nxt = true;
                    }
                    break;
                }
            case KeyMap.prevblock:
                {
                    let blks = [...this.blocks$.values()];
                    next = blks[0];
                    let nxt = false;
                    for (let i = blks.length - 1; i >= 0; i--) {
                        if (nxt) {
                            next = blks[i];
                            break;
                        }
                        if (blks[i] == inst.field.block)
                            nxt = true;
                    }
                    break;
                }
        }
        if (next)
            next.focus();
        return (next != null);
    }
    async setEventTransaction(event, block, recoff) {
        let record = null;
        if (recoff == null)
            recoff = 0;
        if (block != null) {
            if (typeof (recoff) !== "number")
                record = recoff;
            else
                record = block.model.getRecord(recoff);
        }
        return (this.model.setEventTransaction(event, block?.model, record));
    }
    endEventTransaction(event, apply) {
        this.model.endEventTransaction(event, null, apply);
    }
    event = BrowserEvent.get();
    async handleEvent(event) {
        let bubble = false;
        this.event.setEvent(event);
        if (this.event.type == "focus")
            await this.onCanvasFocus();
        if (this.event.type == "skip")
            return;
        if (this.event.type == "wait")
            await this.event.wait();
        if (this.event.waiting)
            return;
        if (this.event.accept || this.event.cancel)
            bubble = true;
        if (this.event.bubbleMouseEvent)
            bubble = true;
        if (this.event.onScrollUp)
            bubble = true;
        if (this.event.onScrollDown)
            bubble = true;
        if (this.event.onCtrlKeyDown)
            bubble = true;
        if (this.event.onFuncKey)
            bubble = true;
        this.event.preventDefault();
        if (bubble) {
            if (this.event.type.startsWith("key")) {
                let key = KeyMapping.parseBrowserEvent(this.event);
                await this.keyhandler(key);
            }
            else {
                let mevent = MouseMapParser.parseBrowserEvent(this.event);
                await this.mousehandler(mevent, event);
            }
        }
    }
    rehash(block) {
        let ordered = [];
        let form = this.parent.getView();
        let index = new Map();
        if (block) {
            // Register HTMLElements for given block
            this.getBlock(block)?.getFieldInstances(true).forEach((inst) => {
                {
                    index.set(inst.element, { block: inst.block, row: inst.row, inst: inst });
                }
            });
        }
        else {
            // Register all HTMLElements
            this.getBlocks().forEach((blk) => {
                blk.getFieldInstances(true).forEach((inst) => { index.set(inst.element, { block: inst.block, row: inst.row, inst: inst }); });
            });
        }
        // Get all elements in new order
        this.getElements(form, index, ordered);
        ordered = ordered.sort((a, b) => {
            if (a.block != b.block) {
                if (a.block > b.block)
                    return (1);
                return (-1);
            }
            if (a.row != b.row)
                return (a.row - b.row);
            return (0);
        });
        block = null;
        let row = null;
        let fields = null;
        let blockmap = null;
        let formmap = new Map();
        for (let i = 0; i < ordered.length; i++) {
            if (ordered[i].block != block) {
                row = null;
                block = ordered[i].block;
                blockmap = new Map();
                formmap.set(block, blockmap);
            }
            if (ordered[i].row != row) {
                fields = [];
                row = ordered[i].row;
                blockmap.set(row, fields);
            }
            fields.push(ordered[i].inst);
        }
        formmap.forEach((blkmap, blk) => {
            blkmap.forEach((instances, row) => { this.getBlock(blk)?.getRow(row)?.setInstances(instances); });
        });
    }
    getElements(element, index, ordered) {
        let inst = null;
        let elem = null;
        for (let i = 0; i < element.childNodes.length; i++) {
            elem = element.childNodes.item(i);
            inst = index.get(elem);
            if (inst)
                ordered.push(inst);
            else
                this.getElements(elem, index, ordered);
        }
    }
    setURL(close) {
        if (!FormsModule.showurl)
            return;
        let location = window.location;
        let params = new URLSearchParams(location.search);
        let path = location.protocol + '//' + location.host + location.pathname;
        if (!(this.parent instanceof InterfaceForm))
            close = true;
        if (close) {
            window.history.replaceState('', '', path);
            return;
        }
        let map = FormsModule.getFormPath(this.parent.name);
        let nav = FormBacking.getURLNavigable(map);
        if (map != null && nav) {
            params.set("form", map);
            window.history.replaceState('', '', path + "?" + params);
        }
    }
    async finalize() {
        this.blocks$.forEach((blk) => { blk.finalize(); });
        this.addEvents(this.parent.getView());
        this.indicators.clear();
    }
    async fireFormEvent(type, form) {
        let frmevent = FormEvent.FormEvent(type, form);
        return (FormEvents.raise(frmevent));
    }
    async fireBlockEvent(type, block) {
        let frmevent = FormEvent.BlockEvent(type, this.parent, block);
        return (FormEvents.raise(frmevent));
    }
    async fireFieldEvent(type, inst) {
        let frmevent = FormEvent.FieldEvent(type, inst);
        return (FormEvents.raise(frmevent));
    }
    addEvents(element) {
        element.addEventListener("keyup", this);
        element.addEventListener("keydown", this);
        element.addEventListener("keypress", this);
        element.addEventListener("click", this);
        element.addEventListener("dblclick", this);
        element.addEventListener("contextmenu", this);
    }
}
class Instance {
    row;
    block;
    inst;
}
