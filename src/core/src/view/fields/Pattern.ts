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
 * Pattern consists of fixed text and fields enclosed by {}.
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

import { Pattern as PatternType, Section, Validity } from "./interfaces/Pattern.js";


export class Pattern implements PatternType
{
    private pos:number = 0;
    private plen:number = 0;
    private fldno:number = 0;
    private value:string = "";
    private fields:Field[] = [];
    private pattern$:string = null;
    private placeholder$:string = null;
    private predefined:string = "*#dcaAw";
    private tokens:Map<number,Token> = new Map<number,Token>();

    constructor(pattern:string)
    {
        if (pattern != null)
            this.setPattern(pattern);
    }

    public size() : number
    {
        return(this.plen);
    }

    public isNull(): boolean
    {
        for (let i = 0; i < this.fields.length; i++)
        {
            if (!this.fields[i].isNull())
                return(false);
        }

        return(true);
    }

    public getValue() : string
    {
        return(this.value);
    }

    public getPosition(): number
    {
        return(this.pos);
    }

    public getPattern(): string
    {
        return(this.pattern$);
    }

    public getPlaceholder(): string
    {
        return(this.placeholder$);
    }

    public setPattern(pattern:string) : void
    {
        let pos:number = 0;
        let placeholder:string = "";

        for (let i = 0; i < pattern.length; i++)
        {
            let c:string = pattern.charAt(i);
            let esc:boolean = this.escaped(pattern,i);

            if (esc)
            {
                let b=i;
                c = pattern.charAt(++i);
            }

            if (c == '{' && !esc)
            {
                let fr:number = i+1;
                while(i < pattern.length && pattern.charAt(++i) != '}');

                if (i == pattern.length)
                    throw "Syntax error in path, non matched {}";

                let def:Token[] = this.parseFieldDefinition(pattern.substring(fr,i));
                this.fields.push(new Field(this,this.fields.length,pos,pos+def.length));
                def.forEach((token) => {this.tokens.set(pos++,token); placeholder += ' '});
            }
            else
            {
                placeholder += pattern.charAt(i);
                this.tokens.set(pos++,new Token('f'));
            }
        }

        if (this.fields.length == 0)
            throw "No input fields defined";

        this.value = placeholder;
        this.pattern$ = pattern;
        this.placeholder$ = placeholder;
        this.plen = placeholder.length;
        this.fields.forEach((fld) => {fld.init()});
    }

    public getField(n:number) : Field
    {
        if (n < this.fields.length)
            return(this.fields[n]);
        return(null);
    }

	public getFields() : Section[]
	{
		return(this.fields);
	}

    public findField(pos:number) : Field
    {
        if (pos == null) pos = this.pos;

        for (let i = 0; i < this.fields.length; i++)
        {
            let field:Field = this.fields[i];
            if (pos >= field.pos$ && pos <= field.last)
                return(field);
        }
        return(null);
    }

    public input(pos:number) : boolean
    {
        if (pos < 0 || pos > this.placeholder$.length-1)
            return(false);

        let token:Token = this.tokens.get(pos);
        return(token.type != 'f');
    }

    public setValue(value:string) : boolean
    {
		let valid:boolean = true;
		this.value = this.placeholder$;

		if (value == null)
            return(true);

        let pos:number = 0;
		value = value.trim();

        for(let i = 0; i < this.plen && pos < value.length; i++)
        {
            let c = value.charAt(pos);
            let p = this.placeholder$.charAt(i);
            let token:Token = this.tokens.get(i);

            if (token.type == 'f')
            {
                if (c == p)
					pos++;
            }
            else
            {
				if (c == ' ' || this.setCharacter(i,c)) pos++;
				else valid = false;
            }
        }

		this.fields.forEach((fld) => {fld.init()});

		if (pos != value.length)
			valid = false;

		return(valid);
    }

    public setPosition(pos:number) : boolean
    {
        if (pos < 0 || pos >= this.plen)
            return(false);

        if (this.tokens.get(pos).type != 'f')
        {
            this.pos = pos;
            this.onfield();
            return(true);
        }

        return(false);
    }

    public findPosition(pos:number) : number
    {
		if (pos >= this.placeholder$.length)
			return(this.placeholder$.length-1);

        if (this.tokens.get(pos).type == 'f')
        {
            let fr:number = pos;
            let to:number = pos;

            let dist1:number = 0;
            let dist2:number = 0;

            while(fr > 0 && this.tokens.get(fr).type == 'f') fr--;
            while(to < this.placeholder$.length-1 && this.tokens.get(to).type == 'f') to++;

            if (fr == 0 && this.tokens.get(fr).type == 'f')
                fr = to;

            if (to == this.placeholder$.length-1 && this.tokens.get(to).type == 'f')
                to = fr;

            dist1 = pos - fr;
            dist2 = to - pos;

			pos = fr;

            if (dist2 < dist1)
                pos = to;
        }

		return(pos);
    }

