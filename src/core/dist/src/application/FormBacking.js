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
import { Form } from '../public/Form.js';
import { Block } from '../public/Block.js';
import { Properties } from './Properties.js';
import { FormsModule } from './FormsModule.js';
import { FormMetaData } from './FormMetaData.js';
import { MSGGRP } from '../messages/Internal.js';
import { Messages } from '../messages/Messages.js';
import { Form as ViewForm } from '../view/Form.js';
import { Form as ModelForm } from '../model/Form.js';
import { Block as ViewBlock } from '../view/Block.js';
import { Connection } from '../database/Connection.js';
import { Block as ModelBlock } from '../model/Block.js';
import { EventType } from '../control/events/EventType.js';
import { Form as InternalForm } from '../internal/Form.js';
import { EventStack } from '../control/events/EventStack.js';
import { FormEvent, FormEvents } from '../control/events/FormEvents.js';
export class FormBacking {
    form;
    static prev = null;
    static form = null;
    static nonav = new Set();
    static vforms = new Map();
    static mforms = new Map();
    static bdata = new Map();
    static async createForm(form, page, parameters) {
        if (typeof form === "string") {
            let path = form;
            form = form.toLowerCase();
            form = FormsModule.getComponent(form);
            if (form == null)
                throw "@Application: No components mapped to path '" + path + "'";
        }
        let factory = Properties.FactoryImplementation;
        let canvasimpl = Properties.CanvasImplementationClass;
        let canvas = new canvasimpl();
        let instance = await factory.createForm(form, parameters);
        await instance.setView(page);
        canvas.setComponent(instance);
        FormBacking.getViewForm(instance).canvas = canvas;
        await FormEvents.raise(FormEvent.FormEvent(EventType.OnNewForm, instance));
        await FormEvents.raise(FormEvent.FormEvent(EventType.PostViewInit, instance));
        return (instance);
    }
    static async showform(form, parent, parameters, container) {
        if (typeof form === "string") {
            let path = form;
            form = form.toLowerCase();
            form = FormsModule.getComponent(form);
            if (form == null)
                throw "@Application: No components mapped to path '" + path + "'";
        }
        let curr = FormBacking.getCurrentForm();
        let currw = FormBacking.getViewForm(curr);
        // check if ok to leave curr
        if (!parent) {
            if (currw && !await currw.checkLeave(currw))
                return (null);
        }
        else {
            currw?.blur(true, true);
        }
        if (container == null)
            container = FormsModule.getRootElement();
        if (!(form.prototype instanceof Form) && !(form.prototype instanceof InternalForm))
            throw "@Application: Component mapped to '" + form + "' is not a form";
        EventStack.clear();
        let factory = Properties.FactoryImplementation;
        let canvasimpl = Properties.CanvasImplementationClass;
        let canvas = new canvasimpl();
        let instance = await factory.createForm(form, parameters);
        if (!await FormEvents.raise(FormEvent.FormEvent(EventType.OnNewForm, instance)))
            return (null);
        canvas.setComponent(instance);
        container.appendChild(canvas.getView());
        FormBacking.getViewForm(instance).canvas = canvas;
        if (parent) {
            parent.canvas?.block();
            FormBacking.getBacking(instance).parent = parent;
            let backing = FormBacking.getBacking(parent);
            await FormEvents.raise(FormEvent.FormEvent(EventType.OnFormDisabled, parent));
            if (backing)
                backing.hasModalChild = true;
        }
        await FormEvents.raise(FormEvent.FormEvent(EventType.PostViewInit, instance));
        return (instance);
    }
    static getCurrentForm() {
        return (FormBacking.form);
    }
    static getPreviousForm() {
        return (FormBacking.prev);
    }
    static getRunningForms(clazz) {
        let forms = [];
        forms.push(...FormBacking.vforms.keys());
        return (forms);
    }
    static getChildForms(form, clazz) {
        let children = [];
        FormBacking.bdata.forEach((bd, frm) => {
            if (bd.parent == form) {
                if (!clazz || frm.constructor.name == clazz.name)
                    children.push(frm);
            }
        });
        return (children);
    }
    static getCurrentViewForm() {
        return (FormBacking.vforms.get(FormBacking.form));
    }
    static getPreviousViewForm() {
        return (FormBacking.vforms.get(FormBacking.prev));
    }
    static getCurrentModelForm() {
        return (FormBacking.mforms.get(FormBacking.form));
    }
    static getPreviousModelForm() {
        return (FormBacking.mforms.get(FormBacking.prev));
    }
    static setCurrentForm(form) {
        let curr = FormBacking.form;
        if (form instanceof ViewForm)
            form = form.parent;
        else if (form instanceof ModelForm)
            form = form.parent;
        if (curr != form) {
            FormBacking.form = form;
            if (form)
                FormBacking.prev = curr;
        }
    }
    static getBacking(form) {
        return (FormBacking.bdata.get(form));
    }
    static setBacking(form) {
        let back = new FormBacking(form);
        FormBacking.bdata.set(form, back);
        return (back);
    }
    static removeBacking(form) {
        FormBacking.cleanup(form);
        FormBacking.bdata.delete(form);
        if (form == FormBacking.form)
            FormBacking.form = null;
    }
    static setURLNavigable(name, nav) {
        name = name?.toLowerCase();
        if (!nav)
            this.nonav.add(name);
        else
            this.nonav.delete(name);
    }
    static getURLNavigable(name) {
        name = name?.toLowerCase();
        return (!this.nonav.has(name));
    }
    static cleanup(form) {
        FormMetaData.cleanup(form);
        FormBacking.mforms.delete(form);
        FormBacking.vforms.delete(form);
        FormBacking.getBacking(form).clearAutoGenerated();
        FormBacking.getBacking(form).removeAllEventListeners();
    }
    static getViewForm(form, create) {
        let vfrm = FormBacking.vforms.get(form);
        if (vfrm == null && create)
            vfrm = new ViewForm(form);
        return (vfrm);
    }
    static setViewForm(form, view) {
        FormBacking.vforms.set(form, view);
    }
    static getModelForm(form, create) {
        let mfrm = FormBacking.mforms.get(form);
        if (mfrm == null && create)
            mfrm = new ModelForm(form);
        return (mfrm);
    }
    static setModelForm(form, model) {
        FormBacking.mforms.set(form, model);
    }
    static getViewBlock(block, create) {
        let form = null;
        if (block instanceof Block)
            form = FormBacking.getViewForm(block.form, create);
        else
            form = FormBacking.getViewForm(block.form.parent, create);
        let blk = form.getBlock(block.name);
        if (blk == null && create)
            blk = new ViewBlock(form, block.name);
        return (blk);
    }
    static getModelBlock(block, create) {
        let form = null;
        if (block instanceof Block)
            form = FormBacking.getModelForm(block.form, create);
        else
            form = FormBacking.getModelForm(block.form.parent, create);
        let blk = form.getBlock(block.name);
        if (blk == null && create)
            blk = new ModelBlock(form, block.name);
        return (blk);
    }
    static hasTransactions(connection) {
        if (connection)
            return (connection.hasTransactions());
        let transactions = false;
        let dbconns = Connection.getAllConnections();
        for (let i = 0; i < dbconns.length; i++) {
            if (dbconns[i].hasTransactions()) {
                transactions = true;
                break;
            }
        }
        return (transactions);
    }
    static async commit() {
        let failed = false;
        let forms = [...FormBacking.mforms.values()];
        let dbconns = Connection.getAllConnections();
        for (let i = 0; i < forms.length; i++) {
            if (!await forms[i].view.validate())
                return (false);
            if (!await forms[i].flush())
                return (false);
        }
        if (!await FormEvents.raise(FormEvent.AppEvent(EventType.PreCommit)))
            return (false);
        for (let i = 0; i < dbconns.length; i++) {
            if (dbconns[i].connected()) {
                if (!await dbconns[i].commit())
                    failed = true;
            }
        }
        if (!failed) {
            for (let i = 0; i < forms.length; i++)
                forms[i].synchronize();
        }
        if (!failed)
            Messages.info(MSGGRP.TRX, 1);
        else
            Messages.warn(MSGGRP.TRX, 2);
        if (!failed) {
            if (!await FormEvents.raise(FormEvent.AppEvent(EventType.PostCommit)))
                return (false);
        }
        return (!failed);
    }
    static async rollback() {
        let failed = false;
        let forms = [...FormBacking.mforms.values()];
        let dbconns = Connection.getAllConnections();
        if (!await FormEvents.raise(FormEvent.AppEvent(EventType.PreRollback)))
            return (false);
        for (let i = 0; i < forms.length; i++) {
            if (forms[i].dirty) {
                forms[i].view.skip();
                forms[i].view.current = null;
            }
        }
        for (let i = 0; i < dbconns.length; i++) {
            if (dbconns[i].connected()) {
                if (!await dbconns[i].rollback())
                    failed = true;
            }
        }
        for (let i = 0; i < forms.length; i++) {
            if (!await forms[i].undo()) {
                Messages.warn(MSGGRP.TRX, 3, forms[i].name); // Failed to undo transactions for form %
                return (false);
            }
            forms[i].dirty = false;
        }
        if (failed)
            Messages.warn(MSGGRP.TRX, 4); // Failed to roll back transactions
        else
            Messages.info(MSGGRP.TRX, 5); // Transactions successfully rolled back
        if (!failed) {
            if (!await FormEvents.raise(FormEvent.AppEvent(EventType.PostRollback)))
                return (false);
        }
        return (!failed);
    }
    parent$ = null;
    links$ = [];
    page$ = null;
    listeners$ = [];
    autoblocks$ = [];
    haschild$ = false;
    blocks$ = new Map();
    lovs$ = new Map();
    datectr$ = new Map();
    constructor(form) {
        this.form = form;
    }
    get page() {
        return (this.page$);
    }
    set page(page) {
        this.page$ = page;
    }
    get parent() {
        return (this.parent$);
    }
    set parent(form) {
        this.parent$ = form;
    }
    get blocks() {
        return (this.blocks$);
    }
    get wasCalled() {
        return (this.parent$ != null);
    }
    get parentForm() {
        return (this.parent$);
    }
    get hasModalChild() {
        return (this.haschild$);
    }
    set hasModalChild(flag) {
        this.haschild$ = flag;
    }
    get listeners() {
        return (this.listeners$);
    }
    set listeners(listeners) {
        this.listeners$ = listeners;
    }
    getListOfValues(block, field) {
        block = block?.toLowerCase();
        field = field?.toLowerCase();
        return (this.lovs$.get(block)?.get(field));
    }
    removeListOfValues(block, field) {
        block = block?.toLowerCase();
        field = field?.toLowerCase();
        this.lovs$.get(block)?.delete(field);
    }
    setListOfValues(block, field, lov) {
        block = block?.toLowerCase();
        field = field?.toLowerCase();
        let lovs = this.lovs$.get(block);
        if (lovs == null) {
            lovs = new Map();
            this.lovs$.set(block, lovs);
        }
        lovs.set(field, lov);
    }
    getDateConstraint(block, field) {
        block = block?.toLowerCase();
        field = field?.toLowerCase();
        return (this.datectr$.get(block)?.get(field));
    }
    setDateConstraint(block, field, constr) {
        block = block?.toLowerCase();
        field = field?.toLowerCase();
        let cstrs = this.datectr$.get(block);
        if (cstrs == null) {
            cstrs = new Map();
            this.datectr$.set(block, cstrs);
        }
        cstrs.set(field, constr);
    }
    setAutoGenerated(block) {
        this.autoblocks$.push(block);
    }
    get links() {
        return (this.links$);
    }
    setLink(master, detail, orphanQueries) {
        this.links$.push({ master: master, detail: detail, orphanQueries: orphanQueries });
    }
    clearAutoGenerated() {
        this.autoblocks$.forEach((block) => {
            this.lovs$.delete(block.name);
            this.blocks.delete(block.name);
            this.datectr$.delete(block.name);
        });
    }
    hasEventListeners() {
        if (this.listeners.length > 1)
            return (true);
        if (this.listeners.length == 0)
            return (true);
        if (FormEvents.getListener(this.listeners[0]).filter?.type == EventType.PostViewInit)
            return (false);
        return (true);
    }
    removeEventListener(handle) {
        let pos = this.listeners.indexOf(handle);
        this.listeners.splice(pos, 1);
        FormEvents.removeListener(handle);
    }
    removeAllEventListeners() {
        this.listeners.forEach((handle) => { FormEvents.removeListener(handle); });
        this.listeners = [];
    }
}
