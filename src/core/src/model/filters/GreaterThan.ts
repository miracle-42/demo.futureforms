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

import { Record } from "../Record.js";
import { Filter } from "../interfaces/Filter.js";
import { DataType } from "../../database/DataType.js";
import { BindValue } from "../../database/BindValue.js";


/**
 * Filters is a key component when communicating with a backend.
 * The GreaterThan filter resembles the > and >= operator in SQL.
 */
export class GreaterThan implements Filter
{
	private incl:boolean = false;
	private column$:string = null;
	private bindval$:string = null;
	private constraint$:any = null;
	private datatype$:string = null;
	private bindvalues$:BindValue[] = null;

	public constructor(column:string, incl?:boolean)
	{
		this.incl = incl;
		this.column$ = column;
		this.bindval$ = column;
	}

	public clear() : void
	{
		this.constraint$ = null;
	}

	public get includes() : boolean
	{
		return(this.incl);
	}

	public set includes(flag:boolean)
	{
		this.incl = flag;
	}

	public get column() : string
	{
		return(this.column$);
	}

	public set column(column:string)
	{
		this.column$ = column;
	}

	public clone(): GreaterThan
	{
		let clone:GreaterThan = Reflect.construct(this.constructor,[this.column$]);
		clone.incl = this.incl;
		clone.bindval$ = this.bindval$;
		clone.datatype$ = this.datatype$;
		return(clone.setConstraint(this.constraint$));
	}

	public getDataType() : string
	{
		return(this.datatype$);
	}

	public setDataType(type:DataType|string) : GreaterThan
	{
		if (typeof type === "string") this.datatype$ = type;
		else this.datatype$ = DataType[type];
		return(this);
	}

	public getBindValueName() : string
	{
		return(this.bindval$);
	}

	public setBindValueName(name:string) : GreaterThan
	{
		this.bindval$ = name;
		return(this);
	}

	public setConstraint(value:any) : GreaterThan
	{
		this.constraint = value;
		return(this);
	}

	public get constraint() : any
	{
		return(this.constraint$);
	}

	public set constraint(value:any)
	{
		this.bindvalues$ = null;
		this.constraint$ = value;
	}

	public getBindValue(): BindValue
	{
		return(this.getBindValues()[0]);
	}

	public getBindValues(): BindValue[]
	{
		if (this.bindvalues$ == null)
		{
			this.bindvalues$ = [new BindValue(this.bindval$,this.constraint$,this.datatype$)];
			if (this.datatype$) this.bindvalues$[0].forceDataType = true;
			this.bindvalues$[0].column = this.column$;
		}

		return(this.bindvalues$);
	}

	public async evaluate(record:Record) : Promise<boolean>
	{
		if (this.bindvalues$)
			this.constraint$ = this.bindvalues$[0].value;

		if (this.column$ == null) return(false);
		if (this.constraint$ == null) return(false);

		let value:any = record.getValue(this.column$.toLowerCase());

		if (this.incl) return(value >= this.constraint$);
		return(value > this.constraint$);
	}

	public asSQL() : string
	{
		if (!this.constraint$ && !this.bindvalues$)
			return("1 = 2");

		if (this.bindval$ == null)
			this.bindval$ = this.column$;

		let gt:string = this.incl ? ">=" : ">";
		let whcl:string = this.column$ + " "+gt+" :"+this.bindval$;

		return(whcl)
	}

	public toString() : string
	{
		return(this.asSQL());
	}
}