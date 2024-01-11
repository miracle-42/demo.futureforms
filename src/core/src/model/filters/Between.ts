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
 * The Between filter resembles the between operator in SQL.
 */
export class Between implements Filter
{
	private incl:boolean = false;

	private column$:string = null;
	private bindval$:string = null;
	private datatype$:string = null;
	private constraint$:any[] = null;
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

	public clone(): Between
	{
		let clone:Between = Reflect.construct(this.constructor,[this.column$]);
		clone.incl = this.incl;
		clone.bindval$ = this.bindval$;
		clone.datatype$ = this.datatype$;
		return(clone.setConstraint(this.constraint$));
	}

	public getDataType() : string
	{
		return(this.datatype$);
	}

	public setDataType(type:DataType|string) : Between
	{
		if (typeof type === "string") this.datatype$ = type;
		else this.datatype$ = DataType[type];
		return(this);
	}

	public getBindValueName() : string
	{
		return(this.bindval$);
	}

	public setBindValueName(name:string) : Between
	{
		this.bindval$ = name;
		return(this);
	}

	public setConstraint(values:any[]) : Between
	{
		this.constraint = values;
		return(this);
	}

	public get constraint() : any|any[]
	{
		return(this.constraint$);
	}

	public set constraint(values:any[])
	{
		this.constraint$ = [];
		this.bindvalues$ = null;

		if (values == null) return;
		if (values.length != 2) return;

		this.constraint$ = values;
	}

	public getBindValue(): BindValue
	{
		return(this.getBindValues()[0]);
	}

	public getBindValues(): BindValue[]
	{
		if (this.bindvalues$ == null && this.constraint$ != null)
		{
			let b1:BindValue = new BindValue(this.bindval$+"0",this.constraint$[0],this.datatype$);
			let b2:BindValue = new BindValue(this.bindval$+"1",this.constraint$[1],this.datatype$);

			b1.column = this.column$;
			b2.column = this.column$;

			if (this.datatype$)
			{
				b1.forceDataType = true;
				b2.forceDataType = true;
			}

			this.bindvalues$ = [b1,b2];
		}

		return(this.bindvalues$);
	}

	public async evaluate(record:Record) : Promise<boolean>
	{
		if (this.bindvalues$)
		{
			this.constraint$[0] = this.bindvalues$[0].value;
			this.constraint$[1] = this.bindvalues$[1].value;
		}

		if (this.column$ == null) return(false);
		if (this.constraint$ == null) return(false);
		let value:any = record.getValue(this.column$.toLowerCase());

		if (!this.incl)
		return(value > this.constraint$[0] && value < this.constraint$[1]);
		return(value >= this.constraint$[0] && value <= this.constraint$[1]);
	}

	public asSQL() : string
	{
		if (!this.constraint$ && !this.bindvalues$)
			return("1 = 2");

		let lt:string = "<";
		let gt:string = ">";

		if (this.bindval$ == null)
			this.bindval$ = this.column$;

		if (this.incl)
		{
			lt = "<=";
			gt = ">=";
		}

		let whcl:string =
			"(" +
				this.column$ + " " + gt + " :"+this.bindval$ + "0" +
				" and " +
				this.column$ + " " + lt + " :"+this.bindval$ + "1"+
			")";

		return(whcl)
	}

	public toString() : string
	{
		return(this.asSQL());
	}
}