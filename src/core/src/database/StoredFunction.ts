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
import { StoredProcedure } from "./StoredProcedure.js";
import { DatabaseConnection } from "../public/DatabaseConnection.js";

/**
 * StoredFunction is used with OpenRestDB to call
 * a stored function
 */
export class StoredFunction extends StoredProcedure
{
	/** @param connection : A connection to OpenRestDB */
	public constructor(connection:DatabaseConnection)
	{
		super(connection);
		super.returntype$ = "string";
	}

	/** Get the name of returned parameter from the function call */
	public getReturnValue() : string
	{
		return(super.getOutParameter(this.retparm$));
	}

	/** Set the return data type */
	public setReturnType(datatype?:DataType|string) : void
	{
		super.returntype$ = datatype;
	}
}