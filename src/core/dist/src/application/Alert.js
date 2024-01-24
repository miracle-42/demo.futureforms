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
import { FormsModule } from './FormsModule.js';
import { FormBacking } from './FormBacking.js';
import { Classes } from '../internal/Classes.js';
import { FlightRecorder } from './FlightRecorder.js';
/**
 * A popup form to alert the user that some event
 * has occured
 */
export class Alert {
    static interceptor = null;
    /** Alert the user that a fatal event has occured */
    static async fatal(msg, title) {
        if (this.interceptor)
            Alert.interceptor.fatal(msg, title);
        else
            Alert.callform(msg, title, false, true);
    }
    /** Alert the user that an event causing an warning has occured */
    static async warning(msg, title) {
        if (this.interceptor)
            Alert.interceptor.warning(msg, title);
        else
            Alert.callform(msg, title, true, false);
    }
    /** Alert the user an event has occured */
    static async message(msg, title) {
        if (this.interceptor)
            Alert.interceptor.message(msg, title);
        else
            Alert.callform(msg, title, false, false);
    }
    static async callform(msg, title, warning, fatal) {
        let params = new Map();
        params.set("title", title);
        params.set("message", msg);
        params.set("fatal", fatal);
        params.set("warning", warning);
        if (fatal) {
            console.log(title + ": " + msg + " " + (new Error()).stack);
            FlightRecorder.add("alert.fatal: " + title + " - " + msg);
        }
        let curr = FormBacking.getCurrentForm();
        if (curr)
            curr.callform(Classes.AlertClass, params);
        else
            FormsModule.showform(Classes.AlertClass, params);
    }
}
