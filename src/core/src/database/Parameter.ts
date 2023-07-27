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

/**
 * Parameter types, mostly used with database
 * stored proedures/functions
 */
export enum ParameterType
{
	in,
	out,
	inout
}

/**
 * Parameter, mostly used with database
 * stored proedures/functions
 */
export class Parameter
{
	value:any;
	name:string;
	dtype:string;
	ptype:ParameterType;

	/**
	 * 
	 * @param name  : name
	 * @param value : value
	 * @param dtype : data type
	 * @param ptype : parameter type i.e. in, out, in/out
	 */
	constructor(name:string, value:any, dtype?:DataType|string, ptype?:ParameterType)
	{
		if (typeof dtype != "string")
			dtype = DataType[dtype];

		if (value instanceof Date)
		{
			value = value.getTime();
			if (!dtype) dtype = "date";
		}

		if (dtype == null)
		{
			dtype = "string";

			if (typeof value === "number")
				dtype = "numeric";
		}

		if (ptype == null)
			ptype = ParameterType.in;

		this.name = name;
		this.value = value;

		this.dtype = dtype;
		this.ptype = ptype;
	}
}