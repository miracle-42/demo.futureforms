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
import { Status } from "./Row.js";
import { Properties } from "../application/Properties.js";
import { FieldProperties } from "./fields/FieldProperties.js";
export class FieldFeatureFactory {
    static lists = 0;
    static initialize(props, inst, deflt, type) {
        let exist = inst.properties;
        if (deflt) {
            switch (type) {
                case Status.qbe:
                    exist = inst.qbeProperties;
                    break;
                case Status.new:
                    exist = inst.insertProperties;
                    break;
                case Status.insert:
                    exist = inst.insertProperties;
                    break;
                case Status.update:
                    exist = inst.updateProperties;
                    break;
                default: exist = inst.defaultProperties;
            }
        }
        FieldFeatureFactory.copyBasic(exist, props);
    }
    static clone(props) {
        let clone = new FieldProperties();
        FieldFeatureFactory.copyBasic(props, clone);
        clone.id = props.id;
        clone.row = props.row;
        clone.name = props.name;
        clone.inst = props.inst;
        clone.block = props.block;
        clone.mapper = props.mapper;
        clone.listofvalues = props.listofvalues;
        return (clone);
    }
    static replace(props, inst, status) {
        let fprops = null;
        switch (status) {
            case Status.qbe:
                fprops = FieldFeatureFactory.clone(inst.qbeProperties);
                break;
            case Status.new:
                fprops = FieldFeatureFactory.clone(inst.insertProperties);
                break;
            case Status.insert:
                fprops = FieldFeatureFactory.clone(inst.insertProperties);
                break;
            case Status.update:
                fprops = FieldFeatureFactory.clone(inst.updateProperties);
                break;
            default: fprops = FieldFeatureFactory.clone(inst.properties);
        }
        FieldFeatureFactory.copyBasic(props, fprops);
        if (status == null)
            inst.applyProperties(fprops);
        else
            inst.setDefaultProperties(fprops, status);
        this.setMode(inst, fprops);
    }
    static copyBasic(exist, props) {
        props.tag = exist.tag;
        props.value = exist.value;
        props.mapper = exist.mapper;
        props.hidden = exist.hidden;
        props.enabled = exist.enabled;
        props.derived = exist.derived;
        props.readonly = exist.readonly;
        props.required = exist.required;
        props.setStyles([...exist.getStyles()]);
        props.setClasses([...exist.getClasses()]);
        props.setAttributes(new Map(exist.getAttributes()));
        props.validValues = new Map(exist.getValidValues());
    }
    static reset(tag) {
        tag.style.cssText = "";
        tag.classList.value = "";
        let attrs = tag.getAttributeNames();
        attrs.forEach((attr) => { tag.removeAttribute(attr); });
    }
    static consume(tag) {
        let props = new FieldProperties();
        let skip = ["id", "name", Properties.BindAttr, "row", "value"];
        props.tag = tag.tagName;
        props.id = tag.getAttribute("id");
        props.block = tag.getAttribute(Properties.BindAttr);
        if (props.block == null)
            throw "@FieldInstance: " + Properties.BindAttr + " must be specified";
        props.name = tag.getAttribute("name");
        if (props.name == null)
            throw "@FieldInstance: Name must be specified";
        props.value = tag.getAttribute("value");
        let row = tag.getAttribute("row");
        if (row == null)
            row = "-1";
        else if (isNaN(+row))
            throw "@FieldInstance: row: '" + row + "' is not a number";
        props.row = +row;
        if (tag instanceof HTMLInputElement || tag instanceof HTMLTextAreaElement) {
            props.hidden = tag.hidden;
            props.enabled = !tag.disabled;
            props.readonly = tag.readOnly;
            props.required = tag.required;
        }
        else if (tag instanceof HTMLSelectElement) {
            props.hidden = tag.hidden;
            props.enabled = !tag.disabled;
            props.required = tag.required;
            props.readonly = tag.hasAttribute("readonly");
            props.setValidValues(FieldFeatureFactory.getSelectOptions(tag));
        }
        else {
            props.hidden = tag.hasAttribute("hidden");
            props.enabled = !tag.hasAttribute("disabled");
            props.readonly = tag.hasAttribute("readonly");
            props.required = tag.hasAttribute("required");
        }
        props.setStyles(tag.style.cssText);
        for (let cls of tag.classList.values())
            props.setClass(cls);
        let an = tag.getAttributeNames();
        an.forEach((name) => {
            if (!skip.includes(name.toLowerCase()))
                props.setAttribute(name, tag.getAttribute(name));
        });
        if (props.hasAttribute("date"))
            props.setAttribute("type", "text");
        if (props.hasAttribute("datetime"))
            props.setAttribute("type", "text");
        if (props.hasAttribute("date") && !props.hasAttribute("size"))
            props.setAttribute("size", Properties.DateFormat.length);
        if (props.hasAttribute("datetime") && !props.hasAttribute("size"))
            props.setAttribute("size", (Properties.DateFormat + Properties.TimeFormat).length + 1);
        return (props);
    }
    static apply(inst, props) {
        let styles = "";
        let tag = inst.element;
        tag.setAttribute("name", props.name);
        tag.setAttribute(Properties.BindAttr, props.block);
        if (props.id != null)
            tag.setAttribute("id", props.id);
        if (props.row >= 0)
            tag.setAttribute("row", "" + props.row);
        props.getClasses().forEach((clazz) => { tag.classList.add(clazz); });
        props.getAttributes().forEach((value, name) => { tag.setAttribute(name, value); });
        props.getStyles().forEach((element) => { styles += element.style + ":" + element.value + ";"; });
        if (styles.length > 0)
            tag.style.cssText = styles;
        if (tag instanceof HTMLInputElement || tag instanceof HTMLTextAreaElement) {
            tag.hidden = props.hidden;
            tag.disabled = !props.enabled;
            tag.readOnly = props.readonly;
            tag.required = props.required;
            if (props.getAttribute("type")?.toLowerCase() == "checkbox")
                tag.setAttribute("value", props.value);
            if (props.getAttribute("type")?.toLowerCase() == "radio")
                tag.setAttribute("value", props.value);
            if (props.getValidValues().size > 0 && !(tag instanceof HTMLSelectElement))
                FieldFeatureFactory.createDataList(inst, props);
        }
        else if (tag instanceof HTMLSelectElement) {
            tag.hidden = props.hidden;
            tag.disabled = !props.enabled;
            tag.required = props.required;
            FieldFeatureFactory.setSelectOptions(tag, props);
            FieldFeatureFactory.setReadOnly(tag, props.readonly);
            if (props.readonly)
                tag.setAttribute("readonly", "");
        }
        else {
            tag.removeAttribute("hidden");
            tag.removeAttribute("readonly");
            tag.removeAttribute("required");
            tag.removeAttribute("disabled");
            if (props.hidden)
                tag.setAttribute("hidden", "");
            if (props.readonly)
                tag.setAttribute("readonly", "");
            if (props.required)
                tag.setAttribute("required", "");
            if (!props.enabled)
                tag.setAttribute("disabled", "");
        }
    }
    static setMode(inst, props) {
        let tag = inst.element;
        if (props == null) {
            tag.setAttribute(Properties.RecordModeAttr, "na");
            return;
        }
        if (props.getAttribute(Properties.RecordModeAttr) != null)
            return;
        if (props.readonly || !props.enabled) {
            tag.setAttribute(Properties.RecordModeAttr, "-");
            return;
        }
        if (inst.field.row.status == Status.na) {
            tag.removeAttribute(Properties.Classes.Invalid);
            tag.setAttribute(Properties.RecordModeAttr, "na");
        }
        if (inst.field.row.status == Status.qbe) {
            tag.removeAttribute(Properties.Classes.Invalid);
            tag.setAttribute(Properties.RecordModeAttr, "query");
        }
        if (inst.field.row.status == Status.update) {
            tag.removeAttribute(Properties.Classes.Invalid);
            tag.setAttribute(Properties.RecordModeAttr, "update");
        }
        if (inst.field.row.status == Status.delete) {
            tag.removeAttribute(Properties.Classes.Invalid);
            tag.setAttribute(Properties.RecordModeAttr, "deleted");
        }
        if (inst.field.row.status == Status.new || inst.field.row.status == Status.insert) {
            tag.removeAttribute(Properties.Classes.Invalid);
            tag.setAttribute(Properties.RecordModeAttr, "insert");
        }
    }
    static applyType(inst) {
        let type = null;
        let props = inst.defaultProperties;
        if (props.hasClass("date"))
            type = "date";
        if (props.hasClass("integer"))
            type = "integer";
        if (props.hasClass("decimal"))
            type = "decimal";
        if (props.hasClass("datetime"))
            type = "datetime";
        inst.element.classList.remove("date");
        inst.element.classList.remove("integer");
        inst.element.classList.remove("decimal");
        inst.element.classList.remove("datetime");
        inst.element.classList.add(type);
    }
    static createDataList(inst, props) {
        let tag = inst.element;
        let datalist = null;
        let list = props.getAttribute("list");
        if (list == null)
            list = inst.defaultProperties.getAttribute("values");
        if (list == null) {
            list = "list" + (FieldFeatureFactory.lists++);
            props.setAttribute("list", list);
            tag.setAttribute("list", list);
            inst.defaultProperties.setAttribute("values", list);
        }
        list = list.toLowerCase();
        let candidates = inst.form.getView().getElementsByTagName("list");
        for (let i = 0; i < candidates.length; i++) {
            if (candidates.item(i).id?.toLowerCase() == list.toLowerCase()) {
                datalist = candidates.item(i);
                break;
            }
        }
        if (datalist == null) {
            datalist = document.createElement("datalist");
            tag.appendChild(datalist);
            datalist.id = list;
        }
        while (datalist.options.length > 0)
            datalist.options.item(0).remove();
        props.getValidValues().forEach((value) => {
            if (value.length > 0) {
                let option = new Option();
                option.value = value;
                datalist.appendChild(option);
            }
        });
    }
    static setReadOnlyState(tag, props, flag) {
        if (flag)
            FieldFeatureFactory.setReadOnly(tag, flag);
        else if (!props.readonly && props.enabled)
            FieldFeatureFactory.setReadOnly(tag, flag);
    }
    static setEnabledState(tag, props, flag) {
        if (!flag)
            FieldFeatureFactory.setEnabled(tag, flag);
        else if (props.enabled)
            FieldFeatureFactory.setEnabled(tag, flag);
    }
    static setReadOnly(tag, flag) {
        if (tag instanceof HTMLInputElement)
            tag.readOnly = flag;
        else {
            if (flag)
                tag.setAttribute("readonly", "");
            else
                tag.removeAttribute("readonly");
        }
    }
    static setEnabled(tag, flag) {
        if (tag instanceof HTMLInputElement || tag instanceof HTMLSelectElement)
            tag.disabled = !flag;
        else {
            if (!flag)
                tag.setAttribute("disabled", "");
            else
                tag.removeAttribute("disabled");
        }
    }
    static getSelectOptions(tag) {
        let options = new Map();
        options.set("", "");
        for (let i = 0; i < tag.options.length; i++) {
            let label = tag.options.item(i).label.trim();
            let value = tag.options.item(i).value.trim();
            if (label.length > 0 || value.length > 0) {
                if (label.length == 0 && value.length != null)
                    label = value;
                options.set(label, value);
            }
        }
        return (options);
    }
    static setSelectOptions(tag, props) {
        while (tag.options.length > 0)
            tag.options.remove(0);
        tag.options.add(new Option());
        let options = [];
        props.getValidValues().forEach((label, value) => {
            if (label.length > 0 || value.length > 0) {
                let option = new Option();
                option.label = label;
                option.value = value;
                options.push(option);
            }
        });
        options.forEach((option) => tag.options.add(option));
    }
}
