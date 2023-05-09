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

import { MouseMap } from "./MouseMap.js";
import { EventType } from "./EventType.js";
import { Form } from "../../public/Form.js";
import { EventFilter } from "./EventFilter.js";
import { Logger, Type } from "../../application/Logger.js";

export class EventListener
{
	public method:string;

	constructor(public id:object, public form:Form, public clazz:any, method:Function|string, public filter:EventFilter)
	{
		if (typeof method === "string")
		{
			this.method = method;

			if (clazz[this.method] == null)
				throw "@EventListener: method '"+this.method+"' does not exist on class '"+clazz.constructor.name+"'";
		}
		else
		{
			this.method = method.name;

			if (clazz[this.method] == null)
				throw "@EventListener: method '"+this.method+"' does not exist on class '"+clazz.constructor.name+"'";

			if (clazz[this.method] != method)
				throw "@EventListener: method '"+this.method+"' does not match method defined on class '"+clazz.constructor.name+"'";
		}

		Logger.log(Type.eventlisteners,"eventlistener : "+this.toString());
	}

	public toString() : string
	{
		let filter:string = "{}";

		if (this.filter)
		{
			filter = "{";
			if (this.filter.type != null) filter += "type: "+EventType[this.filter.type]+", ";

			filter += "form: "+this.form?.constructor.name+", ";

			if (this.filter.block != null) filter += "block: "+this.filter.block+", ";
			if (this.filter.field != null) filter += "field: "+this.filter.field+", ";

			if (this.filter.key != null) filter += "key: "+this.filter.key+", ";
			if (this.filter.mouse != null) filter += "key: "+MouseMap[this.filter.mouse]+", ";

			filter = filter.substring(0,filter.length-2)+"}";
		}

		let str:string = this.clazz.constructor.name + "." + this.method + " filter: " + filter;
		return(str);
	}
}