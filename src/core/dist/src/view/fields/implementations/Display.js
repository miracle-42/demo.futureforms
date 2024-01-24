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
import { DataType } from "../DataType.js";
import { Tier } from "../DataMapper.js";
import { dates } from "../../../model/dates/dates.js";
import { FieldFeatureFactory } from "../../FieldFeatureFactory.js";
import { BrowserEvent } from "../../../control/events/BrowserEvent.js";
import { FieldState } from "../interfaces/FieldImplementation.js";
export class Display {
    trim$ = true;
    state = null;
    datamapper = null;
    properties = null;
    eventhandler = null;
    value$ = null;
    element = null;
    datatype$ = DataType.string;
    event = BrowserEvent.get();
    setValidated() {
    }
    get trim() {
        return (this.trim$);
    }
    set trim(flag) {
        this.trim$ = flag;
    }
    get datatype() {
        return (this.datatype$);
    }
    set datatype(type) {
        this.datatype = type;
    }
    create(eventhandler, tag) {
        this.element = document.createElement(tag);
        this.eventhandler = eventhandler;
        return (this.element);
    }
    apply(properties, init) {
        this.properties = properties;
        this.datamapper = properties.mapper;
        if (init)
            this.addEvents(this.element);
        this.setAttributes(properties.getAttributes());
    }
    clear() {
        if (this.value$ != null) {
            if (this.value$ instanceof HTMLElement)
                this.element.firstChild?.remove;
            else
                this.element.textContent = "";
        }
        this.value$ = null;
    }
    getValue() {
        if (this.datamapper != null) {
            this.value$ = this.datamapper.getValue(Tier.Backend);
            if (this.value$ == null)
                this.clear();
            return (this.value$);
        }
        if (this.trim && typeof this.value$ === "string")
            this.value$ = this.value$?.trim();
        if (this.datatype$ == DataType.boolean)
            return (this.value$?.toLowerCase() == "true");
        if (DataType[this.datatype$].startsWith("date")) {
            let value = dates.parse(this.value$);
            if (value == null)
                this.clear();
            return (value);
        }
        if (this.datatype$ == DataType.integer || this.datatype$ == DataType.decimal)
            return (+this.value$);
        return (this.value$);
    }
    setValue(value) {
        if (this.trim && typeof this.value$ === "string")
            value = value?.trim();
        if (this.datamapper != null) {
            this.datamapper.setValue(Tier.Backend, value);
            value = this.datamapper.getValue(Tier.Frontend);
        }
        if (DataType[this.datatype$].startsWith("date")) {
            if (typeof value === "number")
                value = new Date(+value);
            if (value instanceof Date)
                value = dates.format(value);
        }
        if (value == this.value$)
            return (true);
        this.clear();
        this.value$ = value;
        if (value instanceof HTMLElement) {
            let elem = this.element.firstChild;
            if (value == null) {
                if (elem != null)
                    elem.remove();
            }
            else {
                if (elem != null)
                    elem.replaceWith(value);
                else
                    this.element.appendChild(value);
            }
        }
        else {
            if (value == null)
                value = "";
            this.element.textContent = value;
        }
        return (true);
    }
    getIntermediateValue() {
        if (this.trim && typeof this.value$ === "string")
            this.value$ = this.value$?.trim();
        if (this.datamapper != null) {
            this.value$ = this.datamapper.getValue(Tier.Backend);
            if (this.value$ == null)
                this.clear();
        }
        return (this.value$);
    }
    setIntermediateValue(value) {
        if (this.trim)
            value = value?.trim();
        if (this.datamapper != null) {
            this.datamapper.setIntermediateValue(Tier.Backend, value);
            let ivalue = this.datamapper.getIntermediateValue(Tier.Frontend);
            if (ivalue == value)
                return;
            value = ivalue;
        }
        if (value == this.value$)
            return;
        this.clear();
        if (value == null)
            value = "";
        this.element.textContent = value;
    }
    getElement() {
        return (this.element);
    }
    getFieldState() {
        return (this.state);
    }
    setFieldState(state) {
        this.state = state;
        let enabled = this.properties.enabled;
        let readonly = this.properties.readonly;
        switch (state) {
            case FieldState.OPEN:
                if (enabled)
                    FieldFeatureFactory.setEnabledState(this.element, this.properties, true);
                if (!readonly)
                    FieldFeatureFactory.setReadOnlyState(this.element, this.properties, false);
                break;
            case FieldState.READONLY:
                if (enabled)
                    FieldFeatureFactory.setEnabledState(this.element, this.properties, true);
                FieldFeatureFactory.setReadOnlyState(this.element, this.properties, true);
                break;
            case FieldState.DISABLED:
                FieldFeatureFactory.setEnabledState(this.element, this.properties, false);
                break;
        }
    }
    setAttributes(attributes) {
        this.datatype$ = DataType.string;
        attributes.forEach((_value, attr) => {
            if (attr == "date")
                this.datatype$ = DataType.date;
            if (attr == "datetime")
                this.datatype$ = DataType.datetime;
            if (attr == "boolean")
                this.datatype$ = DataType.boolean;
            if (attr == "integer")
                this.datatype$ = DataType.integer;
            if (attr == "decimal")
                this.datatype$ = DataType.decimal;
        });
    }
    async handleEvent(event) {
        let bubble = false;
        this.event.setEvent(event);
        if (this.event.type == "skip")
            return;
        if (this.event.type == "wait")
            await this.event.wait();
        if (this.event.waiting)
            return;
        if (this.event.type == "focus")
            bubble = true;
        if (this.event.type == "blur")
            bubble = true;
        if (this.event.type == "keyup")
            bubble = true;
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
        if (this.event.ignore)
            return;
        if (this.event.custom)
            bubble = true;
        if (bubble)
            await this.eventhandler.handleEvent(this.event);
    }
    addEvents(element) {
        element.addEventListener("blur", this);
        element.addEventListener("focus", this);
        element.addEventListener("change", this);
        element.addEventListener("keyup", this);
        element.addEventListener("keydown", this);
        element.addEventListener("keypress", this);
        element.addEventListener("wheel", this);
        element.addEventListener("mouseup", this);
        element.addEventListener("mouseout", this);
        element.addEventListener("mousedown", this);
        element.addEventListener("mouseover", this);
        element.addEventListener("mousemove", this);
        element.addEventListener("drop", this);
        element.addEventListener("drag", this);
        element.addEventListener("dragend", this);
        element.addEventListener("dragover", this);
        element.addEventListener("dragstart", this);
        element.addEventListener("dragenter", this);
        element.addEventListener("dragleave", this);
        element.addEventListener("click", this);
        element.addEventListener("dblclick", this);
        element.addEventListener("contextmenu", this);
    }
}
