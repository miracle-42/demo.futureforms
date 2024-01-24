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
import { Alert } from '../application/Alert.js';
import { MSGGRP } from '../messages/Internal.js';
import { isClass } from '../public/Class.js';
import { Framework } from '../application/Framework.js';
import { Level, Messages } from '../messages/Messages.js';
import { Properties } from '../application/Properties.js';
import { EventType } from '../control/events/EventType.js';
import { FormBacking } from '../application/FormBacking.js';
import { FormEvent, FormEvents } from '../control/events/FormEvents.js';
/*
 * This is an exact copy of the public form. Its sole purpose is to circumvent:
 * ReferenceError: Cannot access 'Form' before initialization
 * when calling internal forms from public forms
 */
/**
 * The form object links html and business logic.
 *
 * A form consists of blocks that links to backend data.
 * The form can hold all necessary code, LOV's etc. But in general
 * generic code for blocks should be put at the block level to ensure reuse.
 *
 */
export class Form {
    title = "";
    moveable = false;
    resizable = false;
    initiated = new Date();
    parameters = new Map();
    constructor(page) {
        page = Framework.prepare(page);
        FormBacking.setBacking(this).page = page;
    }
    get name() {
        return (this.constructor.name.toLowerCase());
    }
    /** The canvas points to the html associated with the form */
    get canvas() {
        return (FormBacking.getViewForm(this)?.canvas);
    }
    /** Get all blocks on the form */
    get blocks() {
        return (Array.from(FormBacking.getBacking(this).blocks.values()));
    }
    /** Remove the form from it's parent element */
    hide() {
        this.canvas.remove();
    }
    /** Attach the form to it's previous parent */
    show() {
        this.canvas.restore();
        this.focus();
    }
    /** Remove the form from it's parent element (same as hide) */
    dettach() {
        this.canvas.remove();
    }
    /** Attach the form to this element */
    attach(parent) {
        parent.appendChild(this.canvas.getView());
    }
    /** Clears the form. If force, no validation will take place and changes will be ignored */
    async clear(force) {
        if (force)
            FormBacking.getModelForm(this)?.clear();
        return (FormBacking.getViewForm(this)?.clear(!force));
    }
    focus() {
        FormBacking.getViewForm(this)?.focus();
    }
    getCurrentBlock() {
        return (this.getBlock(FormBacking.getViewForm(this)?.block?.name));
    }
    /** Requires the block using the current filter. Often used with sorting */
    async reQuery(block) {
        block = block?.toLowerCase();
        let blk = this.getBlock(block);
        if (blk == null) {
            // Block does not exist
            Messages.severe(MSGGRP.FORM, 1, block);
            return (false);
        }
        return (blk.reQuery());
    }
    /** Enter the Query By Example mode for the specified block (and children)*/
    async enterQueryMode(block) {
        block = block?.toLowerCase();
        let blk = this.getBlock(block);
        if (blk == null) {
            // Block does not exist
            Messages.severe(MSGGRP.FORM, 1, block);
            return (false);
        }
        return (blk.enterQueryMode());
    }
    /** Execute query for the specified block (and children) */
    async executeQuery(block) {
        block = block?.toLowerCase();
        let blk = this.getBlock(block);
        if (blk == null) {
            // Block does not exist
            Messages.severe(MSGGRP.FORM, 1, block);
            return (false);
        }
        return (blk.executeQuery());
    }
    /** Show the datepicker popup */
    showDatePicker(block, field, row) {
        block = block?.toLowerCase();
        field = field?.toLowerCase();
        FormBacking.getViewForm(this).showDatePicker(block, field, row);
    }
    /** Show the LOV associated with the block, field. Normally only 1 LOV can be active, force overrules this rule */
    showListOfValues(block, field, row) {
        block = block?.toLowerCase();
        field = field?.toLowerCase();
        FormBacking.getViewForm(this).showListOfValues(block, field, row);
    }
    /** Simulate keystroke from a field. The field is located from the block, field an optionally css-class*/
    async sendkey(key, block, field, clazz) {
        return (FormBacking.getViewForm(this).sendkey(key, block, field, clazz));
    }
    /** Link 2 blocks (master detail) on specified keys. If not orphan, the child block will not be part of QBE */
    link(master, detail, orphanQueries) {
        if (orphanQueries == null)
            orphanQueries = true;
        FormBacking.getBacking(this).setLink(master, detail, orphanQueries);
    }
    async goBlock(block) {
        return (this.getBlock(block)?.focus());
    }
    async goField(block, field, clazz) {
        return (this.getBlock(block)?.goField(field, clazz));
    }
    /** Handle fine message */
    fine(grpno, errno, ...args) {
        Messages.fine(grpno, errno, args);
    }
    /** Handle info message */
    info(grpno, errno, ...args) {
        Messages.info(grpno, errno, args);
    }
    /** Handle warning message */
    warn(grpno, errno, ...args) {
        Messages.warn(grpno, errno, args);
    }
    /** Handle severe message */
    severe(grpno, errno, ...args) {
        Messages.severe(grpno, errno, args);
    }
    /** Popup a message */
    alert(msg, title, level) {
        if (!level)
            level = Level.info;
        switch (level) {
            case Level.info:
                Alert.message(msg, title);
                break;
            case Level.warn:
                Alert.warning(msg, title);
                break;
            case Level.severe:
                Alert.fatal(msg, title);
                break;
        }
    }
    /** Has the form been validated, and is everthing consistent */
    get valid() {
        if (FormBacking.getModelForm(this).eventTransaction.running() > 0)
            return (false);
        return (FormBacking.getViewForm(this).validated());
    }
    /** Validates all user input */
    async validate() {
        return (FormBacking.getViewForm(this).validate());
    }
    /** Returns the canvas html-element */
    getView() {
        let view = this.canvas?.getView();
        if (view != null)
            return (view);
        else
            return (FormBacking.getBacking(this).page);
    }
    /** Returns the canvas view (x,y,h,w) */
    getViewPort() {
        return (this.canvas.getViewPort());
    }
    /** Sets the canvas view (x,y,h,w) */
    setViewPort(view) {
        this.canvas.setViewPort(view);
    }
    /** Returns the canvas parent view (x,y,h,w) */
    getParentViewPort() {
        return (this.canvas.getParentViewPort());
    }
    getBlock(block) {
        return (FormBacking.getBacking(this).blocks.get(block?.toLowerCase()));
    }
    /** Set the datasource for the given block */
    setDataSource(block, source) {
        FormBacking.getModelForm(this, true).setDataSource(block?.toLowerCase(), source);
    }
    /** Get the LOV for the given block and field */
    getListOfValues(block, field) {
        return (FormBacking.getBacking(this).getListOfValues(block, field));
    }
    /** Remove the LOV for the given block and field */
    removeListOfValues(block, field) {
        if (!Array.isArray(field))
            field = [field];
        for (let i = 0; i < field.length; i++)
            FormBacking.getBacking(this).removeListOfValues(block, field[i]);
    }
    /** Set the LOV for the given block, field or fields */
    setListOfValues(lov, block, field) {
        if (!Array.isArray(field))
            field = [field];
        if (isClass(lov)) {
            let factory = Properties.FactoryImplementation;
            lov = factory.createBean(lov);
        }
        for (let i = 0; i < field.length; i++)
            FormBacking.getBacking(this).setListOfValues(block, field[i], lov);
    }
    /** Set the date constraint ie exclude weekends and holidays from the datepicker */
    setDateConstraint(datecstr, block, field) {
        if (!Array.isArray(field))
            field = [field];
        for (let i = 0; i < field.length; i++)
            FormBacking.getBacking(this).setDateConstraint(block, field[i], datecstr);
    }
    /** Get the value of a given block, field */
    getValue(block, field) {
        return (this.getBlock(block)?.getValue(field));
    }
    /** Set the value of a given block, field */
    setValue(block, field, value) {
        this.getBlock(block)?.setValue(field, value);
    }
    /** Flush all changes to the backend */
    async flush() {
        return (FormBacking.getModelForm(this).flush());
    }
    /** Call another form in non modal mode */
    async showform(form, parameters, container) {
        if (!await this.validate())
            return (null);
        return (FormBacking.showform(form, null, parameters, container));
    }
    /** Call another form in modal mode */
    async callform(form, parameters, container) {
        return (FormBacking.showform(form, this, parameters, container));
    }
    /** After changes to the HTML, reindexing is necessary */
    reIndexFieldOrder() {
        FormBacking.getViewForm(this).rehash();
    }
    /** 'Labels' that points to fields can be repositioned by the user */
    startFieldDragging() {
        let label = Framework.getEvent().target;
        FormBacking.getViewForm(this).dragfields(label);
    }
    /** Replace the HTML. Change everything, delete all blocks and create new etc */
    async setView(page) {
        let canvas = this.canvas;
        let back = FormBacking.getBacking(this);
        if (page == null) {
            page = "";
            if (back.page == null)
                return;
        }
        if (canvas != null) {
            if (!this.validate()) {
                Messages.warn(MSGGRP.FORM, 2); // Form must be validated
                return;
            }
            if (FormBacking.getBacking(this).hasEventListeners())
                Messages.fine(MSGGRP.FORM, 2); // Replacing view will remove all event listeners
            FormBacking.cleanup(this);
        }
        page = Framework.prepare(page);
        Framework.parse(this, page);
        back.page = page;
        if (canvas != null) {
            canvas.replace(page);
            FormBacking.getViewForm(this, true).canvas = canvas;
        }
        await FormBacking.getViewForm(this, true).finalize();
        await FormBacking.getModelForm(this, true).finalize();
    }
    /** Close the form. If force no validation will take place */
    async close(force) {
        let vform = FormBacking.getViewForm(this);
        if (vform == null)
            return (true);
        if (!force && !await FormBacking.getModelForm(this).checkEventTransaction(EventType.OnCloseForm, null))
            return (false);
        if (!force && !await FormEvents.raise(FormEvent.FormEvent(EventType.OnCloseForm, this)))
            return (false);
        if (!await this.clear(force))
            return (false);
        this.canvas.close();
        let backing = FormBacking.getBacking(this);
        let parent = backing.parent;
        if (parent != null) {
            await FormEvents.raise(FormEvent.FormEvent(EventType.OnFormEnabled, parent));
            parent.canvas?.unblock();
            parent.focus();
            if (backing)
                backing.hasModalChild = false;
        }
        if (!force && !await FormEvents.raise(FormEvent.FormEvent(EventType.PostForm, this)))
            return (false);
        vform.setURL(true);
        FormBacking.removeBacking(this);
        if (force)
            return (true);
        let success = await FormEvents.raise(FormEvent.FormEvent(EventType.PostCloseForm, this));
        return (success);
    }
    /** Remove an eventlistener. This should also be done before setView is called */
    removeEventListener(handle) {
        FormBacking.getBacking(this).removeEventListener(handle);
    }
    /** Add an eventlistener */
    addEventListener(method, filter) {
        let handle = FormEvents.addListener(this, this, method, filter);
        FormBacking.getBacking(this).listeners.push(handle);
        return (handle);
    }
}
