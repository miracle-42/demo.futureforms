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
import { BasicProperties } from "./BasicProperties.js";
export class FieldProperties extends BasicProperties {
    row$ = -1;
    id$ = null;
    name$ = null;
    block$ = null;
    inst$ = null;
    get id() {
        return (this.id$);
    }
    set id(id) {
        this.id$ = null;
        if (id != null) {
            this.id$ = id.trim().toLowerCase();
            if (this.id$.length == 0)
                this.id$ = null;
        }
    }
    get type() {
        return (this.inst$.element.getAttribute("type"));
    }
    get name() {
        return (this.name$);
    }
    set name(name) {
        this.name$ = null;
        if (name != null) {
            this.name$ = name.trim().toLowerCase();
            if (this.name$.length == 0)
                this.name$ = null;
        }
    }
    get block() {
        return (this.block$);
    }
    set block(block) {
        this.block$ = null;
        if (block != null) {
            this.block$ = block.trim().toLowerCase();
            if (this.block$.length == 0)
                this.block$ = null;
        }
    }
    get row() {
        return (this.row$);
    }
    set row(row) {
        if (row < 0)
            this.row$ = -1;
        else
            this.row$ = row;
    }
    get inst() {
        return (this.inst$);
    }
    set inst(inst) {
        this.inst$ = inst;
    }
    setTag(tag) {
        this.tag = tag;
        return (this);
    }
    setType(type) {
        super.setType(type);
        return (this);
    }
    setEnabled(flag) {
        this.enabled = flag;
        return (this);
    }
    setDisabled(flag) {
        this.setEnabled(!flag);
        return (this);
    }
    setReadOnly(flag) {
        this.readonly = flag;
        return (this);
    }
    setRequired(flag) {
        this.required = flag;
        return (this);
    }
    setHidden(flag) {
        this.hidden = flag;
        return (this);
    }
    setStyles(styles) {
        this.styles = styles;
        return (this);
    }
    removeStyle(style) {
        super.removeStyle(style);
        return (this);
    }
    setClass(clazz) {
        super.setClass(clazz);
        return (this);
    }
    setClasses(classes) {
        super.setClasses(classes);
        return (this);
    }
    removeClass(clazz) {
        super.removeClass(clazz);
        return (this);
    }
    setAttribute(attr, value) {
        super.setAttribute(attr, value);
        return (this);
    }
    setAttributes(attrs) {
        super.setAttributes(attrs);
        return (this);
    }
    removeAttribute(attr) {
        super.removeAttribute(attr);
        return (this);
    }
    setValue(value) {
        this.value = value;
        return (this);
    }
    setValidValues(values) {
        this.validValues = values;
        return (this);
    }
    setMapper(mapper) {
        super.setMapper(mapper);
        return (this);
    }
    setFormatter(formatter) {
        super.setFormatter(formatter);
        return (this);
    }
    /** Set simple formatter */
    setSimpleFormatter(formatter) {
        super.setSimpleFormatter(formatter);
        return (this);
    }
    /** Set listofvalues */
    setListOfValues(listofvalues) {
        super.setListOfValues(listofvalues);
        return (this);
    }
}
