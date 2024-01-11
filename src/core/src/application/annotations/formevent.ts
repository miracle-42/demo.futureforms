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

import { Logger, Type } from '../Logger.js';
import { Form } from '../../public/Form.js';
import { Block } from '../../public/Block.js';
import { FormMetaData } from '../FormMetaData.js';
import { MSGGRP } from '../../messages/Internal.js';
import { Messages } from '../../messages/Messages.js';
import { EventFilter } from '../../control/events/EventFilter.js';
import { EventListenerClass } from '../../control/events/EventListenerClass.js';


/**
 *
 * Annotations provides a short and easy way to inject code.
 *
 * The following:
 *
 * @formevent({type: EventType.PostChange, block: "ctrl", field: "name"})
 * public async postchange() : Promise<boolean>
 *
 * Will create and inject an event-listener that will invoke the postchange()
 * when a PostChange event occurs on the name field in the ctrl block.
 *
 */
export const formevent = (filter?:EventFilter|EventFilter[]) =>
{
	function define(lsnr:any, method:string)
	{
		if (!filter) filter = {};

		if (lsnr instanceof Form)
		{
			FormMetaData.get(lsnr,true).formevents.set(method,filter);
		}
		else if (lsnr instanceof Block)
		{
			FormMetaData.setBlockEvent(lsnr,method,filter);
		}
		else if (lsnr instanceof EventListenerClass)
		{
			FormMetaData.setListenerEvent(lsnr,method,filter);
		}
		else
		{
			Messages.severe(MSGGRP.FRAMEWORK,5,lsnr.constructor.name); // Use of @formevent on non compatable class
			return(null);
		}

		Logger.log(Type.metadata,"Register eventhandler "+method+" on form: "+lsnr.constructor.name+", filter: "+filter);
	}

	return(define);
}