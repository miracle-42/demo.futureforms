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

import { KeyMap, KeyMapping } from './KeyMap.js';
import { BrowserEvent } from './BrowserEvent.js';
import { FormEvent, FormEvents } from './FormEvents.js';
import { MouseMap, MouseMapParser } from './MouseMap.js';
import { FormBacking } from '../../application/FormBacking.js';
import { FlightRecorder } from '../../application/FlightRecorder.js';


export class ApplicationHandler implements EventListenerObject
{
	public static contextmenu:boolean = false;
	public static instance:ApplicationHandler;

	public static init() : void
	{
		ApplicationHandler.instance = new ApplicationHandler();
	}

	public static addContextListener() : void
	{
		if (!ApplicationHandler.contextmenu)
		{
			ApplicationHandler.contextmenu = true;
			document.addEventListener("contextmenu",ApplicationHandler.instance);
		}
	}

	private constructor()
	{
		this.addEvents();
	}

	private event:BrowserEvent = BrowserEvent.get();
	public async handleEvent(event:any) : Promise<void>
	{
      let bubble:boolean = false;
		this.event.setEvent(event);

		if (this.event.type == "skip")
			return;

		if (this.event.type == "wait")
			await this.event.wait();

		if (this.event.waiting)
			return;

		if (this.event.accept || this.event.cancel)
			bubble = true;

		if (this.event.bubbleMouseEvent)
			bubble = true;

		if (this.event.onScrollUp)
			bubble = true;

		if (this.event.onScrollDown)
			bubble = true;

		if (this.event.onCtrlKeyDown)
			bubble = true;

		if (this.event.onFuncKey)
			bubble = true;

		this.event.preventDefault();

		if (bubble)
		{
			if (this.event.type?.startsWith("key"))
			{
				let key:KeyMap = KeyMapping.parseBrowserEvent(this.event);
				let frmevent:FormEvent = FormEvent.KeyEvent(null,null,key);

				if (await FormEvents.raise(frmevent))
					this.keyhandler(key);
			}
			else
			{
				let mevent:MouseMap = MouseMapParser.parseBrowserEvent(this.event);
				let frmevent:FormEvent = FormEvent.MouseEvent(null,mevent);

				if (await FormEvents.raise(frmevent))
					this.mousehandler(mevent);
			}
		}
	}

	public async keyhandler(key:KeyMap) : Promise<boolean>
	{
		if (key == KeyMap.dump)
		{
			FlightRecorder.dump();
			return(true);
		}

		if (key == KeyMap.commit)
			return(FormBacking.commit());

		if (key == KeyMap.rollback)
			return(FormBacking.rollback());

		return(true);
	}

	public async mousehandler(_mevent:MouseMap) : Promise<boolean>
	{
		return(true);
	}

	private addEvents() : void
	{
		document.addEventListener("keyup",this);
		document.addEventListener("keydown",this);
		document.addEventListener("keypress",this);

		document.addEventListener("click",this);
		document.addEventListener("dblclick",this);
	}
}