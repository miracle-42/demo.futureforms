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

import { Form } from '../public/Form.js';
import { FormsModule } from './FormsModule.js';
import { FormBacking } from './FormBacking.js';
import { Classes } from '../internal/Classes.js';
import { FlightRecorder } from './FlightRecorder.js';
import { Alert as Interceptor } from '../application/interfaces/Alert.js';

/**
 * A popup form to alert the user that some event
 * has occured
 */
export class Alert
{
	public static interceptor:Interceptor = null;

	/** Alert the user that a fatal event has occured */
	public static async fatal(msg:string, title:string)
	{
		if (this.interceptor) Alert.interceptor.fatal(msg,title);
		else Alert.callform(msg,title,false,true);
	}

	/** Alert the user that an event causing an warning has occured */
	public static async warning(msg:string, title:string)
	{
		if (this.interceptor) Alert.interceptor.warning(msg,title);
		else Alert.callform(msg,title,true,false);
	}

	/** Alert the user an event has occured */
	public static async message(msg:string, title:string)
	{
		if (this.interceptor) Alert.interceptor.message(msg,title);
		else Alert.callform(msg,title,false,false);
	}

	private static async callform(msg:string, title:string, warning:boolean, fatal:boolean) : Promise<void>
	{
		let params:Map<string,any> = new Map<string,any>();

		params.set("title",title);
		params.set("message",msg);

		params.set("fatal",fatal);
		params.set("warning",warning);

		if (fatal)
		{
			console.log(title+": "+msg+" "+(new Error()).stack);
			FlightRecorder.add("alert.fatal: "+title+" - "+msg);
		}

		let curr:Form = FormBacking.getCurrentForm();
		if (curr) curr.callform(Classes.AlertClass,params);
		else FormsModule.showform(Classes.AlertClass,params);
	}
}