    public setCharacter(pos:number, c:string) : boolean
    {
        if (!this.setPosition(pos))
            return(false);

        let valid:Validity = this.validity(pos,c);

        switch(valid)
        {
            case Validity.na : return(false);
            case Validity.false : return(false);
            case Validity.asupper : c = c.toLocaleUpperCase(); break;
            case Validity.aslower : c = c.toLocaleLowerCase(); break;
        }

        let a:string = this.value.substring(this.pos+1);
        let b:string = this.value.substring(0,this.pos);

        this.value = b + c + a;
        return(true);
    }

	public isValid(pos: number, c: string) : boolean
	{
		let valid:Validity = this.validity(pos,c);

		if (valid == Validity.false || valid == Validity.na)
			return(false);

		return(true);
	}

    public validity(pos:number, c:string) : Validity
    {
        let lc = c.toLocaleLowerCase();
        let uc = c.toLocaleUpperCase();

        let valid:Validity = Validity.false;
        let token:Token = this.tokens.get(pos);

        if (token == null)
            return(Validity.na);

        switch(token.case)
        {
            case 'u':
                if (token.validate(uc))
                {
                    if (c == uc) valid = Validity.true;
                    else         valid = Validity.asupper;
                }
            break;

            case 'l':
                if (token.validate(lc))
                {
                    if (c == lc) valid = Validity.true;
                    else         valid = Validity.asupper;
                }
            break;

            case '?':
                if (lc == uc)
                {
                    if (token.validate(c))
                        valid = Validity.true;
                }
                else
                {
                    if (token.validate(c))
                    {
                        valid = Validity.true;
                    }
                    else if (c != lc && token.validate(lc))
                    {
                        valid = Validity.aslower;
                    }
                    else if (c != uc && token.validate(uc))
                    {
                        valid = Validity.asupper;
                    }
                }
            break;
        }

        return(valid);
    }

    public delete(fr:number, to:number) : string
    {
        if (fr == to)
        {
            fr--;
            if (fr < 0) return(this.value);

            if (!this.setPosition(fr))
                return(this.value);
        }

        let p:string = "";
        let a:string = this.value.substring(to);
        let b:string = this.value.substring(0,fr);

        for(let i = fr; i < to; i++)
            p += this.placeholder$.charAt(i);

        this.value = b + p + a;

        this.setPosition(fr);

        if (to - fr > 1)
        {
            let curr:Field = this.findField(fr);
            if (curr != null) this.fldno = curr.fn;
        }

        return(this.value);
    }

    public getFieldArea(pos:number) : number[]
    {
        if (pos < 0) pos = 0;
        if (pos >= this.plen) pos = this.plen - 1;

        let fr:number = pos;
        let to:number = pos;
        let token:Token = this.tokens.get(pos);

        if (token.type == 'f')
        {
            let dist1:number = 0;
            let dist2:number = 0;

            while(fr > 0 && this.tokens.get(fr).type == 'f') fr--;
            while(to < this.placeholder$.length-1 && this.tokens.get(to).type == 'f') to++;

            if (fr == 0 && this.tokens.get(fr).type == 'f')
                fr = to;

            if (to == this.placeholder$.length-1 && this.tokens.get(to).type == 'f')
                to = fr;

            dist1 = pos - fr;
            dist2 = to - pos;

            if (dist2 < dist1)
                fr = to;

            to = fr;
        }

        while(fr > 0 && this.tokens.get(fr).type != 'f') fr--;
        while(to < this.placeholder$.length-1 && this.tokens.get(to).type != 'f') to++;

        if (this.tokens.get(fr).type == 'f') fr++;
        if (this.tokens.get(to).type == 'f') to--;

        return([fr,to]);
    }

    public prev(printable:boolean,from?:number) : number
    {
        if (from != null)
            this.pos = from;

        let pos = this.pos - 1;

        if (!printable && pos >= 0)
        {
            this.pos = pos;
            this.onfield();
            return(this.pos);
        }

        while(pos >= 0)
        {
            if (this.input(pos))
            {
                this.pos = pos;
                this.onfield();
                break;
            }

            pos--;
        }

        return(this.pos);
    }

    public next(printable:boolean,from?:number) : number
    {
        if (from != null)
            this.pos = from;

        let pos = this.pos + 1;

        if (!printable && pos < this.plen)
        {
            this.pos = pos;
            this.onfield();
            return(this.pos);
        }

        while(pos < this.plen)
        {
            if (this.input(pos))
            {
                this.pos = pos;
                this.onfield();
                break;
            }

            pos++;
        }

        return(this.pos);
    }

    private onfield() : void
    {
        let curr:Field = this.findField(this.pos);

        if (curr.fn != this.fldno)
            this.fldno = curr.fn;
    }

