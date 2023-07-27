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
 *
 * The CustomFilter is a 'scaffolding' class only meant for extending
 * into a functional filter in an easy way.
 */
export class CustomFilter implements Filter
{
	private column$:string = null;
	private bindval$:string = null;
	private datatype$:string = null;
	private constraint$:any[] = null;
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

	public clone(): CustomFilter
	{
		let clone:CustomFilter = Reflect.construct(this.constructor,[this.column$]);
		clone.bindval$ = this.bindval$;
		clone.datatype$ = this.datatype$;
		return(clone.setConstraint(this.constraint$));
	}

	public getDataType() : string
	{
		return(this.datatype$);
	}

	public setDataType(type:DataType|string) : CustomFilter
	{
		if (typeof type === "string") this.datatype$ = type;
		else this.datatype$ = DataType[type];
		return(this);
	}

	public getBindValueName() : string
	{
		return(this.bindval$);
	}

	public setBindValueName(name:string) : CustomFilter
	{
		this.bindval$ = name;
		return(this);
	}

	public setConstraint(values:any|any[]) : CustomFilter
	{
		this.constraint = values;
		return(this);
	}

	public get constraint() : any|any[]
	{
		return(this.constraint$);
	}

	public set constraint(values:any|any[])
	{
		this.constraint$ = values;
	}

	public getBindValue() : BindValue
	{
		if (this.bindvalues$ == null || this.bindvalues$.length == 0)
			return(null);

		return(this.getBindValues()[0]);
	}

	public setBindValues(values:BindValue[]) : void
	{
		this.bindvalues$ = values;
	}

	public getBindValues(): BindValue[]
	{
		if (this.bindvalues$ == null)
			this.bindvalues$ = [];

		return(this.bindvalues$);
	}

	public async evaluate(record:Record) : Promise<boolean>
	{
		throw "Custom filters must overwrite 'evaluate' method";
	}

	public asSQL() : string
	{
		throw "Custom filters must overwrite 'asSQL' method";
	}

	public toString() : string
	{
		return("Custom filter");
	}
}