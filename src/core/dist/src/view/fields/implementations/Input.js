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
import { Formatter as DefaultFormatter } from "../Formatter.js";
import { FieldFeatureFactory } from "../../FieldFeatureFactory.js";
import { BrowserEvent } from "../../../control/events/BrowserEvent.js";
import { KeyMap, KeyMapping } from "../../../control/events/KeyMap.js";
import { FieldState } from "../interfaces/FieldImplementation.js";
var Case;
(function (Case) {
    Case[Case["upper"] = 0] = "upper";
    Case[Case["lower"] = 1] = "lower";
    Case[Case["mixed"] = 2] = "mixed";
    Case[Case["initcap"] = 3] = "initcap";
})(Case || (Case = {}));
export class Input {
    type = null;
    before = "";
    initial = "";
    int = false;
    dec = false;
    trim$ = true;
    maxlen = null;
    case = Case.mixed;
    state = null;
    placeholder = null;
    formatter = null;
    datamapper = null;
    properties = null;
    sformatter = null;
    eventhandler = null;
    element = null;
    datatype$ = DataType.string;
    event = BrowserEvent.get();
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
        this.datatype$ = type;
    }
    setValidated() {
        this.initial = this.getElementValue();
    }
    create(eventhandler, _tag) {
        this.element = document.createElement("input");
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
    clear() {
        this.setValue(null);
    }
    getValue() {
        let value = this.getElementValue();
        if (this.trim)
            value = value?.trim();
        if (this.datamapper != null) {
            value = this.datamapper.getValue(Tier.Backend);
            if (value == null)
                this.setElementValue(null);
            return (value);
        }
        if (value.length == 0)
            return (null);
        if (this.datatype$ == DataType.boolean)
            return (value.toLowerCase() == "true");
        if (DataType[this.datatype$].startsWith("date")) {
            let date = dates.parse(value);
            return (date);
        }
        if (this.datatype$ == DataType.integer || this.datatype$ == DataType.decimal)
            return (+value);
        if (this.formatter != null)
            return (this.formatter.getValue());
        if (this.sformatter != null)
            return (this.sformatter.getValue());
        if (this.properties.validValues.size > 0) {
            let keyval = null;
            this.properties.validValues.forEach((val, key) => {
                if (value == val)
                    keyval = key;
            });
            if (keyval != null)
                value = keyval;
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
        if (DataType[this.datatype$].startsWith("date")) {
            if (typeof value === "number")
                value = new Date(+value);
            if (value instanceof Date) {
                try {
                    value = dates.format(value);
                }
                catch (error) {
                    value = null;
                }
            }
        }
        if (this.datatype$ == DataType.integer || this.datatype$ == DataType.decimal) {
            if (isNaN(+value) || (this.datatype$ == DataType.integer && (value + "").includes(".")))
                value = null;
        }
        if (this.formatter != null) {
            this.formatter.setValue(value);
            if (this.formatter.isNull())
                value = null;
            else
                value = this.formatter.getValue();
        }
        if (this.sformatter != null) {
            this.sformatter.setValue(value);
            value = this.sformatter.getValue();
        }
        if (value == null)
            value = "";
        value += "";
        this.setElementValue(value);
        this.before = value;
        this.initial = value;
        return (true);
    }
    getIntermediateValue() {
        if (this.datamapper != null)
            return (this.datamapper.getIntermediateValue(Tier.Backend));
        let value = this.getElementValue();
        if (this.formatter == null) {
            if (this.trim)
                value = value?.trim();
        }
        return (value);
    }
    setIntermediateValue(value) {
        if (this.datamapper != null) {
            this.datamapper.setIntermediateValue(Tier.Backend, value);
            value = this.datamapper.getIntermediateValue(Tier.Frontend);
        }
        if (value == null)
            value = "";
        if (this.trim)
            value = value?.trim();
        if (this.formatter != null && value.length > 0) {
            this.formatter.setValue(value);
            value = this.formatter.getValue();
        }
        this.setElementValue(value);
    }
    getElement() {
        return (this.element);
    }
    setAttributes(attributes) {
        this.int = false;
        this.dec = false;
        this.case = Case.mixed;
        this.placeholder = null;
        this.datatype$ = DataType.string;
        this.type = attributes.get("type");
        if (this.type == null)
            this.type = "text";
        if (this.type == "number")
            this.datatype$ = DataType.integer;
        if (this.type == "date")
            this.datatype$ = DataType.date;
        if (this.type == "datetime")
            this.datatype$ = DataType.datetime;
        attributes.forEach((value, attr) => {
            if (attr == "trim") {
                if (value != "false")
                    this.trim = value?.trim().toLowerCase() == "true";
            }
            if (attr == "date") {
                if (value != "false")
                    this.datatype$ = DataType.date;
            }
            if (attr == "datetime") {
                if (value != "false")
                    this.datatype$ = DataType.datetime;
            }
            if (attr == "upper") {
                if (value != "false")
                    this.case = Case.upper;
            }
            if (attr == "lower") {
                if (value != "false")
                    this.case = Case.lower;
            }
            if (attr == "initcap") {
                if (value != "false")
                    this.case = Case.initcap;
            }
            if (attr == "boolean") {
                if (value != "false")
                    this.datatype$ = DataType.boolean;
            }
            if (attr == "integer") {
                if (value != "false") {
                    this.int = true;
                    this.datatype$ = DataType.integer;
                }
            }
            if (attr == "decimal") {
                if (value != "false") {
                    this.dec = true;
                    this.datatype$ = DataType.decimal;
                }
            }
            if (attr == "maxlength") {
                this.maxlen = +value;
                if (isNaN(this.maxlen))
                    this.maxlen = null;
            }
            if (attr == "placeholder")
                this.placeholder = value;
        });
        this.getFormatter(attributes);
        if (this.formatter != null) {
            this.element.type = "text";
            this.placeholder = this.formatter.placeholder;
            if (this.element.getAttribute("size") == null)
                this.element.setAttribute("size", "" + this.formatter.size());
        }
        this.element.removeAttribute("placeholder");
    }
    async handleEvent(event) {
        this.event.setEvent(event);
        let bubble = false;
        this.event.modified = false;
        if (this.event.type == "skip")
            return;
        if (this.event.type == "wait")
            await this.event.wait();
        if (this.event.waiting)
            return;
        if (this.event.undo) {
            this.event.preventDefault(true);
            let pos = this.getPosition();
            this.setElementValue(this.initial);
            if (this.formatter) {
                this.formatter.setValue(this.getElementValue());
                this.setElementValue(this.formatter.getValue());
            }
            if (this.sformatter) {
                this.sformatter.setValue(this.getElementValue());
                this.setElementValue(this.sformatter.getValue());
            }
            if (this.getElementValue().length > pos)
                this.setPosition(pos);
        }
        if (this.event.paste) {
            if (this.event.type == "keydown") {
                this.element.value = "";
            }
            else {
                let pos = this.getPosition();
                if (this.formatter) {
                    this.formatter.setValue(this.getElementValue());
                    this.setElementValue(this.formatter.getValue());
                }
                if (this.sformatter) {
                    this.sformatter.setValue(this.getElementValue());
                    this.setElementValue(this.sformatter.getValue());
                }
                if (this.getElementValue().length > pos)
                    this.setPosition(pos);
            }
        }
        if (this.event.type == "focus") {
            bubble = true;
            this.before = this.getElementValue();
            this.initial = this.getIntermediateValue();
            this.element.removeAttribute("placeholder");
        }
        if (this.formatter != null) {
            if (!this.xfixed())
                return;
        }
        if (this.sformatter != null) {
            if (!this.xformat())
                return;
        }
        if (this.event.type == "blur") {
            bubble = true;
            let value = this.getElementValue();
            if (this.datamapper)
                value = this.datamapper.getValue(Tier.Backend);
            if (value != this.initial) {
                this.setValue(value);
                this.event.type = "change+blur";
            }
        }
        if (!this.disabled && !this.readonly && this.event.type == "mouseover" && this.placeholder != null)
            this.element.setAttribute("placeholder", this.placeholder);
        if (this.event.type == "mouseout" && this.placeholder != null)
            this.element.removeAttribute("placeholder");
        this.event.preventDefault();
        if (this.int) {
            if (!this.xint())
                return;
        }
        if (this.dec) {
            if (!this.xdec())
                return;
        }
        if (this.case != Case.mixed) {
            if (!this.xcase())
                return;
        }
        if (this.event.ignore)
            return;
        if (this.event.custom)
            bubble = true;
        if (this.event.type == "change") {
            bubble = false;
            let value = this.getElementValue();
            if (this.datamapper)
                value = this.datamapper.getValue(Tier.Backend);
            if (value != this.initial) {
                bubble = true;
                this.setValue(value);
            }
        }
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
        if (this.event.accept || this.event.cancel)
            bubble = true;
        let after = this.getElementValue();
        if (this.before != after) {
            bubble = true;
            this.before = after;
            this.event.modified = true;
            if (this.datamapper != null)
                this.datamapper.setIntermediateValue(Tier.Frontend, after);
        }
        if (bubble)
            await this.eventhandler.handleEvent(this.event);
    }
    xcase() {
        if (this.type == "range")
            return (true);
        if (this.element.readOnly)
            return (true);
        if (this.event.type == "keydown" && this.event.isPrintableKey) {
            if (this.event.ctrlkey != null || this.event.funckey != null)
                return (true);
            this.event.preventDefault(true);
            let pos = this.getPosition();
            let sel = this.getSelection();
            let value = this.getElementValue();
            if (this.maxlen != null && value.length >= this.maxlen)
                return (true);
            if (sel[1] - sel[0] > 0)
                value = value.substring(0, sel[0]) + value.substring(sel[1]);
            if (pos >= value.length)
                value += this.event.key;
            else
                value = value.substring(0, pos) + this.event.key + value.substring(pos);
            if (this.case == Case.upper)
                value = value.toLocaleUpperCase();
            if (this.case == Case.lower)
                value = value.toLocaleLowerCase();
            if (this.case == Case.initcap) {
                let cap = true;
                let initcap = "";
                for (let i = 0; i < value.length; i++) {
                    if (cap)
                        initcap += value.charAt(i).toLocaleUpperCase();
                    else
                        initcap += value.charAt(i).toLocaleLowerCase();
                    cap = false;
                    if (value.charAt(i) == ' ')
                        cap = true;
                }
                value = initcap;
            }
            this.setElementValue(value);
            this.setPosition(pos + 1);
        }
        return (true);
    }
    xint() {
        if (this.type == "range")
            return (true);
        if (this.element.readOnly)
            return (true);
        let pos = this.getPosition();
        if (this.event.type == "keydown") {
            if (this.event.isPrintableKey) {
                let pass = false;
                if (this.event.key >= '0' && this.event.key <= '9')
                    pass = true;
                if (this.event.key == "-" && !this.getElementValue().includes("-") && pos == 0)
                    pass = true;
                if (this.maxlen != null && this.getElementValue().length >= this.maxlen)
                    pass = false;
                if (!pass) {
                    this.event.preventDefault(true);
                }
                else if (this.event.repeat && this.event.key != ".") {
                    let value = this.getElementValue();
                    let a = value.substring(pos);
                    let b = value.substring(0, pos);
                    this.setElementValue(b + this.event.key + a);
                    this.setPosition(++pos);
                }
            }
        }
        return (true);
    }
    xdec() {
        if (this.type == "range")
            return (true);
        if (this.element.readOnly)
            return (true);
        let pos = this.getPosition();
        if (this.event.type == "keydown") {
            if (this.event.isPrintableKey) {
                let pass = false;
                if (this.event.key >= '0' && this.event.key <= '9')
                    pass = true;
                if (this.event.key == "." && !this.getElementValue().includes("."))
                    pass = true;
                if (this.event.key == "-" && !this.getElementValue().includes("-") && pos == 0)
                    pass = true;
                if (this.maxlen != null && this.getElementValue().length >= this.maxlen)
                    pass = false;
                if (!pass) {
                    this.event.preventDefault(true);
                }
                else if (this.event.repeat && this.event.key != ".") {
                    let value = this.getElementValue();
                    let a = value.substring(pos);
                    let b = value.substring(0, pos);
                    this.setElementValue(b + this.event.key + a);
                    this.setPosition(++pos);
                }
            }
        }
        return (true);
    }
    xformat() {
        if (this.type == "range")
            return (true);
        if (this.element.readOnly)
            return (true);
        if (this.event.type == "keydown" && this.event.isPrintableKey) {
            if (this.event.ctrlkey != null || this.event.funckey != null)
                return (true);
            this.event.preventDefault(true);
            let pos = this.getPosition();
            let sel = this.getSelection();
            let value = this.getElementValue();
            if (sel[1] - sel[0] > 0)
                value = value.substring(0, sel[0]) + value.substring(sel[1]);
            if (pos >= value.length)
                value += this.event.key;
            else
                value = value.substring(0, pos) + this.event.key + value.substring(pos);
            this.sformatter.setValue(value);
            value = this.sformatter.getValue();
            this.setElementValue(value);
            this.setPosition(pos + 1);
        }
        return (true);
    }
    xfixed() {
        if (this.type == "range")
            return (true);
        if (this.element.readOnly)
            return (true);
        let force = null;
        if (this.event.key == "Insert")
            force = true;
        if (this.event.key == "Delete")
            force = true;
        this.event.preventDefault(force);
        let pos = this.getPosition();
        if (this.event.type == "focus") {
            if (this.formatter.isNull()) {
                let first = this.formatter.first();
                this.setElementValue(this.formatter.getValue());
                setTimeout(() => { this.setPosition(first); }, 0);
            }
            return (true);
        }
        if (this.event.key == "Enter") {
            this.setElementValue(this.formatter.finish());
            if (this.formatter.isNull())
                this.clear();
            return (true);
        }
        // Change should not fire because of preventDefault etc
        if (this.event.type == "blur" || this.event.type == "change") {
            this.setElementValue(this.formatter.finish());
            if (this.formatter.isNull())
                this.clear();
            return (true);
        }
        if (this.event.type == "drop") {
            this.event.preventDefault(true);
            return (true);
        }
        if ((this.event.key == "Backspace" || this.event.key == "Delete") && !this.event.modifier) {
            if (pos > 0)
                pos--;
            this.event.preventDefault(true);
            if (this.event.type == "keyup")
                return (true);
            let area = this.getSelection();
            if (area[0] == area[1])
                area[0]--;
            this.formatter.delete(area[0], area[1]);
            this.setElementValue(this.formatter.getValue());
            if (!this.formatter.modifiable(pos))
                pos = this.formatter.prev(pos) + 1;
            this.setPosition(pos);
            return (true);
        }
        if (this.event.type == "keypress" && this.event.isPrintableKey) {
            let last = this.formatter.last();
            if (pos > last)
                pos = this.formatter.prev(pos);
            if (!this.formatter.modifiable(pos)) {
                pos = this.formatter.next(pos);
                this.setPosition(pos);
            }
            let area = this.getSelection();
            if (area[1] - area[0] > 1)
                this.formatter.delete(area[0], area[1]);
            if (!this.formatter.insCharacter(pos, this.event.key)) {
                this.setElementValue(this.formatter.getValue());
                this.event.preventDefault(true);
                this.setPosition(pos);
                return (true);
            }
            this.setElementValue(this.formatter.getValue());
            let npos = this.formatter.next(pos);
            if (npos <= pos)
                npos++;
            this.setPosition(npos);
            this.event.preventDefault(true);
            return (false);
        }
        if (this.formatter && DataType[this.datatype].startsWith("date")) {
            if (KeyMapping.parseBrowserEvent(this.event) == KeyMap.now) {
                this.formatter.setValue(this.getCurrentDate());
                this.setElementValue(this.formatter.getValue());
                this.setPosition(this.formatter.first());
                return (true);
            }
        }
        return (true);
    }
    getCurrentDate() {
        return (dates.format(new Date()));
    }
    getPosition() {
        let pos = this.element.selectionStart;
        if (pos < 0)
            pos = 0;
        return (pos);
    }
    setPosition(pos) {
        if (pos < 0)
            pos = 0;
        this.element.selectionStart = pos;
        this.element.selectionEnd = pos;
    }
    getSelection() {
        let pos = [];
        pos[1] = this.element.selectionEnd;
        pos[0] = this.element.selectionStart;
        return (pos);
    }
    getElementValue() {
        return (this.element.value);
    }
    setElementValue(value) {
        if (value == null)
            value = "";
        this.element.value = value;
    }
    get disabled() {
        return (this.element.disabled);
    }
    get readonly() {
        return (this.element.readOnly);
    }
    getFormatter(attributes) {
        let impl = this.properties.formatter;
        let format = attributes.get("format");
        // custom date and datetime requires a formatter
        if (!impl && (format || attributes.has("date") || attributes.has("datetime")))
            impl = new DefaultFormatter();
        if (impl) {
            this.formatter = impl;
            this.formatter.format = format;
            this.formatter.datatype = this.datatype;
        }
        if (!impl)
            this.sformatter = this.properties.simpleformatter;
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
