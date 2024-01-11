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

import { MSGGRP } from '../../messages/Internal.js';
import { dates, DateToken, DatePart } from './dates.js';
import { Level, Messages } from '../../messages/Messages.js';
import { Properties } from '../../application/Properties.js';
import {format as formatimpl, parse as parseimpl} from './fecha.js';

/*
	Format strings follow implementation, eg "DD-MM-YYYY HH:mm:ss":
    see https://github.com/taylorhakes/fecha/blob/master/README.md
*/

export interface datepart
{
	token:string;
	delim:string;
}

export class utils
{
	public static date() : string
	{
		return(Properties.DateFormat);
	}

	public static full() : string
	{
		return(Properties.DateFormat+" "+Properties.TimeFormat);
	}

	public static delim() : string
	{
		return(Properties.DateDelimitors);
	}

	public static parse(datestr:string, withtime:boolean, format?:string) : Date
	{
		if (format == null)
		{
			if (withtime) format = utils.full();
			else		  	  format = utils.date();
		}

		if (datestr == null || datestr.trim().length == 0)
			return(null);

		try
		{
			return(parseimpl(datestr,format));
		}
		catch (error)
		{
			Messages.handle(MSGGRP.FRAMEWORK,error,Level.warn);
			return(null);
		}
   }

	public static format(date:Date, format?:string) : string
	{
		if (date == null)
		  	return(null);

		if (format == null)
			format = utils.full();

		try
		{
			return(formatimpl(date,format));
		}
		catch (error)
		{
			Messages.handle(MSGGRP.FRAMEWORK,error,Level.warn);
			return(null);
		}
   }

	public static tokenize(date:Date, format?:string) : DateToken[]
	{
		let tokens:DateToken[] = [];

      if (format == null)
			format = utils.full();

		let delim:string = utils.delim();
		let value:string = utils.format(date);

		if (value == null)
			return(null);

		let start:number = 0;
		let mask:string = null;

		for (let i = 0; i < format.length; i++)
		{
			if (delim.includes(format.charAt(i)))
			{
				mask = format.substring(start,i);

				let token:DateToken =
				{
					pos: start,
					mask: mask,
					length: i - start,
					type: dates.getTokenType(mask),
					value: value.substring(start,i)
				}

				tokens.push(token);
				start = i + 1;
			}
		}

		mask = format.substring(start);

		tokens.push(
		{
			pos: start,
			mask: mask,
			value: value.substring(start),
			length: format.length - start,
			type: dates.getTokenType(mask)
		});

		tokens.push(
		{
			pos: 0,
			mask: format,
			type: DatePart.Date,
			length: format.length,
			value: value.substring(0,format.length)
		});

		return(tokens);
	}
}