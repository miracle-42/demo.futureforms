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
import { Logger, Type } from './Logger.js';
import { Properties } from './Properties.js';
import { MSGGRP } from '../messages/Internal.js';
import { Messages } from '../messages/Messages.js';
import { EventStack } from '../control/events/EventStack.js';
export class Framework {
    component = null;
    static event$ = null;
    static taglib = null;
    static attrlib = null;
    eventhandler = null;
    events = new Map();
    static getEvent() {
        return (Framework.event$);
    }
    static setEvent(event) {
        Framework.event$ = event;
    }
    static loadTaglib() {
        Framework.taglib = new Map();
        Properties.TagLibrary.forEach((clazz, tag) => { Framework.addTag(tag.toLowerCase(), clazz); });
        return (Framework.taglib);
    }
    static loadAttrlib() {
        Framework.attrlib = new Map();
        Properties.AttributeLibrary.forEach((clazz, tag) => { Framework.addAttr(tag.toLowerCase(), clazz); });
        return (Framework.attrlib);
    }
    static addTag(tag, clazz) {
        tag = tag.toLowerCase();
        let factory = Properties.FactoryImplementation;
        let impl = factory.createBean(clazz);
        Framework.taglib.set(tag, impl);
    }
    static addAttr(tag, clazz) {
        tag = tag.toLowerCase();
        let factory = Properties.FactoryImplementation;
        let impl = factory.createBean(clazz);
        Framework.attrlib.set(tag, impl);
    }
    static parse(component, doc) {
        return (new Framework(component, doc));
    }
    static prepare(element) {
        let remove = [];
        if (element == null)
            return (null);
        if (typeof element === 'string') {
            let template = document.createElement('div');
            template.innerHTML = element;
            element = template;
            if (element.childNodes.length == 1)
                element = element.childNodes.item(0);
        }
        for (let i = 0; i < element.childNodes.length; i++) {
            let node = element.childNodes.item(i);
            if (node.nodeType == Node.TEXT_NODE && node.textContent.trim() == "")
                remove.unshift(i);
        }
        for (let i = 0; i < remove.length; i++)
            element.childNodes.item(remove[i]).remove();
        return (element);
    }
    static copyAttributes(fr, to) {
        if (fr == null || to == null)
            return;
        let attrnames = fr.getAttributeNames();
        for (let an = 0; an < attrnames.length; an++)
            to.setAttribute(attrnames[an], fr.getAttribute(attrnames[an]));
    }
    constructor(component, doc) {
        this.component = component;
        this.eventhandler = new EventHandler(component);
        Framework.loadTaglib();
        Framework.loadAttrlib();
        if (!Properties.ParseTags && !Properties.ParseEvents)
            return;
        this.parseDoc(doc);
        this.applyEvents();
    }
    parseDoc(doc) {
        if (doc == null)
            return;
        if (!doc.childNodes)
            return;
        this.addEvents(doc);
        let nodes = [];
        doc.childNodes.forEach((node) => { nodes.push(node); });
        for (let i = 0; i < nodes.length; i++) {
            let element = nodes[i];
            if (!(element instanceof HTMLElement))
                continue;
            let impl = this.getImplementation(element);
            if (impl != null) {
                this.apply(doc, impl);
                continue;
            }
            this.addEvents(element);
            this.parseDoc(element);
        }
    }
    addEvents(element) {
        if (element == null)
            return;
        if (!Properties.ParseEvents)
            return;
        let prefix = Properties.AttributePrefix;
        if (!element.getAttributeNames)
            return;
        let attrnames = element.getAttributeNames();
        for (let an = 0; an < attrnames.length; an++) {
            let attrvalue = element.getAttribute(attrnames[an]);
            if (attrvalue != null)
                attrvalue = attrvalue.trim();
            if (!Properties.RequireAttributePrefix) {
                if (attrnames[an].toLowerCase().startsWith("on") && attrvalue.startsWith("this.")) {
                    let events = this.events.get(element);
                    if (events == null) {
                        events = [];
                        this.events.set(element, events);
                    }
                    events.push([attrnames[an], attrvalue]);
                    element.removeAttribute(attrnames[an]);
                    Logger.log(Type.eventparser, "Add event: '" + attrvalue + "' for: " + attrnames[an]);
                    continue;
                }
            }
            if (!attrnames[an].startsWith(prefix))
                continue;
            attrnames[an] = attrnames[an].substring(prefix.length);
            attrnames[an] = attrnames[an].toLowerCase();
            if (attrvalue != null) {
                let events = this.events.get(element);
                if (events == null) {
                    events = [];
                    this.events.set(element, events);
                }
                events.push([attrnames[an], attrvalue]);
                element.removeAttribute(prefix + attrnames[an]);
                Logger.log(Type.eventparser, "Add event: '" + attrvalue + "' for: " + attrnames[an]);
            }
        }
    }
    getImplementation(element) {
        let tag = null;
        let attr = null;
        let prefix = Properties.AttributePrefix;
        let name = element?.nodeName.toLowerCase();
        if (!element.getAttributeNames)
            return (null);
        if (Properties.ParseTags) {
            tag = Framework.taglib.get(name);
            let attrnames = element.getAttributeNames();
            for (let an = 0; tag == null && an < attrnames.length; an++) {
                let atrnm = attrnames[an].toLowerCase();
                if (!Properties.RequireAttributePrefix) {
                    tag = Framework.attrlib.get(atrnm);
                    if (tag != null)
                        attr = atrnm;
                }
                if (tag == null) {
                    if (attrnames[an].startsWith(prefix)) {
                        atrnm = attrnames[an].substring(prefix.length).toLowerCase();
                        tag = Framework.attrlib.get(atrnm);
                        if (tag != null)
                            attr = atrnm;
                    }
                }
            }
        }
        if (tag)
            return (new Implementation(element, tag, name, attr));
        return (null);
    }
    getReplacement(impl) {
        let replace = impl.tag.parse(this.component, impl.element, impl.attr);
        Logger.log(Type.htmlparser, "Resolved tag: '" + impl.name + "' using class: " + impl.tag.constructor.name);
        if (replace == impl.element)
            return ([]);
        if (replace == null) {
            if (impl.element.parentElement != null)
                impl.element.remove();
            return ([]);
        }
        if (typeof replace === "string") {
            let template = document.createElement('div');
            template.innerHTML = replace;
            replace = Framework.prepare(template);
        }
        if (!Array.isArray(replace))
            replace = [replace];
        if (!impl.recursive)
            return (replace);
        let nested = new Map();
        for (let r = 0; r < replace.length; r++) {
            let elements = [replace[r]];
            let deep = this.getImplementation(replace[r]);
            if (deep) {
                elements = this.getReplacement(deep);
                if (elements.length == 0)
                    elements = [replace[r]];
            }
            nested.set(r, elements);
        }
        let nodes = [];
        nested.forEach((nrep) => nodes.push(...nrep));
        return (nodes);
    }
    apply(doc, impl) {
        let replace = this.getReplacement(impl);
        if (replace.length > 0) {
            for (let r = 0; r < replace.length; r++)
                replace[r] = doc.insertBefore(replace[r], impl.element);
            impl.element.remove();
            if (impl.recursive) {
                for (let r = 0; r < replace.length; r++)
                    this.parseDoc(replace[r]);
            }
        }
        return (replace.length);
    }
    applyEvents() {
        if (Properties.ParseEvents && this.component != null) {
            this.events.forEach((event, element) => {
                for (let i = 0; i < event.length; i++) {
                    let func = new DynamicCall(this.component, event[i][1]);
                    let ename = this.eventhandler.addEvent(element, event[i][0], func);
                    element.addEventListener(ename, this.eventhandler);
                }
            });
        }
    }
}
export class DynamicCall {
    path;
    method;
    args = [];
    component = null;
    constructor(component, signature) {
        this.parse(signature);
        this.component = component;
    }
    parse(signature) {
        if (signature.startsWith("this."))
            signature = signature.substring(5);
        let pos1 = signature.indexOf("(");
        let pos2 = signature.indexOf(")");
        this.path = signature.substring(0, pos1).split(".");
        let arglist = signature.substring(pos1 + 1, pos2).trim();
        let arg = "";
        let quote = null;
        this.method = this.path.pop();
        for (let i = 0; i < arglist.length; i++) {
            let c = arglist.charAt(i);
            if (c == "," && quote == null) {
                if (arg.length > 0) {
                    this.args.push(arg);
                    arg = "";
                }
                continue;
            }
            if (c == "'" || c == '"') {
                if (quote != null && c == quote) {
                    quote = null;
                    continue;
                }
                else if (quote == null) {
                    quote = c;
                    continue;
                }
            }
            arg += c;
        }
        if (arg.trim().length > 0)
            this.args.push(arg);
    }
    async invoke(event) {
        Framework.setEvent(event);
        let comp = this.component;
        for (let i = 0; i < this.path.length; i++) {
            if (!this.component[this.path[i]]) {
                let msgno = 1;
                if (!(this.path[i] in this.component))
                    msgno = 2; // Attribute null or missing
                Messages.severe(MSGGRP.FRAMEWORK, msgno, this.path[i], this.component.constructor.name);
                return;
            }
            comp = this.component[this.path[i]];
        }
        try {
            switch (this.args.length) {
                case 0:
                    await comp[this.method]();
                    break;
                case 1:
                    await comp[this.method](this.args[0]);
                    break;
                default:
                    await comp[this.method](...this.args);
                    break;
            }
        }
        catch (error) {
            Messages.severe(MSGGRP.FRAMEWORK, 3, this.method, this.component.constructor.name, error); // Failed to invoke method
        }
    }
    toString() {
        return (this.component.constructor.name + " " + this.method);
    }
}
class EventHandler {
    component;
    events = new Map();
    constructor(component) {
        this.component = component;
    }
    addEvent(element, event, handler) {
        if (event.startsWith("on"))
            event = event.substring(2);
        let events = this.events.get(element);
        if (events == null) {
            events = new Map();
            this.events.set(element, events);
        }
        events.set(event, handler);
        return (event);
    }
    getEvent(element, event) {
        let events = this.events.get(element);
        if (events == null)
            return (null);
        return (events.get(event));
    }
    handleEvent(event) {
        let elem = event.target;
        let method = this.getEvent(elem, event.type);
        if (method == null) {
            while (elem != null && method == null && elem.parentElement != document.body.parentElement) {
                elem = elem.parentElement;
                method = this.getEvent(elem, event.type);
            }
        }
        if (method != null) {
            EventStack.queue(method, event);
        }
        else if (elem != null) {
            Messages.severe(MSGGRP.FRAMEWORK, 4, event.type); // Cannot find event type
        }
    }
}
class Implementation {
    element;
    tag;
    name;
    attr;
    constructor(element, tag, name, attr) {
        this.element = element;
        this.tag = tag;
        this.name = name;
        this.attr = attr;
    }
    get recursive() {
        if (this.tag.recursive == null)
            return (true);
        return (this.tag.recursive);
    }
}
