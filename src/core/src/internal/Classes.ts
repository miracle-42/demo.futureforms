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

import { Form } from './Form.js';
import { Alert } from './forms/Alert.js';
import { Class } from '../public/Class.js';
import { DatePicker } from './forms/DatePicker.js';
import { ListOfValues } from './forms/ListOfValues.js';
import { AdvancedQuery } from './forms/AdvancedQuery.js';

/**
 * Defines which forms to be used internally.
 * Can be replaced by advanced users.
 */
export class Classes
{
	private static zindex$:number = 536870911;
	public static AlertClass:Class<Form> = Alert;
	public static DatePickerClass:Class<Form> = DatePicker;
	public static ListOfValuesClass:Class<Form> = ListOfValues;
	public static AdvancedQueryClass:Class<Form> = AdvancedQuery;

	public static get zindex() : number
	{
		return(++Classes.zindex$);
	}

	public static isInternal(clazz:Class<Form>) : boolean
	{
		if (clazz == Alert) return(true);
		if (clazz == DatePicker) return(true);
		if (clazz == AdvancedQuery) return(true);
		return(false);
	}
}