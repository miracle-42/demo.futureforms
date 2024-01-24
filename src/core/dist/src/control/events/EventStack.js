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
import { FlightRecorder } from "../../application/FlightRecorder.js";
class WatchDog {
    static watchdog = null;
    static start() {
        if (WatchDog.watchdog == null)
            WatchDog.watchdog = new WatchDog();
    }
    constructor() {
        this.check(500);
    }
    check(interval) {
        if (!EventStack.running && EventStack.stack$.length > 0) {
            FlightRecorder.add("@eventstack: restart EventStackHandler");
            EventStack.handle();
        }
        setTimeout(() => { this.check(interval); }, interval);
    }
}
export class EventStack {
    static stack$ = [];
    static running = false;
    // Javascript might not be multi-threaded, but browsers doesn't wait for events to be handled
    // This code requires events to passed one at a time, which cannot be guaranteed !!!!
    static async send(inst, brwevent) {
        EventStack.stack(inst.field, inst, brwevent);
    }
    static async queue(func, event) {
        WatchDog.start();
        EventStack.stack$.unshift({ ext: { func: func, event: event } });
        await EventStack.handle();
    }
    static async stack(field, inst, brwevent) {
        WatchDog.start();
        EventStack.stack$.unshift({ fev: { field: field, inst: inst, brwevent: brwevent.clone() } });
        await EventStack.handle();
    }
    static async handle() {
        if (EventStack.running)
            return;
        EventStack.running = true;
        let cmd = EventStack.stack$.pop();
        if (cmd == undefined) {
            EventStack.running = false;
            return;
        }
        try {
            if (cmd.ext)
                await cmd.ext.func.invoke(cmd.ext.event);
            else
                await cmd.fev.field.performEvent(cmd.fev.inst, cmd.fev.brwevent);
            EventStack.running = false;
            setTimeout(() => { EventStack.handle(); }, 0);
        }
        catch (error) {
            EventStack.stack$ = [];
            EventStack.running = false;
        }
    }
    static clear() {
        EventStack.stack$ = [];
    }
}
