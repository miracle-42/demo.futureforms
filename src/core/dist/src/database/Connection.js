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
import { SQLRest } from "./SQLRest.js";
import { MSGGRP } from "../messages/Internal.js";
import { ConnectionScope } from "./ConnectionScope.js";
import { Logger, Type } from "../application/Logger.js";
import { Messages, Level } from "../messages/Messages.js";
import { EventType } from "../control/events/EventType.js";
import { FormsModule } from "../application/FormsModule.js";
import { FormBacking } from "../application/FormBacking.js";
import { Connection as BaseConnection } from "../public/Connection.js";
import { FormEvent, FormEvents } from "../control/events/FormEvents.js";
export class Connection extends BaseConnection {
    locks$ = 0;
    trx$ = null;
    conn$ = null;
    touched$ = null;
    modified$ = null;
    keepalive$ = 20;
    nowait$ = false;
    running$ = false;
    tmowarn$ = false;
    authmethod$ = null;
    autocommit$ = false;
    attributes$ = new Map();
    clientinfo$ = new Map();
    scope$ = ConnectionScope.transactional;
    static MAXLOCKS = 32;
    static TRXTIMEOUT = 240;
    static LOCKINSPECT = 120;
    static CONNTIMEOUT = 120;
    // Be able to get the real connection from the public
    static conns$ = [];
    static getAllConnections() {
        return (this.conns$);
    }
    constructor(url) {
        super(url);
        Connection.conns$.push(this);
    }
    get locks() {
        return (this.locks$);
    }
    set locks(locks) {
        let trxstart = this.modified == null && this.transactional;
        if (this.autocommit$)
            return;
        if (!this.modified)
            this.modified = new Date();
        this.locks$ = locks;
        if (trxstart)
            FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));
    }
    get scope() {
        return (this.scope$);
    }
    set scope(scope) {
        if (this.connected()) {
            Messages.warn(MSGGRP.ORDB, 1); // Connection scope cannot be changed after connect
            return;
        }
        this.scope$ = scope;
    }
    get authmethod() {
        return (this.authmethod$);
    }
    set authmethod(method) {
        this.authmethod$ = method;
    }
    get transactional() {
        return (this.scope != ConnectionScope.stateless);
    }
    addAttribute(name, value) {
        this.attributes$.set(name, value);
    }
    deleteAttribute(name) {
        this.attributes$.delete(name);
    }
    addClientInfo(name, value) {
        this.clientinfo$.set(name, value);
    }
    deleteClientInfo(name) {
        this.clientinfo$.delete(name);
    }
    connected() {
        return (this.conn$ != null);
    }
    hasTransactions() {
        return (this.modified != null);
    }
    hasKeepAlive() {
        return (this.running$);
    }
    async connect(username, password, custom) {
        this.touched = null;
        this.tmowarn = false;
        let scope = null;
        switch (this.scope) {
            case ConnectionScope.stateless:
                scope = "stateless";
                break;
            case ConnectionScope.dedicated:
                scope = "dedicated";
                break;
            case ConnectionScope.transactional:
                scope = "transaction";
                break;
        }
        let method = this.authmethod$;
        if (!method)
            method = "database";
        let payload = {
            "scope": scope,
            "auth.method": method
        };
        if (username)
            payload.username = username;
        if (password)
            payload["auth.secret"] = password;
        if (custom) {
            custom.forEach((value, name) => { payload[name] = value; });
        }
        if (this.clientinfo$.size > 0) {
            let info = [];
            this.clientinfo$.forEach((value, name) => info.push({ name: name, value: value }));
            payload["clientinfo"] = info;
        }
        this.attributes$.forEach((value, name) => { payload[name] = value; });
        Logger.log(Type.database, "connect");
        let thread = FormsModule.showLoading("Connecting");
        let response = await this.post("connect", payload);
        FormsModule.hideLoading(thread);
        if (!response.success) {
            Messages.handle(MSGGRP.ORDB, response.message, Level.fine);
            return (false);
        }
        if (response["version"])
            console.log("OpenRestDB Version: " + response.version);
        this.trx$ = new Object();
        this.conn$ = response.session;
        this.nowait$ = response.nowait;
        this.autocommit$ = response.autocommit;
        this.keepalive$ = (+response.timeout * 4 / 5) * 1000;
        if (this.keepalive$ > 4 / 5 * Connection.LOCKINSPECT * 1000)
            this.keepalive$ = 4 / 5 * Connection.LOCKINSPECT * 1000;
        await FormEvents.raise(FormEvent.AppEvent(EventType.Connect));
        if (!this.running$)
            this.keepalive();
        return (true);
    }
    async disconnect() {
        this.tmowarn = false;
        this.trx = new Object();
        this.touched = new Date();
        let payload = {
            session: this.conn$
        };
        this.attributes$.forEach((value, name) => { payload[name] = value; });
        Logger.log(Type.database, "disconnect");
        let response = await this.post("disconnect", payload);
        if (response.success) {
            this.conn$ = null;
            this.touched = null;
            this.modified = null;
        }
        await FormEvents.raise(FormEvent.AppEvent(EventType.Disconnect));
        return (response.success);
    }
    async commit() {
        if (this.modified == null)
            return (true);
        this.tmowarn = false;
        this.trx = new Object();
        this.touched = new Date();
        let payload = {
            session: this.conn$
        };
        this.attributes$.forEach((value, name) => { payload[name] = value; });
        Logger.log(Type.database, "commit");
        let thread = FormsModule.showLoading("Comitting");
        let response = await this.post("commit", payload);
        FormsModule.hideLoading(thread);
        if (response.success) {
            this.locks$ = 0;
            this.touched = null;
            this.modified = null;
            if (response["session"])
                this.conn$ = response.session;
        }
        if (!response.success) {
            Messages.handle(MSGGRP.TRX, response.message, Level.fine);
            return (false);
        }
        return (true);
    }
    async rollback() {
        if (!this.modified)
            return (true);
        this.tmowarn = false;
        let payload = {
            session: this.conn$
        };
        this.attributes$.forEach((value, name) => { payload[name] = value; });
        Logger.log(Type.database, "rollback");
        let thread = FormsModule.showLoading("Rolling back");
        let response = await this.post("rollback", payload);
        FormsModule.hideLoading(thread);
        if (response.success) {
            this.locks$ = 0;
            this.touched = null;
            this.modified = null;
            this.trx = new Object();
            if (response["session"])
                this.conn$ = response.session;
        }
        if (!response.success) {
            Messages.handle(MSGGRP.TRX, response.message, Level.fine);
            return (false);
        }
        return (true);
    }
    async release() {
        this.tmowarn = false;
        let payload = {
            session: this.conn$
        };
        this.attributes$.forEach((value, name) => { payload[name] = value; });
        Logger.log(Type.database, "release");
        let thread = FormsModule.showLoading("Releasing connection");
        let response = await this.post("release", payload);
        FormsModule.hideLoading(thread);
        if (response.success) {
            this.locks$ = 0;
            this.touched = null;
            this.modified = null;
        }
        if (!response.success) {
            Messages.handle(MSGGRP.TRX, response.message, Level.fine);
            return (false);
        }
        return (true);
    }
    async select(sql, cursor, rows, describe) {
        if (describe == null)
            describe = false;
        let skip = 0;
        this.tmowarn = false;
        this.touched = new Date();
        if (this.modified)
            this.modified = new Date();
        if (cursor && cursor.trx != this.trx$)
            skip = cursor.pos;
        if (cursor && this.scope == ConnectionScope.stateless)
            skip = cursor.pos;
        let payload = {
            rows: rows,
            skip: skip,
            compact: true,
            dateformat: "UTC",
            describe: describe,
            session: this.conn$,
            sql: sql.stmt,
            bindvalues: this.convert(sql.bindvalues)
        };
        if (cursor) {
            payload.cursor = cursor.name;
            cursor.rows = rows;
            cursor.pos += rows;
            cursor.trx = this.trx$;
            cursor.stmt = sql.stmt;
            cursor.bindvalues = sql.bindvalues;
        }
        if (sql.attributes) {
            sql.attributes.forEach((entry) => { payload[entry.name] = entry.value; });
        }
        this.attributes$.forEach((value, name) => { payload[name] = value; });
        Logger.log(Type.database, "select");
        let thread = FormsModule.showLoading("Querying");
        let response = await this.post("select", payload);
        FormsModule.hideLoading(thread);
        if (!response.success) {
            Messages.handle(MSGGRP.SQL, response.message, Level.fine);
            return (response);
        }
        if (cursor)
            cursor.eof = !response.more;
        if (response["session"])
            this.conn$ = response.session;
        return (response);
    }
    async fetch(cursor) {
        this.tmowarn = false;
        this.touched = new Date();
        let restore = false;
        if (this.modified)
            this.modified = new Date();
        if (cursor.trx != this.trx$)
            restore = true;
        if (this.scope == ConnectionScope.stateless)
            restore = true;
        if (restore) {
            let sql = new SQLRest();
            sql.stmt = cursor.stmt;
            sql.bindvalues = cursor.bindvalues;
            return (this.select(sql, cursor, cursor.rows, false));
        }
        let payload = { session: this.conn$, cursor: cursor.name };
        this.attributes$.forEach((value, name) => { payload[name] = value; });
        Logger.log(Type.database, "fetch");
        let thread = FormsModule.showLoading("Fetching data");
        let response = await this.post("fetch", payload);
        FormsModule.hideLoading(thread);
        if (!response.success) {
            Messages.handle(MSGGRP.SQL, response.message, Level.fine);
            return (response);
        }
        cursor.eof = !response.more;
        cursor.pos += response.rows.length;
        if (response["session"])
            this.conn$ = response.session;
        return (response);
    }
    async close(cursor) {
        this.tmowarn = false;
        let response = null;
        if (this.modified)
            this.modified = new Date();
        if (this.scope == ConnectionScope.stateless)
            return ({ success: true, message: null, rows: [] });
        if (cursor.trx == this.trx) {
            let payload = {
                close: true,
                session: this.conn$,
                cursor: cursor.name
            };
            this.attributes$.forEach((value, name) => { payload[name] = value; });
            response = await this.post("fetch", payload);
            if (!response.success) {
                Messages.handle(MSGGRP.SQL, response.message, Level.fine);
                return (response);
            }
            if (response["session"])
                this.conn$ = response.session;
        }
        return (response);
    }
    async lock(sql) {
        if (this.scope == ConnectionScope.stateless)
            return ({ success: true, message: null, rows: [] });
        let response = null;
        let trxstart = this.modified == null;
        if (this.nowait$)
            sql.stmt += " nowait";
        let payload = {
            rows: 1,
            compact: true,
            sql: sql.stmt,
            dateformat: "UTC",
            session: this.conn$,
            bindvalues: this.convert(sql.bindvalues)
        };
        if (sql.attributes) {
            sql.attributes.forEach((entry) => { payload[entry.name] = entry.value; });
        }
        if (sql.assert)
            payload.assert = this.convert(sql.assert);
        this.attributes$.forEach((value, name) => { payload[name] = value; });
        this.tmowarn = false;
        this.touched = new Date();
        Logger.log(Type.database, "lock");
        let thread = FormsModule.showLoading("Locking");
        response = await this.post("select", payload);
        FormsModule.hideLoading(thread);
        if (!response.success) {
            if (response.assert == null) {
                Messages.handle(MSGGRP.ORDB, response, Level.info);
                return (response);
            }
        }
        this.locks$++;
        this.tmowarn = false;
        this.touched = new Date();
        this.modified = new Date();
        if (response["session"])
            this.conn$ = response.session;
        if (trxstart)
            await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));
        return (response);
    }
    async refresh(sql) {
        let response = null;
        let payload = {
            rows: 1,
            compact: true,
            sql: sql.stmt,
            dateformat: "UTC",
            session: this.conn$,
            bindvalues: this.convert(sql.bindvalues)
        };
        if (sql.attributes) {
            sql.attributes.forEach((entry) => { payload[entry.name] = entry.value; });
        }
        this.attributes$.forEach((value, name) => { payload[name] = value; });
        this.tmowarn = false;
        this.touched = new Date();
        Logger.log(Type.database, "refresh");
        let thread = FormsModule.showLoading("Refresh row");
        response = await this.post("select", payload);
        FormsModule.hideLoading(thread);
        if (!response.success) {
            Messages.handle(MSGGRP.SQL, response.message, Level.fine);
            return (response);
        }
        if (response["session"])
            this.conn$ = response.session;
        return (response);
    }
    async insert(sql) {
        let trxstart = this.modified == null && this.transactional;
        let payload = {
            sql: sql.stmt,
            dateformat: "UTC",
            session: this.conn$,
            bindvalues: this.convert(sql.bindvalues)
        };
        if (sql.returnclause)
            payload.returning = true;
        if (sql.attributes) {
            sql.attributes.forEach((entry) => { payload[entry.name] = entry.value; });
        }
        this.attributes$.forEach((value, name) => { payload[name] = value; });
        this.tmowarn = false;
        this.touched = new Date();
        Logger.log(Type.database, "insert");
        let thread = FormsModule.showLoading("Insert");
        let response = await this.post("insert", payload);
        FormsModule.hideLoading(thread);
        if (!response.success) {
            Messages.handle(MSGGRP.SQL, response.message, Level.fine);
            return (response);
        }
        this.tmowarn = false;
        this.touched = new Date();
        this.modified = new Date();
        if (response["session"])
            this.conn$ = response.session;
        if (trxstart)
            await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));
        return (response);
    }
    async update(sql) {
        let trxstart = this.modified == null && this.transactional;
        let payload = {
            sql: sql.stmt,
            dateformat: "UTC",
            session: this.conn$,
            bindvalues: this.convert(sql.bindvalues)
        };
        if (sql.returnclause)
            payload.returning = true;
        if (sql.attributes) {
            sql.attributes.forEach((entry) => { payload[entry.name] = entry.value; });
        }
        if (sql.assert)
            payload.assert = this.convert(sql.assert);
        this.attributes$.forEach((value, name) => { payload[name] = value; });
        this.tmowarn = false;
        this.touched = new Date();
        Logger.log(Type.database, "update");
        let thread = FormsModule.showLoading("Update");
        let response = await this.post("update", payload);
        FormsModule.hideLoading(thread);
        if (!response.success) {
            if (response.assert == null) {
                console.error(response);
                return (response);
            }
        }
        this.tmowarn = false;
        this.touched = new Date();
        this.modified = new Date();
        if (response["session"])
            this.conn$ = response.session;
        if (sql.assert && !this.autocommit$)
            this.locks$++;
        if (trxstart)
            await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));
        return (response);
    }
    async script(steps, attributes) {
        let request = [];
        steps.forEach((stmt) => {
            let step = {
                path: stmt.path,
                payload: {
                    sql: stmt.stmt,
                    dateformat: "UTC"
                }
            };
            if (stmt.returnclause)
                step.payload.returning = true;
            if (stmt.attributes) {
                stmt.attributes.forEach((entry) => { step.payload[entry.name] = entry.value; });
            }
            if (stmt.assert)
                step.payload.assert = this.convert(stmt.assert);
            this.attributes$.forEach((value, name) => { step.payload[name] = value; });
            step.payload.bindvalues = this.convert(stmt.bindvalues);
            request.push(step);
        });
        let script = {
            script: request,
            session: this.conn$
        };
        if (attributes) {
            attributes.forEach((entry) => { script[entry.name] = entry.value; });
        }
        Logger.log(Type.database, "script");
        let thread = FormsModule.showLoading("script");
        let response = await this.post("script", script);
        FormsModule.hideLoading(thread);
        this.tmowarn = false;
        this.touched = new Date();
        this.modified = new Date();
        if (!response.success) {
            if (response.assert == null) {
                console.error(response);
                return (response);
            }
        }
        if (response["session"])
            this.conn$ = response.session;
        return (response);
    }
    async batch(stmts, attributes) {
        if (!stmts || stmts.length == 0) {
            console.error("Nothing to do");
            return ([]);
        }
        let trxstart = this.modified == null && this.transactional;
        let request = [];
        stmts.forEach((stmt) => {
            let step = {
                path: stmt.path,
                payload: {
                    sql: stmt.stmt,
                    dateformat: "UTC"
                }
            };
            if (stmt.returnclause)
                step.payload.returning = true;
            if (stmt.attributes) {
                stmt.attributes.forEach((entry) => { step.payload[entry.name] = entry.value; });
            }
            if (stmt.assert)
                step.payload.assert = this.convert(stmt.assert);
            this.attributes$.forEach((value, name) => { step.payload[name] = value; });
            step.payload.bindvalues = this.convert(stmt.bindvalues);
            request.push(step);
        });
        let batch = {
            batch: request,
            session: this.conn$
        };
        if (attributes) {
            attributes.forEach((entry) => { batch[entry.name] = entry.value; });
        }
        Logger.log(Type.database, "batch");
        let thread = FormsModule.showLoading("batch");
        let response = await this.post("batch", batch);
        FormsModule.hideLoading(thread);
        let locks = this.locks$;
        let steps = response.steps;
        if (!steps || steps.length == 0) {
            console.error("No response");
            return ([]);
        }
        for (let i = 0; i < steps.length; i++) {
            let resp = steps[i];
            if (resp.success && !this.autocommit$) {
                if (stmts[i].path == "update")
                    this.locks$++;
                else if (stmts[i].path == "delete")
                    this.locks$++;
            }
        }
        this.tmowarn = false;
        this.touched = new Date();
        this.modified = new Date();
        if (response["session"])
            this.conn$ = response.session;
        if (trxstart && this.locks$ > locks)
            await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));
        return (steps);
    }
    async delete(sql) {
        let trxstart = this.modified == null && this.transactional;
        let payload = {
            sql: sql.stmt,
            dateformat: "UTC",
            session: this.conn$,
            bindvalues: this.convert(sql.bindvalues)
        };
        if (sql.returnclause)
            payload.returning = true;
        if (sql.assert)
            payload.assert = this.convert(sql.assert);
        this.attributes$.forEach((value, name) => { payload[name] = value; });
        this.tmowarn = false;
        this.touched = new Date();
        Logger.log(Type.database, "delete");
        let thread = FormsModule.showLoading("Delete");
        let response = await this.post("delete", payload);
        FormsModule.hideLoading(thread);
        if (!response.success) {
            if (response.assert == null) {
                console.error(response);
                return (response);
            }
        }
        this.tmowarn = false;
        this.touched = new Date();
        this.modified = new Date();
        if (response["session"])
            this.conn$ = response.session;
        if (sql.assert && !this.autocommit$)
            this.locks$++;
        if (trxstart)
            await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));
        return (response);
    }
    async call(patch, sql) {
        let response = null;
        let trxstart = this.modified == null && this.transactional;
        let payload = {
            sql: sql.stmt,
            dateformat: "UTC",
            session: this.conn$,
            bindvalues: this.convert(sql.bindvalues)
        };
        this.attributes$.forEach((value, name) => { payload[name] = value; });
        this.tmowarn = false;
        this.touched = new Date();
        Logger.log(Type.database, "call");
        let thread = FormsModule.showLoading("Call procedure");
        if (patch)
            response = await this.patch("call", payload);
        else
            response = await this.post("call", payload);
        FormsModule.hideLoading(thread);
        if (!response.success) {
            Messages.handle(MSGGRP.SQL, response.message, Level.fine);
            return (response);
        }
        this.tmowarn = false;
        this.touched = new Date();
        if (patch)
            this.modified = new Date();
        if (response["session"])
            this.conn$ = response.session;
        if (trxstart && patch)
            await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));
        return (response);
    }
    async execute(patch, sql) {
        let response = null;
        let trxstart = this.modified == null && this.transactional;
        let payload = {
            sql: sql.stmt,
            dateformat: "UTC",
            session: this.conn$,
            bindvalues: this.convert(sql.bindvalues)
        };
        this.attributes$.forEach((value, name) => { payload[name] = value; });
        this.tmowarn = false;
        this.touched = new Date();
        Logger.log(Type.database, "execute");
        let thread = FormsModule.showLoading("Execute procedure");
        if (patch)
            response = await this.patch("call", payload);
        else
            response = await this.post("call", payload);
        FormsModule.hideLoading(thread);
        if (!response.success) {
            Messages.handle(MSGGRP.SQL, response.message, Level.fine);
            return (response);
        }
        this.tmowarn = false;
        this.touched = new Date();
        if (patch)
            this.modified = new Date();
        if (response["session"])
            this.conn$ = response.session;
        if (trxstart && patch)
            await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));
        return (response);
    }
    get trx() {
        return (this.trx$);
    }
    set trx(trx) {
        this.trx$ = trx;
    }
    get tmowarn() {
        return (this.tmowarn$);
    }
    set tmowarn(flag) {
        this.tmowarn$ = flag;
    }
    get touched() {
        return (this.touched$);
    }
    set touched(date) {
        this.touched$ = date;
    }
    get modified() {
        return (this.modified$);
    }
    set modified(date) {
        this.modified$ = date;
    }
    async keepalive() {
        this.running$ = true;
        await FormsModule.sleep(this.keepalive$);
        if (this.touched$) {
            let now = (new Date()).getTime();
            let next = this.touched$.getTime() + this.keepalive$;
            let nap = next - now;
            if (nap > 1000)
                await FormsModule.sleep(nap);
        }
        if (!this.connected()) {
            this.running$ = false;
            return;
        }
        let conn = this.conn$;
        let response = await this.post("ping", { session: this.conn$, keepalive: true });
        if (this.conn$ != conn) {
            this.touched = null;
            this.modified = null;
            this.tmowarn = false;
            this.keepalive();
            return;
        }
        if (!response.success) {
            this.conn$ = null;
            Messages.handle(MSGGRP.ORDB, response.message, Level.warn);
            await FormEvents.raise(FormEvent.AppEvent(EventType.Disconnect));
            this.running$ = false;
            return (response);
        }
        if (response["session"])
            this.conn$ = response.session;
        let idle = 0;
        if (this.modified)
            idle = ((new Date()).getTime() - this.modified.getTime()) / 1000;
        if (this.scope != ConnectionScope.stateless) {
            if (this.locks >= Connection.MAXLOCKS) {
                if (!this.tmowarn$) {
                    this.tmowarn = true;
                    Messages.warn(MSGGRP.TRX, 6, Connection.TRXTIMEOUT); // Maximum number of locks reached
                }
                else {
                    Messages.warn(MSGGRP.TRX, 7); // Transaction is being rolled back
                    await FormBacking.rollback();
                }
            }
        }
        if (this.scope == ConnectionScope.transactional) {
            if (this.modified) {
                if (idle > Connection.TRXTIMEOUT && this.tmowarn) {
                    Messages.warn(MSGGRP.TRX, 7); // Transaction is being rolled back
                    await FormBacking.rollback();
                }
                else {
                    if (idle > Connection.TRXTIMEOUT * 2 / 3 && !this.tmowarn) {
                        this.tmowarn = true;
                        Messages.warn(MSGGRP.TRX, 8, Connection.TRXTIMEOUT); // Transaction will be rolled back
                    }
                }
            }
            else if (this.touched) {
                idle = ((new Date()).getTime() - this.touched.getTime()) / 1000;
                if (idle > Connection.CONNTIMEOUT)
                    await this.release();
            }
        }
        this.keepalive();
    }
    convert(bindv) {
        let binds = [];
        if (bindv == null)
            return ([]);
        bindv.forEach((b) => {
            let value = b.value;
            if (value instanceof Date)
                value = value.getTime();
            if (b.outtype)
                binds.push({ name: b.name, type: b.type });
            else {
                if (value == null)
                    binds.push({ name: b.name, type: b.type });
                else
                    binds.push({ name: b.name, value: value, type: b.type });
            }
        });
        return (binds);
    }
}
export class Response {
    rows;
    message = null;
    success = true;
}
export class Step extends SQLRest {
    path;
}
