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

import { DataType } from "./DataType.js";

export class BindValue
{
	private value$:any = null;
	private name$:string = null;
	private type$:string = null;
	private out$:boolean = false;
	private column$:string = null;
	private force$:boolean = false;

	public constructor(name:string, value:any, type?:DataType|string)
	{
		if (typeof type != "string")
			type = DataType[type];

		this.name = name;
		this.type = type;
		this.value = value;
		this.column = name;
	}

	public get name() : string
	{
		return(this.name$);
	}

	public set name(name:string)
	{
		this.name$ = name;
	}

	public get column() : string
	{
		return(this.column$);
	}

	public set column(column:string)
	{
		this.column$ = column;
	}

	public get outtype() : boolean
	{
		return(this.out$);
	}

	public set outtype(flag:boolean)
	{
		this.out$ = flag;
	}

	public get type() : string
	{
		if (this.type$ == null)
			return("string");

		return(this.type$);
	}

	public set type(type:DataType|string)
	{
		if (typeof type != "string")
			type = DataType[type];

		this.type$ = type;
	}

	public get forceDataType() : boolean
	{
		return(this.force$);
	}

	public set forceDataType(flag:boolean)
	{
		this.force$ = flag;
	}

	public get value() : any
	{
		return(this.value$);
	}

	public set value(value:any)
	{
		this.value$ = value;

		if (this.type$ == null && typeof value === "number")
			this.type$ = "number";

		if (value instanceof Date)
			if (this.type$ == null) this.type$ = "date";

		if (this.type$ == null)
			this.type$ = "string";
	}

	public toString() : string
	{
		return("{"+this.name+" "+this.type+" "+this.value+"}")
	}
}