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
import { Field } from "./Field.js";
import { Status } from "../Row.js";
import { FieldTypes } from "./FieldType.js";
import { Display } from "./implementations/Display.js";
import { CheckBox } from "./implementations/CheckBox.js";
import { Properties } from "../../application/Properties.js";
import { FieldFeatureFactory } from "../FieldFeatureFactory.js";
import { BrowserEvent } from "../../control/events/BrowserEvent.js";
export class FieldInstance {
    form$ = null;
    field$ = null;
    ignore$ = null;
    element$ = null;
    impl = null;
    properties$ = null;
    defproperties$ = null;
    insproperties$ = null;
    qbeproperties$ = null;
    clazz = null;
    constructor(form, tag) {
        this.form$ = form;
        this.properties$ = FieldFeatureFactory.consume(tag);
        this.field$ = Field.create(form, this.properties$.block, this.properties$.name, this.properties$.row);
        this.clazz = FieldTypes.get(tag.tagName, this.properties$.getAttribute("type"));
        this.impl = new this.clazz();
        this.impl.create(this, this.properties$.tag);
        this.properties.inst = this;
        this.defproperties$ = this.properties;
        this.insproperties$ = this.properties;
        this.qbeproperties$ = this.properties;
        this.element$ = this.impl.getElement();
        FieldFeatureFactory.setMode(this, null);
        this.field$.addInstance(this);
    }
    finalize() {
        let query = this.properties$.getAttribute("query");
        let insert = this.properties$.getAttribute("insert");
        this.properties$.removeAttribute("query");
        this.properties$.removeAttribute("insert");
        this.insproperties$ = FieldFeatureFactory.clone(this.properties$);
        if (insert != null) {
            let flag = insert.toLowerCase() == "true";
            this.insproperties$.setReadOnly(!flag);
        }
        if (query == null)
            query = "true";
        let flag = query.toLowerCase() == "true";
        this.qbeproperties$ = FieldFeatureFactory.clone(this.properties$);
        this.qbeproperties$.enabled = flag;
        this.qbeproperties$.required = false;
        this.qbeproperties$.readonly = !flag;
        FieldFeatureFactory.apply(this, this.properties$);
        this.impl.apply(this.properties$, true);
    }
    resetProperties() {
        let props = null;
        switch (this.field.row.status) {
            case Status.na:
                if (this.properties$ != this.defproperties$)
                    props = this.defproperties$;
                break;
            case Status.qbe:
                if (this.properties$ != this.qbeproperties$)
                    props = this.qbeproperties$;
                break;
            case Status.new:
                if (this.properties$ != this.insproperties$)
                    props = this.insproperties$;
                break;
            case Status.update:
                if (this.properties$ != this.defproperties$)
                    props = this.defproperties$;
                break;
            case Status.insert:
                if (this.properties$ != this.insproperties$)
                    props = this.insproperties$;
                break;
        }
        if (props != null)
            this.applyProperties(props);
        FieldFeatureFactory.setMode(this, this.properties$);
    }
    setDefaultProperties(props, status) {
        switch (status) {
            case Status.qbe:
                this.qbeproperties$ = props;
                break;
            case Status.new:
                this.insproperties$ = props;
                break;
            case Status.insert:
                this.insproperties$ = props;
                break;
            default: this.defproperties$ = props;
        }
        if (status != this.field.row.status)
            return;
        this.properties$ = props;
        let clazz = FieldTypes.get(props.tag, props.type);
        if (clazz == this.clazz)
            this.updateField(props);
        else
            this.changeFieldType(clazz, props);
    }
    applyProperties(props) {
        this.properties$ = props;
        let clazz = FieldTypes.get(props.tag, props.type);
        if (clazz == this.clazz)
            this.updateField(props);
        else
            this.changeFieldType(clazz, props);
    }
    // Properties changed, minor adjustments
    updateField(newprops) {
        let value = null;
        let valid = this.valid;
        if (!this.field.dirty)
            value = this.impl.getValue();
        else
            value = this.impl.getIntermediateValue();
        this.impl.apply(newprops, false);
        FieldFeatureFactory.reset(this.element);
        FieldFeatureFactory.apply(this, newprops);
        this.valid = valid;
        if (!this.field.dirty)
            this.impl.setValue(value);
        else
            this.impl.setIntermediateValue(value);
    }
    // Properties changed, build new field
    changeFieldType(clazz, newprops) {
        let value = null;
        let valid = this.valid;
        if (!this.field.dirty)
            value = this.impl.getValue();
        else
            value = this.impl.getIntermediateValue();
        this.clazz = clazz;
        this.impl = new this.clazz();
        this.impl.create(this, newprops.tag);
        let before = this.element;
        this.element$ = this.impl.getElement();
        FieldFeatureFactory.apply(this, newprops);
        this.impl.apply(newprops, true);
        before.replaceWith(this.element);
        this.valid = valid;
        if (!this.field.dirty)
            this.impl.setValue(value);
        else
            this.impl.setIntermediateValue(value);
    }
    get row() {
        return (this.properties$.row);
    }
    get form() {
        return (this.form$);
    }
    get id() {
        return (this.properties$.id);
    }
    get name() {
        return (this.properties$.name);
    }
    get block() {
        return (this.properties.block);
    }
    get field() {
        return (this.field$);
    }
    get element() {
        return (this.element$);
    }
    get datatype() {
        return (this.impl.datatype);
    }
    set datatype(type) {
        this.impl.datatype = type;
    }
    setValidated() {
        this.impl.setValidated();
    }
    get implementation() {
        return (this.impl);
    }
    get ignore() {
        return (this.ignore$);
    }
    set ignore(value) {
        this.ignore$ = value;
    }
    get valid() {
        let valid = true;
        this.element.classList.forEach((clazz) => {
            if (clazz == Properties.Classes.Invalid)
                valid = false;
        });
        return (valid);
    }
    set valid(flag) {
        if (!flag)
            this.element.classList.add(Properties.Classes.Invalid);
        else
            this.element.classList.remove(Properties.Classes.Invalid);
    }
    get properties() {
        return (this.properties$);
    }
    get defaultProperties() {
        return (this.defproperties$);
    }
    get qbeProperties() {
        return (this.qbeproperties$);
    }
    get updateProperties() {
        return (this.defproperties$);
    }
    get insertProperties() {
        return (this.insproperties$);
    }
    clear() {
        this.valid = true;
        this.impl.clear();
        this.resetProperties();
    }
    getValue() {
        return (this.impl.getValue());
    }
    setValue(value) {
        this.valid = true;
        this.field.valid = true;
        return (this.impl.setValue(value));
    }
    getIntermediateValue() {
        return (this.impl.getIntermediateValue());
    }
    setIntermediateValue(value) {
        this.valid = true;
        this.field.valid = true;
        this.impl.setIntermediateValue(value);
    }
    skip() {
        let focus = document.activeElement;
        let inst = this.impl.getElement();
        if (focus == inst) {
            this.ignore = "skip";
            inst.blur();
        }
    }
    blur(ignore) {
        if (ignore == null)
            ignore = false;
        let focus = document.activeElement;
        let inst = this.impl.getElement();
        if (focus == inst) {
            if (ignore)
                this.ignore = "blur";
            inst.blur();
            this.ignore = null;
        }
    }
    focus(ignore) {
        if (ignore == null)
            ignore = false;
        let focus = document.activeElement;
        let inst = this.impl.getElement();
        if (focus != inst) {
            if (ignore)
                this.ignore = "focus";
            let event = BrowserEvent.get();
            inst.focus();
            if (!ignore) {
                event.setFocusEvent();
                this.field.handleEvent(this, event);
            }
            this.ignore = null;
        }
    }
    hasFocus() {
        return (this.impl.getElement() == document.activeElement);
    }
    focusable(status) {
        let props = this.properties$;
        if (status != null) {
            switch (status) {
                case Status.na:
                    props = this.defproperties$;
                    break;
                case Status.qbe:
                    props = this.qbeproperties$;
                    break;
                case Status.new:
                    props = this.insproperties$;
                    break;
                case Status.insert:
                    props = this.insproperties$;
                    break;
                case Status.update:
                    props = this.defproperties$;
                    break;
            }
        }
        if (this.impl instanceof Display && props.getAttribute("tabindex") == null)
            return (false);
        if (this.impl instanceof CheckBox && props.readonly)
            return (false);
        if (props.hidden)
            return (false);
        if (!props.enabled)
            return (false);
        return (true);
    }
    editable(status) {
        if (this.impl instanceof Display)
            return (false);
        let props = this.properties$;
        if (status != null) {
            switch (status) {
                case Status.na:
                    props = this.defproperties$;
                    break;
                case Status.qbe:
                    props = this.qbeproperties$;
                    break;
                case Status.new:
                    props = this.insproperties$;
                    break;
                case Status.insert:
                    props = this.insproperties$;
                    break;
                case Status.update:
                    props = this.defproperties$;
                    break;
            }
        }
        return (!props.readonly && !props.hidden);
    }
    setFieldState(state) {
        this.impl.setFieldState(state);
    }
    async handleEvent(event) {
        return (this.field.handleEvent(this, event));
    }
    toString() {
        return (this.name + "[" + this.row + "]");
    }
}
