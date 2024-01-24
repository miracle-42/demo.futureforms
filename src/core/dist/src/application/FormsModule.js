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
import { Alert } from './Alert.js';
import { Form } from '../public/Form.js';
import { Framework } from './Framework.js';
import { Components } from './Components.js';
import { FormBacking } from './FormBacking.js';
import { dates } from '../model/dates/dates.js';
import { Level, Messages } from '../messages/Messages.js';
import { Loading } from '../internal/forms/Loading.js';
import { EventType } from '../control/events/EventType.js';
import { KeyMap, KeyMapping } from '../control/events/KeyMap.js';
import { FormEvent, FormEvents } from '../control/events/FormEvents.js';
import { ApplicationHandler } from '../control/events/ApplicationHandler.js';
/**
 * The starting point or boot-strap of a FutureForms application
 */
export class FormsModule {
    static root$;
    static flush$;
    static showurl$ = false;
    static instance$ = null;
    /** Static method to return the singleton */
    static get() {
        if (FormsModule.instance$ == null)
            FormsModule.instance$ = new FormsModule();
        return FormsModule.instance$;
    }
    /** Whether or not to display the active form in the url */
    static get showurl() {
        return (FormsModule.showurl$);
    }
    /** Whether or not to display the active form in the url */
    static set showurl(flag) {
        FormsModule.showurl$ = flag;
    }
    /** Flush when leaving row or block */
    static get defaultFlushStrategy() {
        if (FormsModule.flush$ == null)
            FormsModule.flush$ = FlushStrategy.Block;
        return (FormsModule.flush$);
    }
    /** Flush when leaving row or block */
    static set defaultFlushStrategy(strategy) {
        FormsModule.flush$ = strategy;
    }
    /** The root element to which 'popup' forms will be added (default document.body) */
    static getRootElement() {
        if (!FormsModule.root$)
            return (document.body);
        return (FormsModule.root$);
    }
    /** The root element to which 'popup' forms will be added (default document.body) */
    static setRootElement(root) {
        FormsModule.root$ = root;
    }
    /** Make a Form navigable directly via the URL */
    static setURLNavigable(name, nav) {
        FormBacking.setURLNavigable(name, nav);
    }
    /** Get the latest javascript event */
    static getJSEvent() {
        return (Framework.getEvent());
    }
    /** Map a component to string (or the name of the class) */
    static mapComponent(clazz, path) {
        if (clazz == null)
            return;
        if (path == null)
            path = clazz.name;
        path = path.toLowerCase();
        Components.classmap.set(path, clazz);
        Components.classurl.set(clazz.name.toLowerCase(), path);
    }
    /** Get the string a given class or class-name is mapped to */
    static getFormPath(clazz) {
        if (clazz == null)
            return (null);
        if (typeof clazz != "string")
            clazz = clazz.name;
        return (Components.classurl.get(clazz.toLowerCase()));
    }
    /** Get the component a given path is mapped to */
    static getComponent(path) {
        return (Components.classmap.get(path.toLowerCase()));
    }
    /** Update the internal KeyMap based on a new KeyMap */
    static updateKeyMap(map) {
        KeyMapping.update(map);
    }
    /** Open the form defined in the URL */
    static OpenURLForm() {
        let location = window.location;
        let params = new URLSearchParams(location.search);
        if (params.get("form") != null) {
            let form = params.get("form");
            let clazz = FormsModule.getComponent(form);
            if (!FormBacking.getURLNavigable(form))
                return (false);
            if (clazz != null && clazz.prototype instanceof Form) {
                FormsModule.showform(clazz);
                return (true);
            }
        }
        return (false);
    }
    /** Retrive the current active Form */
    static getCurrentForm() {
        return (FormBacking.getCurrentForm());
    }
    /** Retrive the current active HTMLElement */
    static getCurrentField() {
        let form = FormBacking.getViewForm(FormBacking.getCurrentForm());
        if (form.current?.hasFocus())
            return (form.current.implementation.getElement());
        else
            return (null);
    }
    /** Emulate a user key-stroke */
    static async sendkey(key) {
        if (typeof key === "string")
            key = KeyMap.from(key);
        let form = FormBacking.getCurrentViewForm();
        if (form != null)
            return (form.keyhandler(key));
        return (ApplicationHandler.instance.keyhandler(key));
    }
    /** Whether a given DatabaseConnection has outstanding transactions */
    static hasTransactions(connection) {
        return (FormBacking.hasTransactions(connection["conn$"]));
    }
    /** Issue commit on all DatabaseConnection's */
    static async commit() {
        return (FormBacking.commit());
    }
    /** Issue rollback on all DatabaseConnection's */
    static async rollback() {
        return (FormBacking.rollback());
    }
    /** Handle fine message */
    static fine(grpno, errno, ...args) {
        Messages.fine(grpno, errno, args);
    }
    /** Handle info message */
    static info(grpno, errno, ...args) {
        Messages.info(grpno, errno, args);
    }
    /** Handle warning message */
    static warn(grpno, errno, ...args) {
        Messages.warn(grpno, errno, args);
    }
    /** Handle severe message */
    static severe(grpno, errno, ...args) {
        Messages.severe(grpno, errno, args);
    }
    /** Popup a message */
    static alert(msg, title, level) {
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
    /** Get all active forms */
    static getRunningForms() {
        return (FormBacking.getRunningForms());
    }
    /** Create a form based on the page */
    static async createform(form, page, parameters) {
        return (FormBacking.createForm(form, page, parameters));
    }
    /** Create and attach a form to the container (or root-element) */
    static async showform(form, parameters, container) {
        return (FormBacking.showform(form, null, parameters, container));
    }
    /** Show the blocking 'loading' html */
    static showLoading(message) {
        return (Loading.show(message));
    }
    /** Remove the blocking 'loading' html */
    static hideLoading(thread) {
        Loading.hide(thread);
    }
    /** Raise a Custom Event */
    static async raiseCustomEvent(source) {
        let frmevent = FormEvent.AppEvent(EventType.Custom, source);
        return (FormEvents.raise(frmevent));
    }
    /** Remove an event-listener */
    static removeEventListener(id) {
        FormEvents.removeListener(id);
    }
    /** Utility. Use with care since javascript is actually single-threaded */
    static sleep(ms) {
        return (new Promise(resolve => setTimeout(resolve, ms)));
    }
    constructor() {
        dates.validate();
        KeyMapping.init();
        Messages.language = "us";
        ApplicationHandler.init();
        FormsModule.instance$ = this;
    }
    /** Parse a given Element to find and process FutureForms elements */
    parse(doc) {
        if (doc == null)
            doc = document.body;
        Framework.parse(this, doc);
    }
    /** Add an event-listener */
    addEventListener(method, filter) {
        return (FormEvents.addListener(null, this, method, filter));
    }
    /** Add an event-listener on a given Form */
    addFormEventListener(form, method, filter) {
        return (FormEvents.addListener(form, this, method, filter));
    }
}
export var FlushStrategy;
(function (FlushStrategy) {
    FlushStrategy[FlushStrategy["Row"] = 0] = "Row";
    FlushStrategy[FlushStrategy["Block"] = 1] = "Block";
})(FlushStrategy || (FlushStrategy = {}));
