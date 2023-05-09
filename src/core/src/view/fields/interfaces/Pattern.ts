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

export enum Validity
{
    na,
    true,
    false,
    asupper,
    aslower
}

export interface Pattern
{
    size() : number;
    isNull() : boolean;

    getPattern() : string;
    setPattern(pattern:string) : void;

    getValue() : string;
    setValue(value:any) : boolean;

	isValid(pos:number, c:string) : boolean
    validity(pos:number, c:string) : Validity

    prev(printable:boolean,from?:number) : number;
    next(printable:boolean,from?:number) : number;

    getPosition() : number;
    getFields() : Section[];
    getField(n:number) : Section;
    input(pos:number) : boolean;
    findField(pos?:number) : Section;
    findPosition(pos:number) : number;
    setPosition(pos:number) : boolean;
    getFieldArea(pos:number) : number[];
    delete(fr:number,to:number) : string;
    setCharacter(pos:number, c:string) : boolean;
}

export interface Section
{
    pos() : number;
    size() : number;
    field() : number;
    isNull() : boolean;
    getValue() : string;
    setValue(value:string) : void;
}