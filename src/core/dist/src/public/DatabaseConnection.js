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
import { Connection as RestConnection } from "../database/Connection.js";
/**
 * Connection to DatabaseJS.
 */
export class DatabaseConnection {
    conn$ = null;
    /** Lock limit, scope != stateless */
    static get MAXLOCKS() {
        return (RestConnection.MAXLOCKS);
    }
    /** Lock limit, scope != stateless */
    static set MAXLOCKS(timeout) {
        RestConnection.MAXLOCKS = timeout;
    }
    /** Transaction timeout in seconds, only with scope=transactional */
    static get TRXTIMEOUT() {
        return (RestConnection.TRXTIMEOUT);
    }
    /** Transaction timeout in seconds, only with scope=transactional */
    static set TRXTIMEOUT(timeout) {
        RestConnection.TRXTIMEOUT = timeout;
    }
    /** Lock inspection interval in seconds, only with scope!=stateless */
    static get LOCKINSPECT() {
        return (RestConnection.LOCKINSPECT);
    }
    /** Lock inspection interval in seconds, only with scope!=stateless */
    static set LOCKINSPECT(timeout) {
        RestConnection.LOCKINSPECT = timeout;
    }
    /** Connection timeout in seconds, only with scope=transactional */
    static get CONNTIMEOUT() {
        return (RestConnection.CONNTIMEOUT);
    }
    /** Connection timeout in seconds, only with scope=transactional */
    static set CONNTIMEOUT(timeout) {
        RestConnection.CONNTIMEOUT = timeout;
    }
    /** See connection */
    constructor(url) {
        this.conn$ = new RestConnection(url);
    }
    /** Number of row locks */
    get locks() {
        return (this.conn$.locks);
    }
    /** Number of row locks */
    set locks(locks) {
        this.conn$.locks = locks;
    }
    /** The connection scope */
    get scope() {
        return (this.conn$.scope);
    }
    /** The connection scope */
    set scope(scope) {
        this.conn$.scope = scope;
    }
    /** The authorization method */
    get authmethod() {
        return (this.conn$.authmethod);
    }
    /** The authorization method */
    set authmethod(method) {
        this.conn$.authmethod = method;
    }
    /** Is connection scope transactional */
    get transactional() {
        return (this.conn$.transactional);
    }
    /** Add attribute to be passed on to backend */
    addAttribute(name, value) {
        this.conn$.addAttribute(name, value);
    }
    /** Delete attribute to be passed on to backend */
    deleteAttribute(name) {
        this.conn$.deleteAttribute(name);
    }
    /** Add clientinfo to be passed on to database */
    addClientInfo(name, value) {
        this.conn$.addClientInfo(name, value);
    }
    /** Delete clientinfo to be passed on to database */
    deleteClientInfo(name) {
        this.conn$.deleteClientInfo(name);
    }
    /** Connect to database */
    async connect(username, password, custom) {
        return (this.conn$.connect(username, password, custom));
    }
    /** Disconnect from database */
    async disconnect() {
        return (this.conn$.disconnect());
    }
    /** Is connected to database */
    connected() {
        return (this.conn$.connected());
    }
    /** Commit all transactions */
    async commit() {
        return (this.conn$.commit());
    }
    /** Rollback all transactions */
    async rollback() {
        return (this.conn$.rollback());
    }
    /** Execute insert */
    async insert(payload) {
        return (this.conn$.insert(payload));
    }
    /** Execute update */
    async update(payload) {
        return (this.conn$.update(payload));
    }
    /** Execute delete */
    async delete(payload) {
        return (this.conn$.delete(payload));
    }
    /** Execute script */
    async script(steps, attributes) {
        return (this.conn$.script(steps, attributes));
    }
    /** Execute batch */
    async batch(stmts, attributes) {
        return (this.conn$.batch(stmts, attributes));
    }
}
