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
import { Row } from "../Row.js";
import { Block } from "../Block.js";
import { FormBacking } from "../../application/FormBacking.js";
import { EventStack } from "../../control/events/EventStack.js";
import { KeyMap, KeyMapping } from "../../control/events/KeyMap.js";
import { FlightRecorder } from "../../application/FlightRecorder.js";
import { MouseMapParser } from "../../control/events/MouseMap.js";
export class Field {
    row$ = null;
    value$ = null;
    name$ = null;
    block$ = null;
    valid$ = true;
    dirty$ = false;
    validated$ = true;
    instance$ = null;
    instances$ = [];
    static create(form, block, field, rownum) {
        let frm = FormBacking.getViewForm(form, true);
        let blk = frm.getBlock(block);
        if (blk == null)
            blk = new Block(frm, block);
        if (rownum < 0)
            rownum = -1;
        let row = blk.getRow(rownum);
        if (row == null) {
            row = new Row(blk, rownum);
            blk.addRow(row);
        }
        let fld = row.getField(field);
        if (fld == null) {
            fld = new Field(blk, row, field);
            row.addField(fld);
        }
        return (fld);
    }
    constructor(block, row, name) {
        this.row$ = row;
        this.name$ = name;
        this.block$ = block;
    }
    get row() {
        return (this.row$);
    }
    get name() {
        return (this.name$);
    }
    get block() {
        return (this.block$);
    }
    get dirty() {
        return (this.dirty$);
    }
    set dirty(flag) {
        this.dirty$ = flag;
    }
    get validated() {
        return (this.validated$);
    }
    set validated(validated) {
        this.validated$ = validated;
        if (validated) {
            this.instances$.forEach((inst) => { inst.setValidated(); });
        }
        else {
            this.row.invalidate();
        }
    }
    get mdlblock() {
        return (this.block$.model);
    }
    get valid() {
        // Though valid, check required
        if (this.valid$ && this.value$ == null) {
            let valid = true;
            this.instances$.forEach((inst) => {
                if (inst.properties.required) {
                    valid = false;
                    inst.valid = false;
                }
            });
            if (!valid)
                return (false);
        }
        return (this.valid$);
    }
    set valid(flag) {
        this.valid$ = flag;
    }
    clear() {
        this.valid = true;
        this.dirty = false;
        this.value$ = null;
        this.instances$.forEach((inst) => { inst.clear(); });
    }
    setInstanceValidity(flag) {
        this.valid = flag;
        for (let i = 0; i < this.instances$.length; i++) {
            this.instances$[i].valid = flag;
            if (flag && i == 0)
                this.block.setValidated(this.instances$[i]);
        }
    }
    addInstance(instance) {
        this.instances$.push(instance);
        this.row.addInstance(instance);
        this.block.addInstance(instance);
    }
    getInstance(entry) {
        return (this.instances$[entry]);
    }
    getInstances() {
        return (this.instances$);
    }
    getInstanceEntry(inst) {
        for (let i = 0; i < this.instances$.length; i++) {
            if (inst == this.instances$[i])
                return (i);
        }
        return (-1);
    }
    getInstancesById(id) {
        if (id == null)
            return ([]);
        let instances = [];
        id = id.toLowerCase();
        this.instances$.forEach((inst) => {
            if (inst.properties.id == id)
                instances.push(inst);
        });
        return (instances);
    }
    getInstancesByClass(clazz) {
        let instances = [];
        if (clazz == null) {
            this.instances$.forEach((inst) => { instances.push(inst); });
        }
        else {
            this.instances$.forEach((inst) => {
                if (inst.properties.hasClass(clazz))
                    instances.push(inst);
            });
        }
        return (instances);
    }
    setValue(value) {
        this.distribute(null, value, false);
        this.block.distribute(this, this.value$, this.dirty);
    }
    getValue() {
        let inst = this.instance$;
        if (inst == null)
            inst = this.instances$[0];
        return (inst.getValue());
    }
    async handleEvent(inst, brwevent) {
        if (inst.ignore == "skip") {
            if (brwevent.type == "blur" || brwevent.type == "change+blur")
                inst.ignore = null;
            return;
        }
        if (brwevent.type == "blur" && inst.ignore == "blur") {
            inst.ignore = null;
            return;
        }
        if (brwevent.type == "focus" && inst.ignore == "focus") {
            inst.ignore = null;
            return;
        }
        return (await EventStack.stack(this, inst, brwevent));
    }
    async performEvent(inst, brwevent) {
        let key = null;
        let success = null;
        FlightRecorder.add(brwevent.type + " " + inst);
        if (brwevent.type == "focus") {
            this.instance$ = inst;
            this.value$ = inst.getValue();
            success = await this.block.form.enter(inst);
            return;
        }
        if (brwevent.type == "change" || brwevent.type == "change+blur") {
            success = await this.validate(inst);
            this.distribute(inst, this.value$, this.dirty);
            this.block.distribute(this, this.value$, this.dirty);
            if (brwevent.type == "change")
                return;
        }
        if (brwevent.type == "blur" || brwevent.type == "change+blur") {
            success = await this.block.form.leave(inst);
            if (!this.valid$) {
                if (inst.getValue() == this.value$)
                    inst.valid = false;
            }
            return;
        }
        if (brwevent.modified) {
            let before = this.value$;
            let value = inst.getIntermediateValue();
            this.dirty = true;
            inst.valid = true;
            this.validated = false;
            this.distribute(inst, value, this.dirty);
            this.block.distribute(this, value, this.dirty);
            if (!await this.block.onEdit(inst)) {
                // Data has been refreshed
                if (this.value$ != before)
                    return;
                value = before;
                inst.setValue(value);
                this.distribute(inst, value, this.dirty);
                this.block.distribute(this, value, this.dirty);
            }
        }
        if (brwevent.onScrollUp) {
            key = KeyMap.nextrecord;
            inst = this.block.form.current;
        }
        if (brwevent.onScrollDown) {
            key = KeyMap.prevrecord;
            inst = this.block.form.current;
        }
        if (brwevent.type?.startsWith("key") || key != null) {
            if (brwevent.undo)
                key = KeyMap.undo;
            else if (brwevent.copy)
                key = KeyMap.copy;
            else if (brwevent.paste)
                key = KeyMap.paste;
            if (key == null)
                key = KeyMapping.parseBrowserEvent(brwevent);
            success = await this.block.form.keyhandler(key, inst);
            return;
        }
        if (brwevent.isMouseEvent) {
            let mevent = MouseMapParser.parseBrowserEvent(brwevent);
            success = await this.block.form.mousehandler(mevent, brwevent.event, inst);
            return;
        }
    }
    distribute(inst, value, dirty) {
        this.dirty = dirty;
        this.value$ = value;
        this.instances$.forEach((fi) => {
            if (fi != inst) {
                if (!dirty)
                    fi.setValue(value);
                else
                    fi.setIntermediateValue(value);
            }
        });
    }
    async validate(inst) {
        let value = inst.getValue();
        if (value instanceof Date && this.value$ instanceof Date) {
            if (value.getTime() != this.value$.getTime())
                this.dirty = true;
        }
        else {
            if (value != this.value$)
                this.dirty = true;
        }
        if (!this.dirty)
            return (true);
        this.row.invalidate();
        if (!await this.block.validateField(inst)) {
            inst.valid = false;
            this.valid = false;
            FlightRecorder.debug("@field: validateField: " + inst + " failed");
            return (false);
        }
        else {
            inst.valid = true;
            this.valid = true;
            this.dirty = false;
            this.value$ = value;
            this.validated = true;
            return (true);
        }
    }
    toString() {
        return (this.name + "[" + this.row.rownum + "] value: " + this.value$ + " dirty: " + this.dirty + " valid: " + this.valid$);
    }
}
