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
import { DataType } from "./DataType.js";
import { MSGGRP } from "../../messages/Internal.js";
import { Messages } from "../../messages/Messages.js";
import { isClass } from "../../public/Class.js";
import { Properties } from "../../application/Properties.js";
import { FormsModule } from "../../application/FormsModule.js";
import { isFormatter, isSimpleFormatter } from "./interfaces/Formatter.js";
export class BasicProperties {
    tag$ = null;
    styles$ = [];
    classes$ = [];
    mapper$ = null;
    formatter$ = null;
    listofvalues$ = null;
    simpleformatter$ = null;
    attribs$ = new Map();
    hidden$ = false;
    enabled$ = false;
    advquery$ = true;
    derived$ = false;
    readonly$ = false;
    required$ = false;
    value$ = null;
    values$ = new Map();
    handled$ = ["id", "name", Properties.BindAttr, "row", "invalid"];
    structured$ = [
        "hidden", "enabled", "readonly", "required", "derived", "advquery",
        "value", "class", "style", "mapper", "formatter", "lov"
    ];
    get tag() {
        return (this.tag$);
    }
    set tag(tag) {
        this.tag$ = tag?.toLowerCase();
    }
    setTag(tag) {
        this.tag = tag;
        return (this);
    }
    get enabled() {
        return (this.enabled$);
    }
    set enabled(flag) {
        this.enabled$ = flag;
    }
    setEnabled(flag) {
        this.enabled = flag;
        return (this);
    }
    get readonly() {
        return (this.readonly$);
    }
    set readonly(flag) {
        this.readonly$ = flag;
    }
    setReadOnly(flag) {
        this.readonly = flag;
        return (this);
    }
    get required() {
        return (this.required$);
    }
    set required(flag) {
        this.required$ = flag;
    }
    get derived() {
        return (this.derived$);
    }
    set derived(flag) {
        this.derived$ = flag;
    }
    get advquery() {
        return (this.advquery$);
    }
    set advquery(flag) {
        this.advquery$ = flag;
    }
    setRequired(flag) {
        this.required = flag;
        return (this);
    }
    setDerived(flag) {
        this.derived = flag;
        return (this);
    }
    setAdvancedQuery(flag) {
        this.advquery = flag;
        return (this);
    }
    get hidden() {
        return (this.hidden$);
    }
    set hidden(flag) {
        this.hidden$ = flag;
    }
    setHidden(flag) {
        this.hidden = flag;
        return (this);
    }
    get styleElements() {
        return (this.styles$);
    }
    getStyle(style) {
        style = style?.toLowerCase();
        for (let i = 0; i < this.styles$.length; i++) {
            if (this.styles$[i].style == style)
                return (this.styles$[i].value);
        }
        return (null);
    }
    getStyles() {
        return (this.styles$);
    }
    setType(type) {
        let date = this.hasClass("date");
        let datetime = this.hasClass("datetime");
        this.removeClass("date");
        this.removeClass("integer");
        this.removeClass("decimal");
        this.removeClass("datetime");
        switch (type) {
            case DataType.date:
                {
                    if (!datetime)
                        this.setClass("date");
                    else
                        this.setClass("datetime");
                }
                break;
            case DataType.datetime:
                {
                    if (date)
                        this.setClass("date");
                    else
                        this.setClass("datetime");
                }
                break;
            case DataType.integer:
                this.setClass("integer");
                break;
            case DataType.decimal:
                this.setClass("decimal");
                break;
        }
        return (this);
    }
    get style() {
        let style = "";
        this.styles$.forEach((element) => { style += element.style + ":" + element.value + ";"; });
        return (style);
    }
    set styles(styles) {
        if (styles == null) {
            this.styles$ = [];
            return;
        }
        if (!(typeof styles === "string")) {
            this.styles$ = styles;
            return;
        }
        let elements = styles.split(";");
        for (let i = 0; i < elements.length; i++) {
            let element = elements[i].trim();
            if (element.length > 0) {
                let pos = element.indexOf(':');
                if (pos > 0) {
                    let style = element.substring(0, pos).trim();
                    let value = element.substring(pos + 1).trim();
                    this.setStyle(style, value);
                }
            }
        }
    }
    setStyles(styles) {
        this.styles = styles;
        return (this);
    }
    setStyle(style, value) {
        value = value?.toLowerCase();
        style = style?.toLowerCase();
        this.removeStyle(style);
        this.styles$.push({ style: style, value: value });
        return (this);
    }
    removeStyle(style) {
        style = style?.toLowerCase();
        for (let i = 0; i < this.styles$.length; i++) {
            if (this.styles$[i].style == style) {
                this.styles$.splice(i, 1);
                break;
            }
        }
        return (this);
    }
    setClass(clazz) {
        if (clazz == null)
            return (this);
        clazz = clazz.trim();
        if (clazz.includes(' ')) {
            this.setClasses(clazz);
            return (this);
        }
        clazz = clazz?.toLowerCase();
        if (!this.classes$.includes(clazz))
            this.classes$.push(clazz);
        return (this);
    }
    setClasses(classes) {
        this.classes$ = [];
        if (classes == null)
            return (this);
        if (!Array.isArray(classes))
            classes = classes.split(' ');
        for (let i = 0; i < classes.length; i++) {
            if (classes[i]?.length > 0)
                this.classes$.push(classes[i].toLowerCase());
        }
        return (this);
    }
    getClasses() {
        return (this.classes$);
    }
    hasClass(clazz) {
        clazz = clazz?.toLowerCase();
        return (this.classes$.includes(clazz));
    }
    removeClass(clazz) {
        clazz = clazz?.toLowerCase();
        let idx = this.classes$.indexOf(clazz);
        if (idx >= 0)
            this.classes$.splice(idx, 1);
        return (this);
    }
    getAttributes() {
        return (this.attribs$);
    }
    setAttributes(attrs) {
        this.attribs$ = attrs;
        return (this);
    }
    hasAttribute(attr) {
        return (this.attribs$.has(attr?.toLowerCase()));
    }
    getAttribute(attr) {
        return (this.attribs$.get(attr?.toLowerCase()));
    }
    setAttribute(attr, value) {
        attr = attr?.toLowerCase();
        if (this.handled$.includes(attr))
            return (this);
        if (this.structured$.includes(attr)) {
            let flag = true;
            if (value != null && value.toLowerCase() == "false")
                flag = false;
            switch (attr) {
                case "value":
                    this.value$ = value;
                    break;
                case "hidden":
                    this.hidden = flag;
                    break;
                case "enabled":
                    this.enabled = flag;
                    break;
                case "derived":
                    this.derived = flag;
                    break;
                case "advquery":
                    this.advquery = flag;
                    break;
                case "readonly":
                    this.readonly = flag;
                    break;
                case "required":
                    this.required = flag;
                    break;
                case "style":
                    this.setStyles(value);
                    break;
                case "class":
                    this.setClasses(value);
                    break;
                case "mapper":
                    this.setMapper(value);
                    break;
                case "lov":
                    this.setListOfValues(value);
                    break;
                case "formatter":
                    this.setFormatterType(value);
                    break;
            }
            return (this);
        }
        let val = "";
        attr = attr?.toLowerCase();
        if (value != null)
            val += value;
        this.attribs$.set(attr, val);
        return (this);
    }
    removeAttribute(attr) {
        attr = attr?.toLowerCase();
        this.attribs$.delete(attr);
        switch (attr) {
            case "value":
                this.value$ = null;
                break;
            case "hidden":
                this.hidden = false;
                break;
            case "enabled":
                this.enabled = false;
                break;
            case "derived":
                this.derived = false;
                break;
            case "advquery":
                this.advquery = true;
                break;
            case "readonly":
                this.readonly = false;
                break;
            case "required":
                this.required = false;
                break;
            case "style":
                this.setStyles(null);
                break;
            case "class":
                this.setClasses(null);
                break;
            case "mapper":
                this.setMapper(null);
                break;
            case "lov":
                this.setListOfValues(null);
                break;
            case "formatter":
                this.setFormatter(null);
                break;
        }
        return (this);
    }
    get value() {
        return (this.value$);
    }
    set value(value) {
        this.value$ = null;
        if (value != null) {
            this.value$ = value.trim();
            if (this.value$.length == 0)
                this.value$ = null;
        }
    }
    setValue(value) {
        this.value = value;
        return (this);
    }
    get validValues() {
        return (this.values$);
    }
    set validValues(values) {
        if (Array.isArray(values) || values instanceof Set) {
            this.values$ = new Map();
            values.forEach((value) => { this.values$.set(value, value); });
        }
        else
            this.values$ = values;
    }
    setValidValues(values) {
        this.validValues = values;
        return (this);
    }
    getValidValues() {
        return (this.values$);
    }
    get mapper() {
        return (this.mapper$);
    }
    set mapper(mapper) {
        this.mapper$ = mapper;
    }
    setMapper(mapper) {
        let factory = Properties.FactoryImplementation;
        if (typeof mapper === "string")
            mapper = FormsModule.getComponent(mapper);
        if (!isClass(mapper))
            this.mapper$ = mapper;
        else
            this.mapper$ = factory.createBean(mapper);
        if (this.mapper$ != null && !("getIntermediateValue" in this.mapper$)) {
            // Not an instance of DataMapper
            Messages.severe(MSGGRP.FRAMEWORK, 18, this.mapper$.constructor.name);
            this.mapper$ = null;
        }
        return (this);
    }
    get formatter() {
        return (this.formatter$);
    }
    set formatter(formatter) {
        this.formatter$ = formatter;
    }
    setFormatter(formatter) {
        let factory = Properties.FactoryImplementation;
        if (typeof formatter === "string")
            formatter = FormsModule.getComponent(formatter);
        if (!isClass(formatter))
            this.formatter$ = formatter;
        else
            this.formatter$ = factory.createBean(formatter);
        return (this);
    }
    get simpleformatter() {
        return (this.simpleformatter$);
    }
    set simpleformatter(formatter) {
        this.simpleformatter$ = formatter;
    }
    setSimpleFormatter(formatter) {
        let factory = Properties.FactoryImplementation;
        if (typeof formatter === "string") {
            let map = formatter;
            formatter = FormsModule.getComponent(map);
            if (!formatter)
                Messages.severe(MSGGRP.FRAMEWORK, 19, map); // Not mapped
        }
        if (!isClass(formatter))
            this.simpleformatter$ = formatter;
        else
            this.simpleformatter$ = factory.createBean(formatter);
        return (this);
    }
    get listofvalues() {
        return (this.listofvalues$);
    }
    set listofvalues(listofvalues) {
        this.listofvalues$ = listofvalues;
    }
    setListOfValues(listofvalues) {
        let factory = Properties.FactoryImplementation;
        if (typeof listofvalues === "string") {
            let map = listofvalues;
            listofvalues = FormsModule.getComponent(map);
            if (!listofvalues)
                Messages.severe(MSGGRP.FRAMEWORK, 19, map); // Not mapped
        }
        if (!isClass(listofvalues))
            this.listofvalues$ = listofvalues;
        else
            this.listofvalues$ = factory.createBean(listofvalues);
        return (this);
    }
    setFormatterType(formatter) {
        let impl = FormsModule.getComponent(formatter);
        if (isFormatter(impl))
            this.setFormatter(impl);
        else if (isSimpleFormatter(impl))
            this.setSimpleFormatter(impl);
    }
}
