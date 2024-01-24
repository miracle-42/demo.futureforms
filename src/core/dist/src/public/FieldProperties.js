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
import { MSGGRP } from '../messages/Internal.js';
import { Messages } from '../messages/Messages.js';
import { BasicProperties } from '../view/fields/BasicProperties.js';
import { FieldFeatureFactory } from '../view/FieldFeatureFactory.js';
/**
 * HTML Properties used by bound fields
 */
export class FieldProperties extends BasicProperties {
    constructor(properties) {
        super();
        if (properties != null)
            FieldFeatureFactory.copyBasic(properties, this);
    }
    /** Clone the properties */
    clone() {
        return (new FieldProperties(this));
    }
    /** The tag ie. div, span, input etc */
    setTag(tag) {
        this.tag = tag;
        return (this);
    }
    /** Underlying datatype. Inherited but cannot be changed */
    setType(_type) {
        // Data type cannot be changed
        Messages.severe(MSGGRP.FIELD, 1, this.tag);
        return (this);
    }
    /** Set enabled flag */
    setEnabled(flag) {
        this.enabled = flag;
        return (this);
    }
    /** Set readonly flag */
    setReadOnly(flag) {
        this.readonly = flag;
        return (this);
    }
    /** Determines if field is bound to datasource or not. Inherited but cannot be changed */
    setDerived(flag) {
        this.derived = flag;
        return (this);
    }
    /** Set required flag */
    setRequired(flag) {
        this.required = flag;
        return (this);
    }
    /** Set hidden flag */
    setHidden(flag) {
        this.hidden = flag;
        return (this);
    }
    /** Set a style */
    setStyle(style, value) {
        super.setStyle(style, value);
        return (this);
    }
    /** Set all styles */
    setStyles(styles) {
        this.styles = styles;
        return (this);
    }
    /** Remove a style */
    removeStyle(style) {
        super.removeStyle(style);
        return (this);
    }
    /** Set a class */
    setClass(clazz) {
        super.setClass(clazz);
        return (this);
    }
    /** Set all classes */
    setClasses(classes) {
        super.setClasses(classes);
        return (this);
    }
    /** Remove a class */
    removeClass(clazz) {
        super.removeClass(clazz);
        return (this);
    }
    /** Set an attribute */
    setAttribute(attr, value) {
        super.setAttribute(attr, value);
        return (this);
    }
    /** Set all attributes */
    setAttributes(attrs) {
        super.setAttributes(attrs);
        return (this);
    }
    /** Remove an attribute */
    removeAttribute(attr) {
        super.removeAttribute(attr);
        return (this);
    }
    /** Set the value attribute */
    setValue(value) {
        this.value = value;
        return (this);
    }
    /** Set a list of valid values */
    setValidValues(values) {
        this.validValues = values;
        return (this);
    }
    /** Set a two-way data mapper */
    setMapper(mapper) {
        super.setMapper(mapper);
        return (this);
    }
    /** Set formatter */
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
