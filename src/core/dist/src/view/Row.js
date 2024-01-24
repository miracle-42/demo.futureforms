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
import { Properties } from "../application/Properties.js";
import { FieldState } from "./fields/interfaces/FieldImplementation.js";
export var Status;
(function (Status) {
    Status[Status["na"] = 0] = "na";
    Status[Status["qbe"] = 1] = "qbe";
    Status[Status["new"] = 2] = "new";
    Status[Status["update"] = 3] = "update";
    Status[Status["insert"] = 4] = "insert";
    Status[Status["delete"] = 5] = "delete";
})(Status || (Status = {}));
export class Row {
    block$ = null;
    rownum$ = null;
    validated$ = true;
    indicator$ = false;
    status$ = Status.na;
    indicators = [];
    instances = [];
    state$ = FieldState.DISABLED;
    fields = new Map();
    constructor(block, rownum) {
        this.block$ = block;
        this.rownum$ = rownum;
    }
    get block() {
        return (this.block$);
    }
    get exist() {
        return (this.status != Status.na);
    }
    get status() {
        if (this.rownum >= 0)
            return (this.status$);
        else
            return (this.block.getCurrentRow().status$);
    }
    set status(status) {
        if (this.rownum >= 0)
            this.status$ = status;
        else
            this.block.getCurrentRow().status$ = status;
    }
    get rownum() {
        return (this.rownum$);
    }
    set rownum(rownum) {
        if (rownum == this.rownum$)
            return;
        this.rownum$ = rownum;
        this.indicators.forEach((ind) => { ind.element.setAttribute("row", rownum + ""); });
        this.getFields().forEach((fld) => {
            fld.getInstances().forEach((inst) => { inst.properties.row = rownum; });
        });
    }
    setSingleRow() {
        this.rownum$ = 0;
        this.indicators.forEach((ind) => { ind.element.setAttribute("row", "0"); });
        this.getFields().forEach((fld) => {
            fld.getInstances().forEach((inst) => { inst.properties.row = 0; });
        });
    }
    setIndicator(ind) {
        this.indicators.push(ind);
    }
    setIndicatorState(state, failed) {
        let mode = "";
        if (this.rownum < 0)
            return;
        this.indicators.forEach((ind) => {
            switch (this.status) {
                case Status.na:
                    mode = "na";
                    break;
                case Status.qbe:
                    mode = "query";
                    break;
                case Status.new:
                    mode = "insert";
                    break;
                case Status.insert:
                    mode = "insert";
                    break;
                case Status.update:
                    mode = "update";
                    break;
                case Status.delete:
                    mode = "deleted";
                    break;
            }
            ind.element.setAttribute("mode", mode);
            ind.element.setAttribute("state", state);
            if (failed)
                ind.element.classList.add("failed");
            else
                ind.element.classList.remove("failed");
        });
    }
    activateIndicators(flag) {
        if (flag && this.indicator$)
            return;
        if (!flag && !this.indicator$)
            return;
        this.indicator$ = flag;
        this.indicators.forEach((ind) => {
            if (flag)
                ind.element.classList.add(Properties.Classes.RowIndicator);
            else
                ind.element.classList.remove(Properties.Classes.RowIndicator);
        });
    }
    finalize() {
        this.getFields().forEach((fld) => {
            fld.getInstances().forEach((inst) => { inst.finalize(); });
        });
    }
    getFieldState() {
        return (this.state$);
    }
    setFieldState(state) {
        this.state$ = state;
        if (state == FieldState.DISABLED)
            this.status$ = Status.na;
        this.getFieldInstances().forEach((inst) => { inst.setFieldState(state); });
    }
    get validated() {
        if (this.status == Status.new)
            return (false);
        if (this.rownum >= 0)
            return (this.validated$);
        else
            return (this.block.getCurrentRow().validated$);
    }
    set validated(flag) {
        this.validated$ = flag;
        if (flag) {
            this.getFieldInstances().forEach((inst) => { inst.valid = true; });
            if (this.rownum == this.block.row) {
                this.block.getRow(-1)?.getFieldInstances().forEach((inst) => { inst.valid = true; });
            }
        }
    }
    invalidate() {
        if (this.rownum >= 0)
            this.validated = false;
        else
            this.block.getCurrentRow().validated = false;
        if (this.status == Status.new)
            this.status = Status.insert;
    }
    async validate() {
        if (this.validated)
            return (true);
        let valid = true;
        let fields = this.getFields();
        for (let i = 0; i < fields.length; i++)
            if (!fields[i].valid)
                valid = false;
        if (this.rownum >= 0) {
            let curr = this.block.getRow(-1);
            if (curr != null) {
                fields = curr.getFields();
                for (let i = 0; i < fields.length; i++)
                    if (!fields[i].valid)
                        valid = false;
            }
        }
        else {
            fields = this.block.getCurrentRow().getFields();
            for (let i = 0; i < fields.length; i++)
                if (!fields[i].valid)
                    valid = false;
        }
        if (!valid)
            return (false);
        this.validated = await this.block.model.validateRecord();
        return (this.validated);
    }
    addField(field) {
        this.fields.set(field.name, field);
    }
    addInstance(instance) {
        this.instances.push(instance);
    }
    setInstances(instances) {
        this.instances = instances;
    }
    focusable() {
        for (let i = 0; i < this.instances.length; i++) {
            if (this.instances[i].focusable())
                return (true);
        }
        return (false);
    }
    getFieldIndex(inst) {
        return (this.getFieldInstances().indexOf(inst));
    }
    getFieldByIndex(idx) {
        return (this.getFieldInstances()[idx]);
    }
    prevField(inst) {
        let prev = -1;
        let pos = this.instances.length - 1;
        if (inst != null)
            pos = this.instances.indexOf(inst) - 1;
        for (let i = pos; i >= 0; i--) {
            if (this.instances[i].focusable()) {
                prev = i;
                break;
            }
        }
        if (prev < 0) {
            if (this.rownum >= 0) {
                let current = this.block.getRow(-1);
                if (current != null && current.focusable())
                    return (current.prevField(null));
            }
            else {
                let mrow = this.block.getCurrentRow();
                if (mrow != null && mrow.focusable())
                    return (mrow.prevField(null));
            }
        }
        if (prev < 0) {
            for (let i = this.instances.length - 1; i >= 0; i--) {
                if (this.instances[i].focusable())
                    return (this.instances[i]);
            }
        }
        return (this.instances[prev]);
    }
    nextField(inst) {
        let pos = 0;
        let next = -1;
        if (inst != null)
            pos = this.instances.indexOf(inst) + 1;
        for (let i = pos; i < this.instances.length; i++) {
            if (this.instances[i].focusable()) {
                next = i;
                break;
            }
        }
        if (next < 0) {
            if (this.rownum >= 0) {
                let current = this.block.getRow(-1);
                if (current != null && current.focusable())
                    return (current.nextField(null));
            }
            else {
                let mrow = this.block.getCurrentRow();
                if (mrow != null && mrow.focusable())
                    return (mrow.nextField(null));
            }
        }
        if (next < 0) {
            for (let i = 0; i < this.instances.length; i++) {
                if (this.instances[i].focusable())
                    return (this.instances[i]);
            }
        }
        return (this.instances[next]);
    }
    getField(name) {
        return (this.fields.get(name));
    }
    getFields() {
        let fields = [];
        this.fields.forEach((fld) => { fields.push(fld); });
        return (fields);
    }
    clear() {
        this.activateIndicators(false);
        this.setIndicatorState("na", false);
        this.getFields().forEach((fld) => { fld.clear(); });
    }
    setState(state) {
        this.status = state;
        this.instances.forEach((inst) => { inst.resetProperties(); });
    }
    distribute(field, value, dirty) {
        this.fields.get(field)?.distribute(null, value, dirty);
    }
    swapInstances(inst1, inst2) {
        let instances = [];
        for (let i = 0; i < this.instances.length; i++) {
            switch (this.instances[i]) {
                case inst1:
                    instances.push(inst2);
                    break;
                case inst2:
                    instances.push(inst1);
                    break;
                default: instances.push(this.instances[i]);
            }
        }
        this.instances = instances;
    }
    getFieldInstances() {
        let instances = [];
        this.getFields().forEach((field) => { instances.push(...field.getInstances()); });
        return (instances);
    }
    getFirstInstance(status) {
        let flds = this.getFields();
        for (let f = 0; f < flds.length; f++) {
            for (let i = 0; i < flds[f].getInstances().length; i++) {
                let inst = flds[f].getInstance(i);
                if (inst.focusable(status))
                    return (inst);
            }
        }
        return (null);
    }
    getFirstEditableInstance(status) {
        let flds = this.getFields();
        for (let f = 0; f < flds.length; f++) {
            for (let i = 0; i < flds[f].getInstances().length; i++) {
                let inst = flds[f].getInstance(i);
                if (inst.editable(status))
                    return (inst);
            }
        }
        return (null);
    }
}
