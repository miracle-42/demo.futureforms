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
 * The ILike filter resembles the case-insensitive ilike operator in SQL.
 */
export class ILike implements Filter
{
	private column$:string = null;
	private bindval$:string = null;
	private ltrunc:boolean = false;
	private rtrunc:boolean = false;
	private parsed:boolean = false;
	private datatype$:string = null;
	private constraint$:string = null;
	private bindvalues$:BindValue[] = null;

	public constructor(column:string)
	{
		this.column$ = column;
		this.bindval$ = column;
	}

	public clear() : void
	{
		this.constraint$ = null;
	}

	public get column() : string
	{
		return(this.column$);
	}

	public set column(column:string)
	{
		this.column$ = column;
	}

	public clone(): ILike
	{
		let clone:ILike = Reflect.construct(this.constructor,[this.column$]);
		clone.bindval$ = this.bindval$;
		clone.datatype$ = this.datatype$;
		return(clone.setConstraint(this.constraint$));
	}

	public getDataType() : string
	{
		return(this.datatype$);
	}

	public setDataType(type:DataType|string) : ILike
	{
		if (typeof type === "string") this.datatype$ = type;
		else this.datatype$ = DataType[type];
		return(this);
	}

	public getBindValueName() : string
	{
		return(this.bindval$);
	}

	public setBindValueName(name:string) : ILike
	{
		this.bindval$ = name;
		return(this);
	}

	public setConstraint(value:any) : ILike
	{
		this.parsed = false;
		this.constraint = value;
		return(this);
	}

	public get constraint() : string
	{
		let constr:string = this.constraint$;

		if (this.parsed)
		{
			if (this.ltrunc) constr = "%"+constr;
			if (this.rtrunc) constr = constr+"%";
		}

		return(constr);
	}

	public set constraint(value:string)
	{
		this.parsed = false;
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

		if (!this.parsed)
		{
			this.parsed = true;
			this.constraint$ = this.constraint$?.toLocaleLowerCase();

			if (this.constraint$?.endsWith("%")) this.rtrunc = true;
			if (this.constraint$?.startsWith("%")) this.ltrunc = true;

			if (this.ltrunc) this.constraint$ = this.constraint$.substring(1);
			if (this.rtrunc) this.constraint$ = this.constraint$.substring(0,this.constraint$.length-1);
		}


		let value:any = record.getValue(this.column$.toLocaleLowerCase());

		if (value == null)
			return(false);

		value = (value+"").toLocaleLowerCase();

		if (this.rtrunc && this.ltrunc)
		{
			if (value.includes(this.constraint$)) return(true);
			return(false);
		}

		if (this.rtrunc)
		{
			if (value.startsWith(this.constraint$)) return(true);
			return(false);
		}

		if (this.ltrunc)
		{
			if (value.endsWith(this.constraint$)) return(true);
			return(false);
		}

		return(value == this.constraint$);
	}

	public asSQL() : string
	{
		if (!this.constraint$ && !this.bindvalues$)
			return("1 = 2");

		if (this.bindval$ == null)
			this.bindval$ = this.column$;

		return(this.column$ + " ilike :"+this.bindval$)
	}

	public toString() : string
	{
		return(this.column$+" ilike "+this.constraint);
	}
}