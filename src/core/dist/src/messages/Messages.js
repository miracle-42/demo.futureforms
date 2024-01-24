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
import { InternalUS } from "./InternalUS.js";
import { Classes } from "../internal/Classes.js";
import { isClass } from "../public/Class.js";
import { FormBacking } from "../application/FormBacking.js";
import { FormsModule } from "../application/FormsModule.js";
export class Messages {
    static alert$ = null;
    static console$ = null;
    static files$ = [];
    static language$ = null;
    static handler$ = null;
    static groups$ = new Map();
    static messages$ = new Map();
    /** Level at which messages are alerted */
    static get alertLevel() {
        if (!Messages.alert$)
            return (Level.warn);
        return (Messages.alert$);
    }
    /** Level at which messages are alerted */
    static set alertLevel(level) {
        Messages.alert$ = level;
    }
    /** Level at which messages written to console */
    static get consoleLevel() {
        if (!Messages.console$)
            return (Level.info);
        return (Messages.console$);
    }
    /** Level at which messages written to console */
    static set consoleLevel(level) {
        Messages.console$ = level;
    }
    /** Interceptor for handling messages */
    static get MessageHandler() {
        return (Messages.handler$);
    }
    /** Interceptor for handling messages */
    static set MessageHandler(handler) {
        Messages.handler$ = handler;
    }
    /** all messages language */
    static set language(language) {
        if (!Messages.language$) {
            // Add internal bundles
            Messages.addBundle(new InternalUS());
        }
        Messages.language$ = language.toUpperCase();
        this.files$.forEach((bundle) => {
            if (bundle.lang == Messages.language)
                Messages.load(bundle);
        });
    }
    /** all messages language */
    static get language() {
        return (Messages.language$);
    }
    /** Add message bundle */
    static addBundle(bundle) {
        if (isClass(bundle))
            bundle = new bundle();
        if (!Messages.files$.includes(bundle))
            Messages.files$.push(bundle);
        bundle.lang = bundle.lang.toUpperCase();
        if (bundle.lang == Messages.language)
            Messages.load(bundle);
    }
    /** Get message by group# and message# */
    static get(grpno, errno) {
        let msg = null;
        let group = Messages.messages$.get(grpno);
        if (group)
            msg = group.get(errno);
        return (msg);
    }
    /** Get message group by group# */
    static getGroup(grpno) {
        return (Messages.groups$.get(grpno));
    }
    /** Get message bundles */
    static getBundles() {
        return (Messages.files$);
    }
    /** Handle message using Level.fine. Any '%' will be substituded by args */
    static async fine(grpno, errno, ...args) {
        await Messages.show(grpno, errno, Level.fine, args);
    }
    /** Handle message using Level.info. Any '%' will be substituded by args */
    static async info(grpno, errno, ...args) {
        await Messages.show(grpno, errno, Level.info, args);
    }
    /** Handle message using Level.warn. Any '%' will be substituded by args */
    static async warn(grpno, errno, ...args) {
        await Messages.show(grpno, errno, Level.warn, args);
    }
    /** Handle message using Level.severe. Any '%' will be substituded by args */
    static async severe(grpno, errno, ...args) {
        await Messages.show(grpno, errno, Level.severe, args);
    }
    /** Handle unknown message (typically from backend systems) */
    static async handle(grpno, message, level) {
        let group = Messages.getGroup(grpno);
        if (message instanceof Error)
            message = message.message;
        if (typeof message === "object") {
            try {
                message = JSON.stringify(message);
            }
            catch { }
        }
        let msg = {
            errno: 0,
            grpno: grpno,
            message: message,
            title: group.title
        };
        Messages.display(group, msg, level);
    }
    static async show(grpno, errno, level, ...args) {
        if (Array.isArray(args) && args.length == 1)
            args = args[0];
        let group = Messages.getGroup(grpno);
        let msg = Messages.get(grpno, errno);
        if (!msg)
            msg =
                {
                    errno: errno,
                    grpno: grpno,
                    title: "Missing message",
                    message: "Unknow error number '" + errno + "' in group'" + grpno + "'"
                };
        else {
            msg = { ...msg };
            if (!msg.title)
                msg.title = group.title;
        }
        args?.forEach((arg) => { msg.message = Messages.replace(msg.message, arg); });
        let pos = 0;
        while (pos >= 0) {
            pos = msg.message.indexOf('%');
            if (pos >= 0 && msg.message.charAt(pos - 1) != '\\')
                msg.message = msg.message.substring(0, pos) + msg.message.substring(pos + 1);
        }
        Messages.display(group, msg, level);
    }
    static load(bundle) {
        bundle?.groups.forEach((group) => {
            Messages.groups$.set(group.grpno, group);
            let msgs = Messages.messages$.get(group.grpno);
            if (!msgs)
                Messages.messages$.set(group.grpno, new Map());
        });
        bundle?.messages.forEach((msg) => {
            let group = Messages.messages$.get(msg.grpno);
            if (group)
                group.set(msg.errno, msg);
        });
    }
    static replace(message, arg) {
        if (arg instanceof Error)
            arg = arg.message;
        if (typeof arg === "object") {
            try {
                arg = JSON.stringify(arg);
            }
            catch (error) { }
        }
        let pos = message.indexOf("%");
        if (pos >= 0)
            message = message.substring(0, pos) + arg + message.substring(pos + 1);
        return (message);
    }
    static async display(group, msg, level) {
        if (Messages.MessageHandler) {
            let handled = Messages.MessageHandler.handle(msg, level);
            if (handled instanceof Promise)
                handled = await handled;
            if (handled)
                return;
        }
        let cons = false;
        if (level >= Messages.consoleLevel)
            cons = true;
        if (group.console != null)
            cons = group.console;
        let alert = false;
        if (msg.important)
            alert = true;
        if (level >= Messages.alertLevel)
            alert = true;
        let gno = msg.grpno + "";
        while (gno.length < 4)
            gno = "0" + gno;
        let mno = msg.errno + "";
        while (mno.length < 3)
            mno = "0" + mno;
        let message = msg.message;
        message = gno + "-" + mno + ": " + message;
        if (cons) {
            console.log(message);
        }
        if (group.stacktrace) {
            console.log(new Error().stack);
        }
        if (alert) {
            let params = new Map();
            params.set("title", msg.title);
            params.set("message", message);
            params.set("warning", (level == Level.warn));
            params.set("severe", (level == Level.severe));
            let curr = FormBacking.getCurrentForm();
            if (curr)
                curr.callform(Classes.AlertClass, params);
            else
                FormsModule.showform(Classes.AlertClass, params);
        }
    }
}
/** Severity */
export var Level;
(function (Level) {
    Level[Level["fine"] = 0] = "fine";
    Level[Level["info"] = 1] = "info";
    Level[Level["warn"] = 2] = "warn";
    Level[Level["severe"] = 3] = "severe";
})(Level || (Level = {}));