    private getstring(fr:number,to:number) : string
    {
        return(this.value.substring(fr,to));
    }

    private setstring(pos:number,value:string) : void
    {
        this.value = this.replace(this.value,pos,value);
    }

    public replace(str:string,pos:number,val:string) : string
    {
        return(str.substring(0,pos) + val + str.substring(pos+val.length));
    }

    private parseFieldDefinition(field:string) : Token[]
    {
        let tokens:Token[] = [];

        for (let i = 0; i < field.length; i++)
        {
            let repeat:string = "1";
            let c:string = field.charAt(i);

            if (c >= '0' && c <= '9')
            {
                repeat = "";
                while(c >= '0' && c <= '9' && i < field.length)
                {
                    repeat += c;
                    c = field.charAt(++i);
                }

                if (i == field.length)
                    throw "Syntax error in expression, '"+this.predefined+"' or '[]' expected";
            }
            if (this.predefined.includes(c))
            {
                for(let f = 0; f < +repeat; f++)
                    tokens.push(new Token(c));
            }
            else
            {
                let expr:string = "";

                if (c != '[')
                    throw "Syntax error in expression, '"+this.predefined+"' or '[]' expected";

                c = field.charAt(++i);
                let esc:boolean = false;

                while((c != ']' || esc) && i < field.length)
                {
                    expr += c;
                    c = field.charAt(i+1);
                    esc = this.escaped(field,i++);
                }

                if (c != ']')
                    throw "Syntax error in path, non matched []";

                for(let f = 0; f < +repeat; f++)
                    tokens.push(new Token('x').setRegx("["+expr+"]"));
            }
        }

        return(tokens);
    }

    private escaped(str:string,pos:number) : boolean
    {
        if (pos == str.length+1)
            return(false);

        let e:string = str.charAt(pos);
        let c:string = str.charAt(pos+1);

        return(e == '\\' && c != '\\');
    }
}


class Field implements Section
{
    fn:number = 0;
    pos$:number = 0;
    last$:number = 0;
    size$:number = 0;
    value$:string = null;

    constructor(private pattern:Pattern, fn:number, fr:number, to:number)
    {
        this.fn = fn;
        this.pos$ = fr;
        this.last$ = to - 1;
        this.size$ = to - fr;
    }

    public pos() : number
    {
        return(this.pos$);
    }

    public get last() : number
    {
        return(this.last$);
    }

    public size(): number
    {
        return(this.size$);
    }

	public field() : number
	{
		return(this.fn);
	}

    public isNull() : boolean
    {
        let empty:boolean = true;
        let value:string = this.pattern.getValue();
        let pattern:string = this.pattern.getPlaceholder();

        for (let i = 0; i < pattern.length; i++)
        {
            let c:string = value.charAt(i);
            let p:string = pattern.charAt(i);
            if (c != p) {empty = false; break;}
        }

        return(empty);
    }

    public getValue() : string
    {
        return(this.pattern["getstring"](this.pos$,this.last+1));
    }

    public setValue(value:string) : void
    {
        if (value == null) value = "";

        while(value.length < this.size$)
            value += "";

        if (value.length > this.size$)
            value = value.substring(0,this.size$);

        this.pattern["setstring"](this.pos$,value);
    }


    public init() : void
    {
        this.value$ = this.getValue();
    }
}


class Token
{
    type$:string = 'f';
    case$:string = '?';
    expr$:string = null;
    regex:RegExp = null;

    constructor(type:string)
    {
        this.setType(type);
    }

    public get type() : string
    {
        return(this.type$)
    }

    public get case() : string
    {
        return(this.case$)
    }

    public setType(type:string) : Token
    {
        this.type$ = type;

        switch(type)
        {
            case "c": this.setCase('l'); break;
            case "C": this.setCase('u'); break;
            case "#": this.setRegx("[0-9]"); break;
            case "d": this.setRegx("[0-9.-]"); break;
            case "a": this.setRegx("[a-z]").setCase('l'); break;
            case "A": this.setRegx("[A-Z]").setCase('u'); break;
            case "w": this.setRegx("[a-zA-Z_0-9]").setCase('l'); break;
            case "W": this.setRegx("[a-zA-Z_0-9]").setCase('u'); break;
        }

        return(this);
    }

    public setCase(type:string) : Token
    {
        this.case$ = type;
        return(this);
    }

    public setRegx(expr:string) : Token
    {
        this.expr$ = expr;
        this.regex = new RegExp(expr);
        return(this);
    }

    public validate(c:string) : boolean
    {
        switch(this.type$.toLowerCase())
        {
            case "*": return(true);
            case "f": return(false);
            case "c": return(c.toLocaleLowerCase() != c.toLocaleUpperCase());
        }

        return(this.regex.test(c));
    }

    public toString() : string
    {
        return(this.type$+"["+this.case$+"]");
    }
}