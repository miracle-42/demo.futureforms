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
import { FieldFeatureFactory } from "../../FieldFeatureFactory.js";
import { BrowserEvent } from "../../../control/events/BrowserEvent.js";
import { FieldState } from "../interfaces/FieldImplementation.js";
export class Textarea {
    trim$ = true;
    state = null;
    datamapper = null;
    properties = null;
    eventhandler = null;
    element = null;
    event = BrowserEvent.get();
    get trim() {
        return (this.trim$);
    }
    set trim(flag) {
        this.trim$ = flag;
    }
    setValidated() {
    }
    get datatype() {
        return (DataType.string);
    }
    set datatype(_type) {
        null;
    }
    create(eventhandler, _tag) {
        this.element = document.createElement("textarea");
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
    setAttributes(attributes) {
        let value = attributes.get("trim");
        if (value)
            this.trim = value.trim().toLowerCase() == "true";
    }
    clear() {
        this.element.value = "";
    }
    getValue() {
        let value = this.element.value;
        if (this.trim)
            value = value?.trim();
        if (this.datamapper != null) {
            value = this.datamapper.getValue(Tier.Backend);
            if (value == null)
                this.element.value = "";
            return (value);
        }
        return (value);
    }
    setValue(value) {
        if (this.trim && typeof value === "string")
            value = value?.trim();
        if (this.datamapper != null) {
            this.datamapper.setValue(Tier.Backend, value);
            value = this.datamapper.getValue(Tier.Frontend);
        }
        this.element.value = value;
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
        if (this.event.type == "change")
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
