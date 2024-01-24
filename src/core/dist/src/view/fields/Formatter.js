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
/*
 * Pattern consists of fixed text and field definitions enclosed by {}.
 * Fields consists of a list of single character regular expressions.
 * Each expression can be repeated using a preceding multiplier.
 * For shorthand, a number of predefined classes can be used.
 *
 * Example: Flight ID BA-2272
 *
 *  {[A-Z][A-Z]}-{[0-9][0-9][0-9][0-9]}
 * or
 *  {2[A-Z]}-{4[0-9]}
 * or
 *  {AA}-{####}
 * or
 *  {2A}-{4#}
 *
 * Predefined classes:
 *
 *  *  : any
 *  #  : [0-9]
 *  d  : [0-9.-]
 *  a  : [a-z]
 *  A  : [A-Z]
 *  w  : [a-z_0-9]
 *  W  : [A-Z_0-9]
 *  c  : any lowercase character
 *  C  : any uppercase character
 */
import { DataType } from "./DataType.js";
import { MSGGRP } from "../../messages/Internal.js";
import { Messages } from "../../messages/Messages.js";
import { DatePart, dates } from "../../model/dates/dates.js";
var Validity;
(function (Validity) {
    Validity[Validity["na"] = 0] = "na";
    Validity[Validity["true"] = 1] = "true";
    Validity[Validity["false"] = 2] = "false";
    Validity[Validity["asupper"] = 3] = "asupper";
    Validity[Validity["aslower"] = 4] = "aslower";
})(Validity || (Validity = {}));
export class Formatter {
    plen = 0;
    value = "";
    fields = [];
    pattern$ = null;
    placeholder$ = null;
    predefined = "*#dcaAw";
    datetokens = null;
    datatype$ = DataType.string;
    tokens = new Map();
    size() {
        return (this.plen);
    }
    get datatype() {
        return (this.datatype$);
    }
    set datatype(datatype) {
        this.datatype$ = datatype;
        if (datatype == DataType.date || datatype == DataType.datetime) {
            this.datetokens = [];
            let parts = 3;
            let datepattern = "";
            let types = dates.tokenizeFormat();
            types.forEach((type) => {
                if (type.type == DatePart.Year || type.type == DatePart.Month || type.type == DatePart.Day) {
                    parts--;
                    this.datetokens.push(type);
                    datepattern += "{" + type.length + "#}";
                    if (parts > 0)
                        datepattern += type.delimitor;
                }
            });
            if (datatype == DataType.datetime) {
                parts = 3;
                datepattern += " ";
                types.forEach((type) => {
                    if (type.type == DatePart.Hour || type.type == DatePart.Minute || type.type == DatePart.Second) {
                        parts--;
                        this.datetokens.push(type);
                        datepattern += "{" + type.length + "#}";
                        if (parts > 0)
                            datepattern += type.delimitor;
                    }
                });
            }
            this.format = datepattern;
        }
    }
    get placeholder() {
        return (this.placeholder$);
    }
    get format() {
        return (this.pattern$);
    }
    set format(pattern) {
        if (!pattern)
            return;
        let pos = 0;
        let placeholder = "";
        for (let i = 0; i < pattern.length; i++) {
            let c = pattern.charAt(i);
            let esc = this.escaped(pattern, i);
            if (esc) {
                let b = i;
                c = pattern.charAt(++i);
            }
            if (c == '{' && !esc) {
                let fr = i + 1;
                while (i < pattern.length && pattern.charAt(++i) != '}')
                    ;
                if (i == pattern.length)
                    throw "Syntax error in path, non matched {}";
                let def = this.parseFieldDefinition(pattern.substring(fr, i));
                this.fields.push(new Field(this, this.fields.length, pos, pos + def.length));
                def.forEach((token) => { this.tokens.set(pos++, token); placeholder += ' '; });
            }
            else {
                placeholder += pattern.charAt(i);
                this.tokens.set(pos++, new Token('f'));
            }
        }
        if (this.fields.length == 0)
            throw "No input fields defined";
        this.value = placeholder;
        this.pattern$ = pattern;
        this.placeholder$ = placeholder;
        this.plen = placeholder.length;
        this.fields.forEach((fld) => {
            let stop = "";
            for (let i = fld.pos() + fld.size(); i < this.tokens.size; i++) {
                if (this.tokens.get(i).type == 'f')
                    stop += placeholder.charAt(i);
                else
                    break;
            }
            fld.init(stop);
        });
    }
    isNull() {
        for (let i = 0; i < this.fields.length; i++) {
            if (!this.fields[i].isNull())
                return (false);
        }
        return (true);
    }
    last() {
        let tokens = Array.from(this.tokens.values());
        for (let i = tokens.length - 1; i >= 0; i--) {
            if (tokens[i].type != 'f')
                return (i);
        }
        return (0);
    }
    first() {
        let tokens = Array.from(this.tokens.values());
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].type != 'f')
                return (i);
        }
        return (tokens.length);
    }
    modifiable(pos) {
        let token = this.tokens.get(pos);
        return (token != null && token.type != 'f');
    }
    getValue() {
        return (this.value);
    }
    setValue(value) {
        let valid = true;
        this.value = this.placeholder$;
        if (value == null)
            return (true);
        let prefix = 0;
        let postfix = 0;
        let delimiters = [];
        this.fields.forEach((fld) => { delimiters.push(fld.end()); });
        while (prefix < this.tokens.size && this.tokens.get(prefix).type == 'f')
            prefix++;
        while (postfix < this.tokens.size && this.tokens.get(this.tokens.size - postfix - 1).type == 'f')
            postfix++;
        let idx = 0;
        let formatted = true;
        if (prefix > 0 && !value.startsWith(this.placeholder$.substring(0, prefix)))
            formatted = false;
        if (postfix > 0 && !value.endsWith(this.placeholder$.substring(this.placeholder$.length - postfix)))
            formatted = false;
        for (let i = 0; i < delimiters.length; i++) {
            if (delimiters[i].length == 0)
                idx = 1;
            else
                idx = value.indexOf(delimiters[i], idx);
            if (delimiters[i].length > 0 && delimiters[i].trim().length == 0)
                formatted = false;
            if (idx < 0)
                formatted = false;
            idx += delimiters[i].length;
        }
        if (formatted) {
            let fr = prefix;
            let to = prefix;
            let nval = value.substring(0, prefix);
            if (value.length > this.plen) {
                // Often browser inserted a character
                for (let i = 0; i < this.plen && value.length > this.plen; i++) {
                    let c = value.charAt(i);
                    if (!this.isValid(i, c)) {
                        i--;
                        value = value.substring(0, i + 1) + value.substring(i + 2);
                    }
                }
            }
            // trim all fields to the correct length
            for (let i = 0; i < delimiters.length; i++) {
                let size = this.fields[i].size();
                if (delimiters[i].length == 0)
                    to = fr + size;
                else
                    to = value.indexOf(delimiters[i], fr);
                let part = value.substring(fr, to);
                while (part.length < size)
                    part += this.placeholder$.charAt(nval.length + part.length);
                if (part.length > size) {
                    part = part.trim();
                    while (part.length < size)
                        part += this.placeholder$.charAt(nval.length + part.length);
                    while (part.length > size && !this.isValid(nval.length + 1, part.charAt(0)))
                        part = part.substring(1);
                    if (part.length > size)
                        part = part.substring(0, this.fields[i].size());
                }
                nval += part + delimiters[i];
                fr = to + delimiters[i].length;
            }
            nval = nval + value.substring(value.length - postfix);
            // validate each character
            for (let i = 0; i < this.plen && i < nval.length; i++) {
                let c = nval.charAt(i);
                let token = this.tokens.get(i);
                if (token.type != 'f') {
                    if (c != ' ' && !this.setCharacter(i, c)) {
                        this.setBlank(i);
                        valid = false;
                    }
                }
            }
            return (valid);
        }
        let pos = 0;
        value = value.trim();
        for (let i = 0; i < this.plen && pos < value.length; i++) {
            let c = value.charAt(pos);
            let p = this.placeholder$.charAt(i);
            let token = this.tokens.get(i);
            if (token.type == 'f') {
                if (c == p)
                    pos++;
            }
            else {
                if (c == ' ' || this.setCharacter(i, c))
                    pos++;
                else
                    valid = false;
            }
        }
        this.fields.forEach((fld) => { fld.init(); });
        if (pos != value.length)
            valid = false;
        return (valid);
    }
    insCharacter(pos, c) {
        if (!this.isValid(pos, c))
            return (false);
        let field = this.findField(pos);
        if (field == null)
            return (false);
        let p1 = field.pos();
        let p2 = p1 + field.size() - 1;
        let area = [p1, p2];
        let b = this.value.substring(0, pos);
        let f = this.value.substring(pos, area[1]);
        let a = this.value.substring(area[1] + 1);
        let p = "";
        f = this.placeholder$.charAt(b.length) + f;
        while (p.length < f.length)
            p += this.placeholder$.charAt(b.length + p.length);
        this.value = b + p + a;
        for (let i = 1; i < f.length; i++) {
            if (f.charAt(i) != ' ')
                this.setCharacter(b.length + i, f.charAt(i));
        }
        let success = this.setCharacter(pos, c);
        this.validateDateField(pos);
        return (success);
    }
    setCharacter(pos, c) {
        let valid = this.validity(pos, c);
        switch (valid) {
            case Validity.na: return (false);
            case Validity.false: return (false);
            case Validity.asupper:
                c = c.toLocaleUpperCase();
                break;
            case Validity.aslower:
                c = c.toLocaleLowerCase();
                break;
        }
        let a = this.value.substring(pos + 1);
        let b = this.value.substring(0, pos);
        this.value = b + c + a;
        return (true);
    }
    delete(fr, to) {
        let p = "";
        let a = this.value.substring(to);
        let b = this.value.substring(0, fr);
        for (let i = fr; i < to; i++)
            p += this.placeholder$.charAt(i);
        // Set area to pattern
        this.value = b + p + a;
        // Shift rest of last field left
        let field = this.findField(to);
        if (field == null)
            return (this.value);
        let p1 = field.pos();
        let p2 = p1 + field.size() - 1;
        let area = [p1, p2];
        let shft = this.value.substring(to, area[1] + 1);
        p = "";
        if (fr < area[0])
            fr = area[0];
        b = this.value.substring(0, fr);
        a = this.value.substring(area[1] + 1);
        for (let i = fr; i <= area[1]; i++)
            p += this.placeholder$.charAt(i);
        this.value = b + p + a;
        for (let i = 0; i < shft.length; i++) {
            if (shft.charAt(i) != ' ')
                this.setCharacter(b.length + i, shft.charAt(i));
        }
        return (this.value);
    }
    finish() {
        if (DataType[this.datatype].startsWith("date"))
            this.value = this.finishDate();
        return (this.value);
    }
    prev(from) {
        let pos = from - 1;
        while (pos >= 0) {
            if (this.input(pos))
                return (pos);
            pos--;
        }
        return (from);
    }
    next(from) {
        let pos = from + 1;
        while (pos < this.plen) {
            if (this.input(pos))
                return (pos);
            pos++;
        }
        return (from);
    }
    isValid(pos, c) {
        if (c == this.placeholder$.charAt(pos))
            return (true);
        let valid = this.validity(pos, c);
        if (valid == Validity.false || valid == Validity.na)
            return (false);
        return (true);
    }
    validity(pos, c) {
        let lc = c.toLocaleLowerCase();
        let uc = c.toLocaleUpperCase();
        let valid = Validity.false;
        let token = this.tokens.get(pos);
        if (token == null)
            return (Validity.na);
        switch (token.case) {
            case 'u':
                if (token.validate(uc)) {
                    if (c == uc)
                        valid = Validity.true;
                    else
                        valid = Validity.asupper;
                }
                break;
            case 'l':
                if (token.validate(lc)) {
                    if (c == lc)
                        valid = Validity.true;
                    else
                        valid = Validity.asupper;
                }
                break;
            case '?':
                if (lc == uc) {
                    if (token.validate(c))
                        valid = Validity.true;
                }
                else {
                    if (token.validate(c)) {
                        valid = Validity.true;
                    }
                    else if (c != lc && token.validate(lc)) {
                        valid = Validity.aslower;
                    }
                    else if (c != uc && token.validate(uc)) {
                        valid = Validity.asupper;
                    }
                }
                break;
        }
        return (valid);
    }
    input(pos) {
        if (pos < 0 || pos > this.placeholder$.length - 1)
            return (false);
        let token = this.tokens.get(pos);
        return (token.type != 'f');
    }
    setBlank(pos) {
        let a = this.value.substring(pos + 1);
        let b = this.value.substring(0, pos);
        this.value = b + ' ' + a;
        return (true);
    }
    findField(pos) {
        for (let i = 0; i < this.fields.length; i++) {
            let field = this.fields[i];
            if (pos >= field.pos$ && pos <= field.last)
                return (field);
        }
        return (null);
    }
    getstring(fr, to) {
        return (this.value.substring(fr, to));
    }
    setstring(pos, value) {
        this.value = this.replace(this.value, pos, value);
    }
    replace(str, pos, val) {
        return (str.substring(0, pos) + val + str.substring(pos + val.length));
    }
    finishDate() {
        let empty = false;
        let input = this.getValue();
        let today = dates.format(new Date());
        if (this.isNull())
            return (this.value);
        this.datetokens.forEach((part) => {
            empty = true;
            for (let i = part.pos; i < part.pos + part.length; i++)
                if (input.charAt(i) != ' ')
                    empty = false;
            if (!empty) {
                let fld = input.substring(part.pos, part.pos + part.length);
                fld = fld.trim();
                if (part.type == DatePart.Year && fld.length == 2)
                    fld = today.substring(part.pos, part.pos + 2) + fld;
                while (fld.length < part.length)
                    fld = ' ' + fld;
                for (let i = 0; i < fld.length; i++) {
                    if (fld.charAt(i) == ' ')
                        fld = this.replace(fld, i, '0');
                }
                input = input.substring(0, part.pos) + fld + input.substring(part.pos + part.length);
            }
            if (empty) {
                input = input.substring(0, part.pos) +
                    today.substring(part.pos, part.pos + part.length) +
                    input.substring(part.pos + part.length);
            }
        });
        this.value = input;
        let dayentry = -1;
        for (let i = 0; i < this.datetokens.length; i++) {
            if (this.datetokens[i].type == DatePart.Day)
                dayentry = i;
        }
        if (dayentry < 0) {
            if (dates.parse(this.value) == null) {
                // Not a valid date input
                Messages.warn(MSGGRP.FRAMEWORK, 20, input);
                return (null);
            }
        }
        else {
            let date = dates.parse(this.value);
            for (let i = 0; date == null && i < 3; i++) {
                let day = +this.fields[dayentry].getValue();
                this.fields[dayentry].setValue("" + (day - 1));
                date = dates.parse(this.value);
            }
            if (date == null) {
                // Not a valid date input
                Messages.warn(MSGGRP.FRAMEWORK, 20, input);
                return (null);
            }
        }
        return (this.value);
    }
    validateDateField(pos) {
        if (!DataType[this.datatype$].startsWith("date"))
            return;
        let field = this.findField(pos);
        let token = this.datetokens[field.field()];
        let maxval = 0;
        let minval = 0;
        let value = field.getValue();
        switch (token.type) {
            case DatePart.Hour:
                maxval = 23;
                break;
            case DatePart.Minute:
                maxval = 59;
                break;
            case DatePart.Second:
                maxval = 59;
                break;
            case DatePart.Day:
                minval = 1;
                maxval = 31;
                break;
            case DatePart.Month:
                minval = 1;
                maxval = 12;
                break;
        }
        if (value.trim().length > 0) {
            if (maxval > 0 && +value > maxval)
                field.setValue("" + maxval);
            if (minval > 0 && +value < minval)
                field.setValue("0" + minval);
        }
    }
    parseFieldDefinition(field) {
        let tokens = [];
        for (let i = 0; i < field.length; i++) {
            let repeat = "1";
            let c = field.charAt(i);
            if (c >= '0' && c <= '9') {
                repeat = "";
                while (c >= '0' && c <= '9' && i < field.length) {
                    repeat += c;
                    c = field.charAt(++i);
                }
                if (i == field.length)
                    throw "Syntax error in expression, '" + this.predefined + "' or '[]' expected";
            }
            if (this.predefined.includes(c)) {
                for (let f = 0; f < +repeat; f++)
                    tokens.push(new Token(c));
            }
            else {
                let expr = "";
                if (c != '[')
                    throw "Syntax error in expression, '" + this.predefined + "' or '[]' expected";
                c = field.charAt(++i);
                let esc = false;
                while ((c != ']' || esc) && i < field.length) {
                    expr += c;
                    c = field.charAt(i + 1);
                    esc = this.escaped(field, i++);
                }
                if (c != ']')
                    throw "Syntax error in path, non matched []";
                for (let f = 0; f < +repeat; f++)
                    tokens.push(new Token('x').setRegx("[" + expr + "]"));
            }
        }
        return (tokens);
    }
    escaped(str, pos) {
        if (pos == str.length + 1)
            return (false);
        let e = str.charAt(pos);
        let c = str.charAt(pos + 1);
        return (e == '\\' && c != '\\');
    }
}
class Field {
    pattern;
    fn = 0;
    pos$ = 0;
    last$ = 0;
    size$ = 0;
    end$ = null;
    value$ = null;
    constructor(pattern, fn, fr, to) {
        this.pattern = pattern;
        this.fn = fn;
        this.pos$ = fr;
        this.last$ = to - 1;
        this.size$ = to - fr;
    }
    pos() {
        return (this.pos$);
    }
    end() {
        return (this.end$);
    }
    get last() {
        return (this.last$);
    }
    size() {
        return (this.size$);
    }
    field() {
        return (this.fn);
    }
    isNull() {
        let empty = true;
        let value = this.pattern.getValue();
        let pattern = this.pattern.placeholder;
        for (let i = 0; i < pattern.length; i++) {
            let c = value.charAt(i);
            let p = pattern.charAt(i);
            if (c != p) {
                empty = false;
                break;
            }
        }
        return (empty);
    }
    getValue() {
        return (this.pattern.getstring(this.pos$, this.last + 1));
    }
    setValue(value) {
        if (value == null)
            value = "";
        while (value.length < this.size$)
            value += " ";
        if (value.length > this.size$)
            value = value.substring(0, this.size$);
        this.pattern.setstring(this.pos$, value);
    }
    init(end) {
        if (end != null)
            this.end$ = end;
        this.value$ = this.getValue();
    }
    toString() {
        return ("#" + this.fn + " pos: " + this.pos$ + " size: " + this.size$ + " " + this.end$);
    }
}
class Token {
    type$ = 'f';
    case$ = '?';
    expr$ = null;
    regex = null;
    constructor(type) {
        this.setType(type);
    }
    get type() {
        return (this.type$);
    }
    get case() {
        return (this.case$);
    }
    setType(type) {
        this.type$ = type;
        switch (type) {
            case "c":
                this.setCase('l');
                break;
            case "C":
                this.setCase('u');
                break;
            case "#":
                this.setRegx("[0-9]");
                break;
            case "d":
                this.setRegx("[0-9.-]");
                break;
            case "a":
                this.setRegx("[a-z]").setCase('l');
                break;
            case "A":
                this.setRegx("[A-Z]").setCase('u');
                break;
            case "w":
                this.setRegx("[a-zA-Z_0-9]").setCase('l');
                break;
            case "W":
                this.setRegx("[a-zA-Z_0-9]").setCase('u');
                break;
        }
        return (this);
    }
    setCase(type) {
        this.case$ = type;
        return (this);
    }
    setRegx(expr) {
        this.expr$ = expr;
        this.regex = new RegExp(expr);
        return (this);
    }
    validate(c) {
        switch (this.type$.toLowerCase()) {
            case "*": return (true);
            case "f": return (false);
            case "c": return (c.toLocaleLowerCase() != c.toLocaleUpperCase());
        }
        return (this.regex.test(c));
    }
    toString() {
        return (this.type$ + "[" + this.case$ + "]");
    }
}
