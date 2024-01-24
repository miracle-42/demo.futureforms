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
export class Radio {
    state = null;
    datamapper = null;
    properties = null;
    eventhandler = null;
    value$ = null;
    checked = null;
    element = null;
    datatype$ = DataType.string;
    event = BrowserEvent.get();
    setValidated() {
    }
    get datatype() {
        return (this.datatype$);
    }
    set datatype(type) {
        this.datatype = type;
    }
    create(eventhandler, _tag) {
        this.element = document.createElement("input");
        this.eventhandler = eventhandler;
        return (this.element);
    }
    apply(properties, init) {
        this.properties = properties;
        this.checked = properties.value;
        this.datamapper = properties.mapper;
        if (init)
            this.addEvents(this.element);
        this.setAttributes(properties.getAttributes());
    }
    clear() {
        this.value$ = null;
        this.element.checked = false;
    }
    getValue() {
        if (this.datamapper != null) {
            this.value$ = this.datamapper.getValue(Tier.Backend);
            if (this.value$ == null)
                this.element.checked = false;
            return (this.value$);
        }
        if (this.datatype$ == DataType.boolean)
            return (("" + this.value$).toLowerCase() == "true");
        if (DataType[this.datatype$].startsWith("date")) {
            let value = dates.parse(this.value$);
            if (value == null)
                this.element.checked = false;
            return (value);
        }
        if (this.datatype$ == DataType.integer || this.datatype$ == DataType.decimal)
            return (+this.value$);
        return (this.value$);
    }
    setValue(value) {
        if (this.datamapper != null) {
            this.datamapper.setValue(Tier.Backend, value);
            value = this.datamapper.getValue(Tier.Frontend);
        }
        if (this.datatype$ == DataType.boolean) {
            value = (("" + value).toLowerCase() == "true");
        }
        if (DataType[this.datatype$].startsWith("date")) {
            if (typeof value === "number")
                value = new Date(+value);
            if (value instanceof Date)
                value = dates.format(value);
        }
        this.value$ = value;
        let comp = "";
        if (value != null)
            comp = value + "";
        this.element.checked = (comp == this.checked);
        return (true);
    }
    getIntermediateValue() {
        return (this.getValue());
    }
    setIntermediateValue(value) {
        this.setValue(value);
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
        // Radio ignores readonly
        let readonly = this.element.hasAttribute("readonly");
        if (readonly && event.type == "click") {
            event.preventDefault();
            return;
        }
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
        if (this.event.type == "change") {
            bubble = true;
            this.value$ = this.getElementValue();
            if (!this.element.checked)
                this.value$ = null;
        }
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
    getElementValue() {
        return (this.element.value);
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
