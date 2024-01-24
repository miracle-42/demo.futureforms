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
import { Framework } from "../../application/Framework.js";
import { Properties, ScrollDirection } from "../../application/Properties.js";
export class BrowserEvent {
    event$;
    type$;
    wait$ = false;
    dseq = 0;
    useq = 0;
    repeat$ = false;
    key = null;
    ctrlkey = null;
    funckey = null;
    mark = false;
    undo = false;
    copy = false;
    paste = false;
    accept = false;
    custom = false;
    cancel = false;
    ignore = false;
    prevent = false;
    modified = false;
    mousedown = false;
    mouseinit = false;
    mousemark = false;
    printable$ = false;
    alt = false;
    ctrl = false;
    meta = false;
    shift = false;
    static instance = null;
    static DBLClickDetection = 250;
    static ctrmod = BrowserEvent.detect();
    static detect() {
        let os = navigator.platform;
        if (os == null)
            throw "@BrowserEvent: Unable to detect platform";
        if (os.startsWith("Mac"))
            return ("meta");
        return ("ctrl");
    }
    static get() {
        if (BrowserEvent.instance == null)
            BrowserEvent.instance = new BrowserEvent();
        return (BrowserEvent.instance);
    }
    constructor() {
    }
    setFocusEvent() {
        this.reset();
        this.event$ = { type: "focus" };
    }
    setKeyEvent(key) {
        this.reset();
        let event = {
            type: "keydown",
            key: key.key,
            altKey: key.alt,
            ctrlKey: key.ctrl,
            metaKey: key.meta,
            shiftKey: key.shift
        };
        this.setEvent(event);
    }
    setEvent(event) {
        this.event$ = event;
        this.type$ = event.type;
        let bubble = false;
        Framework.setEvent(event);
        if (this.type == "mouseout")
            bubble = true;
        if (this.type == "mouseover")
            bubble = true;
        if (this.type.includes("drag"))
            bubble = true;
        if (!bubble && event["stopPropagation"])
            event.stopPropagation();
        // Checkboxes and radio fires click on change
        if (this.type == "change")
            this.wait$ = false;
        if (!this.isKeyEvent)
            this.reset();
        else
            this.KeyEvent();
        if (this.isMouseEvent)
            this.mouseEvent();
        // could have been set outside this window
        if (event.altKey != null)
            this.alt = event.altKey;
        if (event.ctrlKey != null)
            this.ctrl = event.ctrlKey;
        if (event.metaKey != null)
            this.meta = event.metaKey;
        if (event.shiftKey != null)
            this.shift = event.shiftKey;
    }
    get event() {
        return (this.event$);
    }
    reset() {
        this.key = null;
        this.mark = false;
        this.undo = false;
        this.copy = false;
        this.paste = false;
        this.accept = false;
        this.cancel = false;
        this.ignore = false;
        this.prevent = false;
        this.modified = false;
        this.mouseinit = false;
        this.custom = false;
        this.printable$ = false;
        this.ctrlkey = null;
        this.funckey = null;
    }
    get undoing() {
        if (this.type != "keyup")
            return (false);
        return (this.undo);
    }
    get pasting() {
        if (this.type != "keyup")
            return (false);
        return (this.paste);
    }
    get isMouseEvent() {
        if (this.event.type == "wheel")
            return (true);
        if (this.event.type == "contextmenu")
            return (true);
        if (this.event.type.includes("drag"))
            return (true);
        if (this.event.type?.includes("click"))
            return (true);
        if (this.event.type?.startsWith("mouse"))
            return (true);
        return (false);
    }
    get bubbleMouseEvent() {
        if (this.type == "contextmenu")
            return (true);
        if (this.type.includes("drag"))
            return (true);
        if (this.type.includes("click"))
            return (true);
        return (false);
    }
    get isKeyEvent() {
        return (this.event.type?.startsWith("key") && this.event.key != null);
    }
    get isPrintableKey() {
        if (this.ctrlkey != null)
            return (false);
        if (this.funckey != null)
            return (false);
        return (this.key != null && this.key.length == 1);
    }
    get onFuncKey() {
        if (this.event.type != "keyup")
            return (false);
        return (this.funckey != null && this.event.key?.startsWith("F") && this.event.key.length > 1);
    }
    get onScrollUp() {
        if (this.type != "wheel" || this.event.deltaY == 0)
            return (false);
        if (this.event.deltaY > 0 && Properties.MouseScrollDirection == ScrollDirection.Up)
            return (true);
        if (this.event.deltaY < 0 && Properties.MouseScrollDirection == ScrollDirection.Down)
            return (true);
        return (false);
    }
    get onScrollDown() {
        if (this.type != "wheel" || this.event.deltaY == 0)
            return (false);
        if (this.event.deltaY < 0 && Properties.MouseScrollDirection == ScrollDirection.Up)
            return (true);
        if (this.event.deltaY > 0 && Properties.MouseScrollDirection == ScrollDirection.Down)
            return (true);
        return (false);
    }
    get onCtrlKeyDown() {
        return (this.ctrlkey != null && this.type == "keydown");
    }
    get type() {
        return (this.type$);
    }
    get waiting() {
        return (this.wait$);
    }
    get basetype() {
        return (this.event$.type);
    }
    set type(type) {
        this.type$ = type;
    }
    get repeat() {
        if (this.key == null)
            return (false);
        if (this.alt || this.ctrl || this.meta)
            return (false);
        return (this.type == "keydown" && this.repeat$);
    }
    get printable() {
        if (this.repeat && this.isPrintableKey)
            return (true);
        else
            return (this.type == "keyup" && this.printable$);
    }
    get modifier() {
        return (this.alt || this.ctrl || this.meta || this.shift);
    }
    preventDefault(flag) {
        if (flag == null)
            flag = this.prevent;
        if (flag)
            this.event.preventDefault();
    }
    KeyEvent() {
        this.mark = false;
        this.copy = false;
        this.accept = false;
        this.cancel = false;
        this.custom = false;
        this.printable$ = false;
        switch (this.event.type) {
            case "keyup":
                this.ignore = true;
                this.useq = this.dseq;
                if (!this.alt && !this.ctrl && !this.meta) {
                    if (this.event.key?.length == 1) {
                        this.ignore = false;
                        this.printable$ = true;
                        this.custom = false;
                        this.key = this.event.key;
                    }
                }
                if (this.key == "Backspace")
                    this.ignore = false;
                if (this.event.key == "Delete")
                    this.ignore = false;
                if (this.event.key == "PageUp")
                    this.ignore = false;
                if (this.event.key == "PageDown")
                    this.ignore = false;
                if (this.event.key == "ArrowLeft")
                    this.ignore = false;
                if (this.event.key == "ArrowRight")
                    this.ignore = false;
                if (this.event.key == "Tab") {
                    this.custom = true;
                    this.ignore = false;
                }
                if (this.event.key == "PageUp") {
                    this.custom = true;
                    this.ignore = false;
                }
                if (this.event.key == "PageDown") {
                    this.custom = true;
                    this.ignore = false;
                }
                if (this.event.key == "ArrowUp") {
                    this.custom = true;
                    this.ignore = false;
                }
                if (this.event.key == "ArrowDown") {
                    this.custom = true;
                    this.ignore = false;
                }
                if (this.event.key == "Alt") {
                    this.ignore = true;
                    this.alt = false;
                }
                if (this.event.key == "Meta") {
                    this.ignore = true;
                    this.meta = false;
                }
                if (this.event.key == "Shift") {
                    this.ignore = true;
                    this.shift = false;
                }
                if (this.event.key == "Control") {
                    this.ignore = true;
                    this.ctrl = false;
                }
                if (this.event.key == "Enter") {
                    this.custom = true;
                    this.accept = true;
                    this.ignore = false;
                }
                if (this.event.key == "Escape") {
                    this.custom = true;
                    this.cancel = true;
                    this.ignore = false;
                }
                if (this.ctrlkey != null)
                    this.ignore = false;
                if (this.key != null && this.key.startsWith("F") && this.event.key.length > 1)
                    this.ignore = false;
                break;
            case "keypress":
                this.ignore = true;
                this.custom = false;
                this.key = this.event.key;
                if (this.event.key.length == 1)
                    this.printable$ = true;
                break;
            case "keydown":
                this.ignore = true;
                this.prevent = false;
                this.custom = false;
                this.printable$ = false;
                this.repeat$ = (this.dseq != this.useq && this.event.key == this.key);
                this.dseq = (++this.dseq % 32768);
                this.ctrlkey = null;
                this.funckey = null;
                this.key = this.event.key;
                if (this.key.length == 1 && (this.alt || this.ctrl || this.meta)) {
                    this.ignore = false;
                    if (this.alt)
                        this.ctrlkey = "ALT-" + this.key;
                    if (this.ctrl)
                        this.ctrlkey = "CTRL-" + this.key;
                    if (this.meta)
                        this.ctrlkey = "META-" + this.key;
                    switch (this.key) {
                        case '+':
                        case '-':
                        case '@':
                        case 'a':
                        case 'c':
                        case 'x':
                        case 'v':
                        case 'r':
                        case 'z': break;
                        default: this.prevent = true;
                    }
                    let mod = false;
                    if (BrowserEvent.ctrmod == "ctrl" && this.ctrl)
                        mod = true;
                    if (BrowserEvent.ctrmod == "meta" && this.meta)
                        mod = true;
                    if (mod && this.key == 'a')
                        this.mark = true;
                    if (mod && this.key == 'c')
                        this.copy = true;
                    if (mod && this.key == 'z')
                        this.undo = true;
                    else
                        this.undo = false;
                    if (mod && this.key == 'v')
                        this.paste = true;
                    else
                        this.paste = false;
                }
                else {
                    this.undo = false;
                    this.paste = false;
                }
                if (this.key == "Alt")
                    this.alt = true;
                if (this.key == "Meta")
                    this.meta = true;
                if (this.key == "Shift")
                    this.shift = true;
                if (this.key == "Control")
                    this.ctrl = true;
                if (this.key == "Tab")
                    this.prevent = true;
                if (this.key == "Enter")
                    this.prevent = true;
                if (this.key == "Escape")
                    this.prevent = true;
                if (this.key == "PageUp")
                    this.prevent = true;
                if (this.key == "PageDown")
                    this.prevent = true;
                if (this.key == "ArrowUp")
                    this.prevent = true;
                if (this.key == "ArrowDown")
                    this.prevent = true;
                if (this.key == "Tab" && this.repeat$) {
                    this.ignore = false;
                    this.custom = true;
                    this.prevent = true;
                }
                if (this.key == "ArrowUp" && this.repeat$) {
                    this.ignore = false;
                    this.custom = true;
                    this.prevent = true;
                }
                if (this.key == "ArrowDown" && this.repeat$) {
                    this.ignore = false;
                    this.custom = true;
                    this.prevent = true;
                }
                if (this.key?.startsWith("F") && this.event.key?.length > 1) {
                    this.prevent = true;
                    this.funckey = this.key;
                }
                break;
            default:
                this.key = null;
                this.ignore = true;
                this.prevent = false;
                this.custom = false;
                this.printable$ = false;
                break;
        }
    }
    async wait() {
        for (let i = 0; i < 10 && this.wait$; i++)
            await new Promise(resolve => setTimeout(resolve, BrowserEvent.DBLClickDetection / 10));
        this.wait$ = false;
        this.type = this.event.type;
    }
    mouseEvent() {
        this.reset();
        if (this.event.type == "click") {
            if (this.wait$)
                return;
            this.type = "wait";
            this.wait$ = true;
            setTimeout(() => { this.wait$ = false; }, BrowserEvent.DBLClickDetection);
        }
        if (this.event.type == "dblclick") {
            this.type = "skip";
            this.wait$ = false;
        }
        if (this.type == "contextmenu")
            this.prevent = true;
        if (this.type == "mouseup") {
            this.mousedown = false;
            setTimeout(() => { this.mousemark = false; }, 0);
        }
        if (this.type == "mousedown") {
            this.mousedown = true;
            this.mousemark = false;
        }
        if (this.onScrollUp || this.onScrollDown)
            this.prevent = true;
        let first = !this.mousemark;
        if (this.type == "mousemove" && this.mousedown) {
            this.mousemark = true;
            this.mouseinit = first;
        }
    }
    clone() {
        let clone = new BrowserEvent();
        for (let attr in this) {
            let name = attr;
            clone[name] = this[name];
        }
        return (clone);
    }
    toString() {
        return (this.type + " prevent: " + this.prevent + " ignore: " + this.ignore + " printable: " + this.printable + " key: " + this.key + " navigation: " + this.custom);
    }
}
