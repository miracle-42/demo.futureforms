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

import { Like } from "./Like.js";
import { ILike } from "./ILike.js";
import { AnyOf } from "./AnyOf.js";
import { Equals } from "./Equals.js";
import { IsNull } from "./IsNull.js";
import { NoneOf } from "./NoneOf.js";
import { Between } from "./Between.js";
import { LessThan } from "./LessThan.js";
import { Contains } from "./Contains.js";
import { SubQuery } from "./SubQuery.js";
import { GreaterThan } from "./GreaterThan.js";
import { DateInterval } from "./DateInterval.js";

/**
 * Filters is a key component when communicating with a backend.
 * This is just a convinience class gathering all basic filters into one common entry.
 */
export class Filters
{
	public static Like(column:string) : Like {return(new Like(column))};
	public static AnyOf(column:string) : AnyOf {return(new AnyOf(column))};
	public static ILike(column:string) : ILike {return(new ILike(column))};
	public static Equals(column:string) : Equals {return(new Equals(column))};
	public static NoneOf(column:string) : NoneOf {return(new NoneOf(column))};
	public static IsNull(column:string) : IsNull {return(new IsNull(column))};
	public static Contains(columns:string|string[]) : Contains {return(new Contains(columns))};
	public static SubQuery(columns:string|string[]) : SubQuery {return(new SubQuery(columns))};
	public static DateInterval(column:string) : DateInterval {return(new DateInterval(column))};
	public static LessThan(column:string, incl?:boolean) : LessThan {return(new LessThan(column,incl))};
	public static Between(column:string, incl?:boolean) : Between {return(new Between(column,incl))};
	public static GreaterThan(column:string, incl?:boolean) : GreaterThan {return(new GreaterThan(column,incl))};
}