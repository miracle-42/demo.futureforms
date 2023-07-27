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

import { FormEvents } from "./FormEvents.js";
import { EventFilter } from "./EventFilter.js";
import { FormMetaData } from "../../application/FormMetaData.js";
import { TriggerFunction } from "../../public/TriggerFunction.js";

/**
 * EventListener basic class
 * Any class can extend this and thereby become an event-listener
 */
export class EventListenerClass
{
	protected constructor()
	{
		FormMetaData.getListenerEvents(this).forEach((event) =>
		{this.addEventListener(this[event.method],event.filter);});
	}

	public removeEventListener(handle:object) : void
	{
		FormEvents.removeListener(handle);
	}

	public addEventListener(method:TriggerFunction, filter?:EventFilter|EventFilter[]) : object
	{
		return(FormEvents.addListener(null,this,method,filter));
	}
}