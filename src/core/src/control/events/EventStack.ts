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

import { BrowserEvent } from "./BrowserEvent.js";
import { Field } from "../../view/fields/Field.js";
import { DynamicCall } from "../../application/Framework.js";
import { FieldInstance } from "../../view/fields/FieldInstance.js";
import { FlightRecorder } from "../../application/FlightRecorder.js";

interface event
{
	fev?:fieldevent,
	ext?:externalevent;
}

interface fieldevent
{
	field:Field,
	inst:FieldInstance,
	brwevent:BrowserEvent
}

interface externalevent
{
	event:any,
	func:DynamicCall
}

class WatchDog
{
	private static watchdog:WatchDog = null;

	public static start() : void
	{
		if (WatchDog.watchdog == null)
			WatchDog.watchdog = new WatchDog();
	}

	private constructor()
	{
		this.check(500);
	}

	private check(interval:number) : void
	{
		if (!EventStack.running && EventStack.stack$.length > 0)
		{
			FlightRecorder.add("@eventstack: restart EventStackHandler");
			EventStack.handle();
		}

		setTimeout(() => {this.check(interval);},interval);
	}
}

export class EventStack
{
	public static stack$:event[] = [];
	public static running:boolean = false;

	// Javascript might not be multi-threaded, but browsers doesn't wait for events to be handled
	// This code requires events to passed one at a time, which cannot be guaranteed !!!!

	public static async send(inst:FieldInstance, brwevent:BrowserEvent) : Promise<void>
	{
		EventStack.stack(inst.field,inst,brwevent);
	}

	public static async queue(func:DynamicCall, event:any) : Promise<void>
	{
		WatchDog.start();
		EventStack.stack$.unshift({ext: {func:func, event:event}});
		await EventStack.handle();
	}

	public static async stack(field:Field, inst:FieldInstance, brwevent:BrowserEvent) : Promise<void>
	{
		WatchDog.start();
		EventStack.stack$.unshift({fev: {field: field, inst:inst, brwevent: brwevent.clone()}});
		await EventStack.handle();
	}

	public static async handle() : Promise<void>
	{
		if (EventStack.running)
			return;

		EventStack.running = true;
		let cmd:event = EventStack.stack$.pop();

		if (cmd == undefined)
		{
			EventStack.running = false;
			return;
		}

		try
		{
			if (cmd.ext) await cmd.ext.func.invoke(cmd.ext.event);
			else await cmd.fev.field.performEvent(cmd.fev.inst,cmd.fev.brwevent);

			EventStack.running = false;
			setTimeout(() => {EventStack.handle();},0);
		}
		catch (error)
		{
			EventStack.stack$ = [];
			EventStack.running = false;
		}
	}

	public static clear() : void
	{
		EventStack.stack$ = [];
	}
}