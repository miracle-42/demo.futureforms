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
import { KeyCodes } from "./KeyCodes.js";
/**
 * Map over key events
 * Can be overridden by application
 */
export class KeyMap {
    static copy = new KeyMap({ key: 'c', ctrl: true });
    static undo = new KeyMap({ key: 'z', ctrl: true });
    static paste = new KeyMap({ key: 'v', ctrl: true });
    static dump = new KeyMap({ key: KeyCodes.f12, shift: true }, "debug", "Debug");
    static now = new KeyMap({ key: ' ', ctrl: true }, "now", "Todays date");
    static commit = new KeyMap({ key: KeyCodes.f10 }, "commit", "commit all transactions");
    static rollback = new KeyMap({ key: KeyCodes.f12 }, "rollback", "rollback all transactions");
    static refresh = new KeyMap({ key: 'u', ctrl: true }, "refresh", "Refresh value from backend");
    static clearblock = new KeyMap({ key: KeyCodes.f4 }, "clear block", "clear block");
    static clearform = new KeyMap({ key: KeyCodes.f4, shift: true }, "clear form", "clear form");
    static enterquery = new KeyMap({ key: KeyCodes.f7 }, "enter query", "start query by example mode");
    static executequery = new KeyMap({ key: KeyCodes.f8 }, "execute query", "execute query");
    static lastquery = new KeyMap({ key: KeyCodes.f7, shift: true }, "last query", "recall last query");
    static queryeditor = new KeyMap({ key: KeyCodes.f7, ctrl: true }, "advanced query", "enter advanced query criterias");
    static space = new KeyMap({ key: ' ' });
    static enter = new KeyMap({ key: KeyCodes.Enter });
    static escape = new KeyMap({ key: KeyCodes.Escape });
    static pageup = new KeyMap({ key: KeyCodes.ArrowUp, shift: true }, "previous page", "scroll up");
    static pagedown = new KeyMap({ key: KeyCodes.ArrowDown, shift: true }, "next page", "scroll down");
    static nextfield = new KeyMap({ key: KeyCodes.Tab });
    static prevfield = new KeyMap({ key: KeyCodes.Tab, shift: true });
    static prevrecord = new KeyMap({ key: KeyCodes.ArrowUp });
    static nextrecord = new KeyMap({ key: KeyCodes.ArrowDown });
    static prevblock = new KeyMap({ key: KeyCodes.PageUp }, "previous block", "go to previous block");
    static nextblock = new KeyMap({ key: KeyCodes.PageDown }, "next block", "go to next block");
    static delete = new KeyMap({ key: KeyCodes.f6 }, "delete", "delete record");
    static insert = new KeyMap({ key: KeyCodes.Enter, shift: true }, "insert", "insert record");
    static insertAbove = new KeyMap({ key: KeyCodes.Enter, ctrl: true }, "insert above", "insert record above the current");
    static lov = new KeyMap({ key: KeyCodes.f9 }, "list of values", "show valid values");
    static calendar = new KeyMap({ key: KeyCodes.f9 }, "datepicker", "show datepicker");
    static from(key) {
        return (KeyMap[key]);
    }
    static list(map) {
        let list = [];
        if (!map)
            map = KeyMap;
        else
            list = KeyMap.list();
        Object.keys(map).forEach((mapped) => {
            if (map[mapped] != null && (map[mapped] instanceof KeyMap)) {
                if (map[mapped].name && map[mapped].desc) {
                    let key = [];
                    key.push(map[mapped].toString());
                    key.push(map[mapped].name);
                    key.push(map[mapped].desc);
                    list.push(key);
                }
            }
        });
        list.sort((k0, k1) => {
            if (k0[1] > k1[1])
                return (1);
            if (k0[1] < k1[1])
                return (-1);
            return (0);
        });
        let unique = [];
        list.forEach((entry) => {
            let len = unique.length;
            let last = len > 0 ? unique[len - 1][1] : null;
            if (entry[1] != last)
                unique.push(entry);
        });
        return (unique);
    }
    key$;
    name$;
    desc$;
    alt$;
    ctrl$;
    meta$;
    shift$;
    signature$ = null;
    constructor(def, name, desc) {
        if (def == null)
            return;
        if (def.shift == null) {
            if (def.key == def.key.toUpperCase() && def.key != def.key.toLowerCase())
                def.shift = true;
        }
        this.name = name;
        this.desc = desc;
        this.key$ = def.key.toLowerCase();
        this.alt$ = (def.alt ? true : false);
        this.ctrl$ = (def.ctrl ? true : false);
        this.meta$ = (def.meta ? true : false);
        this.shift$ = (def.shift ? true : false);
        this.signature$ = "" + this.key$ + "|";
        this.signature$ += (this.alt$ ? 't' : 'f');
        this.signature$ += (this.ctrl$ ? 't' : 'f');
        this.signature$ += (this.meta$ ? 't' : 'f');
        this.signature$ += (this.shift$ ? 't' : 'f');
    }
    get name() {
        return (this.name$);
    }
    set name(name) {
        this.name$ = name;
    }
    get desc() {
        return (this.desc$);
    }
    set desc(desc) {
        this.desc$ = desc;
    }
    get key() {
        return (this.key$);
    }
    get alt() {
        return (this.alt$);
    }
    get ctrl() {
        return (this.ctrl$);
    }
    get meta() {
        return (this.meta$);
    }
    get shift() {
        return (this.shift$);
    }
    get signature() {
        return (this.signature$);
    }
    get definition() {
        let def = {
            key: this.key$,
            alt: this.alt$,
            ctrl: this.ctrl$,
            meta: this.meta$,
            shift: this.shift$
        };
        return (def);
    }
    setSignature(def) {
        this.key$ = def.key;
        this.alt$ = def.alt;
        this.ctrl$ = def.ctrl;
        this.meta$ = def.meta;
        this.shift$ = def.shift;
        this.signature$ = "" + this.key$ + "|";
        this.signature$ += (this.alt$ ? 't' : 'f');
        this.signature$ += (this.ctrl$ ? 't' : 'f');
        this.signature$ += (this.meta$ ? 't' : 'f');
        this.signature$ += (this.shift$ ? 't' : 'f');
    }
    toString() {
        let str = "";
        if (this.ctrl$)
            str += "ctrl";
        if (this.alt$) {
            if (str.length > 0)
                str += " + ";
            str += "alt";
        }
        if (this.shift$) {
            if (str.length > 0)
                str += " + ";
            str += "shift";
        }
        if (this.meta$) {
            if (str.length > 0)
                str += " + ";
            str += "meta";
        }
        if (str.length > 0)
            str += " ";
        if (this.key$ == ' ')
            str += "space";
        else
            str += this.key$;
        return (str);
    }
}
export class KeyMapping {
    static map = null;
    static init() {
        KeyMapping.map = new Map();
        Object.keys(KeyMap).forEach((mapped) => {
            if (KeyMap[mapped] != null && (KeyMap[mapped] instanceof KeyMap))
                KeyMapping.add(KeyMap[mapped]);
        });
    }
    static update(map) {
        Object.keys(map).forEach((mapped) => {
            if (map[mapped] != null && (map[mapped] instanceof KeyMap)) {
                let existing = KeyMapping.get(KeyMap[mapped]?.signature);
                if (existing == null)
                    KeyMapping.add(map[mapped]);
                else {
                    let def = map[mapped].definition;
                    map[mapped] = existing;
                    KeyMapping.remove(existing);
                    existing.setSignature(def);
                    KeyMapping.add(existing);
                }
            }
        });
    }
    static isRowNav(key) {
        switch (key) {
            case KeyMap.prevfield: return (true);
            case KeyMap.nextfield: return (true);
            default: return (false);
        }
    }
    static isBlockNav(key) {
        switch (key) {
            case KeyMap.pageup: return (true);
            case KeyMap.pagedown: return (true);
            case KeyMap.prevrecord: return (true);
            case KeyMap.nextrecord: return (true);
            default: return (false);
        }
    }
    static isFormNav(key) {
        switch (key) {
            case KeyMap.prevblock: return (true);
            case KeyMap.nextblock: return (true);
            default: return (false);
        }
    }
    static add(keymap) {
        if (keymap != null && KeyMapping.map.get(keymap.signature) == null)
            KeyMapping.map.set(keymap.signature, keymap);
    }
    static remove(keymap) {
        KeyMapping.map.delete(keymap.signature);
    }
    static get(signature, validated) {
        if (!signature)
            return (null);
        if (!validated)
            signature = KeyMapping.complete(signature);
        let key = KeyMapping.map.get(signature);
        if (key == null)
            key = KeyMapping.create(signature);
        return (key);
    }
    static parseBrowserEvent(event) {
        if (event.key == null)
            return (null);
        let key = event.key.toLowerCase();
        let signature = key + "|";
        signature += event.alt ? 't' : 'f';
        signature += event.ctrl ? 't' : 'f';
        signature += event.meta ? 't' : 'f';
        signature += event.shift ? 't' : 'f';
        return (KeyMapping.get(signature, true));
    }
    static complete(signature) {
        let pos = signature.indexOf('|');
        if (pos <= 0) {
            signature += "|";
            pos = signature.length - 1;
        }
        while (signature.length - pos < 5)
            signature += 'f';
        return (signature);
    }
    static create(signature) {
        let pos = signature.indexOf('|');
        let key = signature.substring(0, pos);
        let a = signature.substring(pos + 1, pos + 2);
        let c = signature.substring(pos + 2, pos + 3);
        let m = signature.substring(pos + 3, pos + 4);
        let s = signature.substring(pos + 4, pos + 5);
        let def = {
            key: key,
            alt: (a == 't' ? true : false),
            ctrl: (c == 't' ? true : false),
            meta: (m == 't' ? true : false),
            shift: (s == 't' ? true : false),
        };
        let keymap = new KeyMap(def);
        KeyMapping.map.set(keymap.signature, keymap);
        return (keymap);
    }
}
