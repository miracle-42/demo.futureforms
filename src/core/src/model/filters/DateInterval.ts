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

import { Between } from "./Between.js";


/**
 * Filters is a key component when communicating with a backend.
 * The DateInterval filter extends the Between filter and should
 * be used instead of constructions like trunc(col) = trunc(date)
 * that in most cases cannot use an index on the column.
 */
export class DateInterval extends Between
{
	public constructor(column:string)
	{
		super(column,true);
	}

	public Day(date?:Date) : DateInterval
	{
		if (date == null)
			date = new Date();

		let fr:Date = date;
		let to:Date = new Date(fr.getTime());

		fr.setHours(0,0,0,0);
		to.setHours(23,59,59,999);

		super.constraint = [fr,to];
		return(this);
	}

	public Week(date?:Date, start?:number) : DateInterval
	{
		if (start == null) start = 0;
		if (date == null) date = new Date();

		let f:number = date.getDate() - date.getDay();
		let l:number = f + 6;

		f += start;
		l += start;

		let fr:Date = new Date(date.setDate(f));
		let to:Date = new Date(date.setDate(l));

		fr.setHours(0,0,0,0);
		to.setHours(23,59,59,999);

		super.constraint = [fr,to];
		return(this);
	}

	public Month(date?:Date) : DateInterval
	{
		if (date == null)
			date = new Date();

		let m:number = date.getMonth();
		let y:number = date.getFullYear();

		let fr:Date = new Date(y,m,1);
		let to:Date = new Date(y,m+1,1);

		to = new Date(to.getTime() - 86400);

		fr.setHours(0,0,0,0);
		to.setHours(23,59,59,999);

		super.constraint = [fr,to];
		return(this);
	}

	public Year(date?:Date) : DateInterval
	{
		if (date == null)
			date = new Date();

		let y:number = date.getFullYear();

		let fr:Date = new Date(y,1,1);
		let to:Date = new Date(y,11,31);

		fr.setHours(0,0,0,0);
		to.setHours(23,59,59,999);

		super.constraint = [fr,to];
		return(this);
	}
}