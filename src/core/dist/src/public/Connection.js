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
import { FlightRecorder } from "../application/FlightRecorder.js";
/**
 * Basic HTTP connection to backend.
 * This class is meant for extending and does not implement any username/password security.
 */
export class Connection {
    base$ = null;
    headers$ = {};
    method$ = null;
    authmeth$ = null;
    success$ = true;
    /** Create connection. If no url specified, the Origin of the page is used */
    constructor(url) {
        if (url == null)
            url = window.location.origin;
        if (typeof url === "string")
            url = new URL(url);
        this.base$ = url;
    }
    /** The base url for this connection */
    get baseURL() {
        return (this.base$);
    }
    /** The authorization method. Not used in base class */
    get authmethod() {
        return (this.authmeth$);
    }
    /** The authorization method. Not used in base class */
    set authmethod(method) {
        this.authmeth$ = method;
    }
    /** Whether the last request was successfull */
    get success() {
        return (this.success$);
    }
    /** Get the request headers */
    get headers() {
        return (this.headers$);
    }
    /** Set the request headers */
    set headers(headers) {
        this.headers$ = headers;
    }
    /** Set the base url */
    set baseURL(url) {
        if (typeof url === "string")
            url = new URL(url);
        this.base$ = url;
    }
    /** Not used in base class */
    get transactional() {
        return (false);
    }
    /** Perform HTTP GET */
    async get(url, raw) {
        this.method$ = "GET";
        return (this.invoke(url, null, raw));
    }
    /** Perform HTTP POST */
    async post(url, payload, raw) {
        this.method$ = "POST";
        return (this.invoke(url, payload, raw));
    }
    /** Perform HTTP PATCH */
    async patch(url, payload, raw) {
        this.method$ = "PATCH";
        return (this.invoke(url, payload, raw));
    }
    async invoke(url, payload, raw) {
        let body = null;
        this.success$ = true;
        let endpoint = new URL(this.base$);
        if (url)
            endpoint = new URL(url, endpoint);
        if (payload) {
            if (typeof payload != "string")
                payload = JSON.stringify(payload);
        }
        if (!endpoint.toString().endsWith("ping"))
            FlightRecorder.add("@connection: " + endpoint + (payload ? " " + JSON.stringify(payload) : ""));
        let http = await fetch(endpoint, {
            method: this.method$,
            headers: this.headers$,
            body: payload
        }).
            catch((errmsg) => {
            if (raw)
                body = errmsg;
            else
                body =
                    {
                        success: false,
                        message: errmsg
                    };
            this.success$ = false;
        });
        if (this.success$) {
            if (raw)
                body = await http.text();
            else
                body = await http.json();
        }
        return (body);
    }
}
