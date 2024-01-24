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
import { FieldProperties } from "./FieldProperties.js";
/**
 * Public interface to a Record.
 *
 * A Record is a collection of name,value pairs
 *	and represents data from a backend.
 *
 */
export class Record {
    rec$ = null;
    constructor(rec) {
        this.rec$ = rec;
    }
    /** The record number */
    get recno() {
        return (this.rec$.wrapper.index(this.rec$));
    }
    /** State of record */
    get state() {
        return (this.rec$.state);
    }
    /** Is record in an inserted state */
    get inserted() {
        return (this.rec$.inserted);
    }
    /** Is record in an updated state */
    get updated() {
        return (this.rec$.updated);
    }
    /** Is record in an deleted state */
    get deleted() {
        return (this.rec$.deleted);
    }
    /** Has the record been synchronized with the backend */
    get synchronized() {
        return (this.rec$.synched);
    }
    /** Get the response from the last operation on the backend */
    get response() {
        return (this.rec$.response);
    }
    /** Get the value of a given field */
    getValue(field) {
        field = field?.toLowerCase();
        let blk = this.rec$.block;
        let row = blk?.view.displayed(this.rec$);
        let fld = row?.getField(field);
        if (fld == null && row != null) {
            if (blk.view.row == row.rownum)
                fld = blk.view.getRow(-1)?.getField(field);
        }
        if (fld != null)
            return (fld.getValue());
        return (this.rec$.getValue(field));
    }
    /** Execute datasource default lock method */
    async lock() {
        return (this.rec$.wrapper?.lock(this.rec$, true));
    }
    /** Mark the record as locked */
    markAsLocked(flag) {
        if (flag == null)
            flag = true;
        this.rec$.locked = flag;
    }
    /**
     * Make sure the datasource marks this record updated.
     * @param field any non derived field
     */
    setDirty(field) {
        this.rec$.setDirty(field);
        this.rec$.wrapper.dirty = true;
    }
    /**
     * setAndValidate field value as if changed by a user.
     * @param field
     */
    async setAndValidate(field, value) {
        if (!await this.lock())
            return (false);
        this.setValue(field, value);
        field = field?.toLowerCase();
        let blk = this.rec$.block;
        return (blk.validateField(this.rec$, field));
    }
    /**
     * Set the field value. This operation neither locks the record, nor marks it dirty
     * @param field
     * @param value
     */
    setValue(field, value) {
        field = field?.toLowerCase();
        this.rec$.setValue(field, value);
        let blk = this.rec$.block;
        let row = blk?.view.displayed(this.rec$);
        if (row != null) {
            let fld = row.getField(field);
            if (this.rec$.dirty)
                row.invalidate();
            if (fld != null) {
                fld.setValue(value);
            }
            else {
                if (blk.view.row == row.rownum) {
                    fld = blk.view.getRow(-1)?.getField(field);
                    if (fld != null)
                        fld.setValue(value);
                }
            }
        }
    }
    /**
      * Change the tag input, span, div ... for the given field
      * @param field
      * @param tag
      */
    setTag(field, tag) {
        let props = this.getProperties(field);
        if (props)
            this.setProperties(props.setTag(tag), field);
        else
            console.error("field '" + field + "' was not found in record");
    }
    /** Set readonly state for a given field */
    setReadOnly(field, flag) {
        let props = this.getProperties(field);
        if (props)
            this.setProperties(props.setReadOnly(flag), field);
        else
            console.error("field '" + field + "' was not found in record");
    }
    /** Set required state for a given field */
    setRequired(field, flag) {
        let props = this.getProperties(field);
        if (props)
            this.setProperties(props.setRequired(flag), field);
        else
            console.error("field '" + field + "' was not found in record");
    }
    /** Set enabled state for a given field */
    setEnabled(field, flag) {
        let props = this.getProperties(field);
        if (props)
            this.setProperties(props.setEnabled(flag), field);
        else
            console.error("field '" + field + "' was not found in record");
    }
    /** Set disabled state for a given field */
    setDisabled(field, flag) {
        let props = this.getProperties(field);
        if (props)
            this.setProperties(props.setEnabled(!flag), field);
        else
            console.error("field '" + field + "' was not found in record");
    }
    /** Get the style for a given field and type */
    getStyle(field, style) {
        return (this.getProperties(field).getStyle(style));
    }
    /** Set a style for a given field */
    setStyle(field, style, value) {
        let props = this.getProperties(field);
        if (props)
            this.setProperties(props.setStyle(style, value), field);
        else
            console.error("field '" + field + "' was not found in record");
    }
    /** Remove a style for a given field */
    removeStyle(field, style) {
        let props = this.getProperties(field);
        if (props)
            this.setProperties(props.removeStyle(style), field);
        else
            console.error("field '" + field + "' was not found in record");
    }
    /** Check if a given field has class */
    hasClass(field, clazz) {
        return (this.getProperties(field).hasClass(clazz));
    }
    /** Set a class on a given field */
    setClass(field, clazz) {
        let props = this.getProperties(field);
        if (props)
            this.setProperties(props.setClass(clazz), field);
        else
            console.error("field '" + field + "' was not found in record");
    }
    /** Remove a class on a given field */
    removeClass(field, clazz) {
        let props = this.getProperties(field);
        if (props)
            this.setProperties(props.removeClass(clazz), field);
        else
            console.error("field '" + field + "' was not found in record");
    }
    /** Check if a given field has attribute */
    hasAttribute(field, attr) {
        return (this.getProperties(field).hasAttribute(attr));
    }
    /** Get the value of a given field and attribute */
    getAttribute(field, attr) {
        return (this.getProperties(field).getAttribute(attr));
    }
    /** Set an attribute on a given field */
    setAttribute(field, attr, value) {
        let props = this.getProperties(field);
        if (props)
            this.setProperties(props.setAttribute(attr, value), field);
        else
            console.error("field '" + field + "' was not found in record");
    }
    /** Remove an attribute on a given field */
    removeAttribute(field, attr) {
        let props = this.getProperties(field);
        if (props)
            this.setProperties(props.removeAttribute(attr), field);
        else
            console.error("field '" + field + "' was not found in record");
    }
    /** Get a copy of all properties for a given field */
    getProperties(field, clazz) {
        if (!field)
            return (null);
        field = field.toLowerCase();
        let blk = this.rec$.block;
        return (new FieldProperties(blk.view.getRecordProperties(this.rec$, field, clazz)));
    }
    /** Apply properties on a given field. Properties will be cloned */
    setProperties(props, field, clazz) {
        field = field?.toLowerCase();
        clazz = clazz?.toLowerCase();
        let blk = this.rec$.block;
        blk.view.setRecordProperties(this.rec$, field, clazz, props);
    }
    /** Clear all custom properties for the given record, field and class */
    clearProperties(field, clazz) {
        field = field?.toLowerCase();
        clazz = clazz?.toLowerCase();
        let blk = this.rec$.block;
        blk.view.setRecordProperties(this.rec$, field, clazz, null);
    }
    toString() {
        return (this.rec$.toString());
    }
}
