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

import { KeyMap } from "./KeyMap";
import { Framework } from "../../application/Framework.js";
import { Properties, ScrollDirection } from "../../application/Properties.js";

export class BrowserEvent
{
	private event$:any;
	private type$:string;
	private wait$:boolean = false;

	private dseq:number = 0;
	private useq:number = 0;
	private repeat$:boolean = false;

	public key:string = null;
	public ctrlkey:string = null;
	public funckey:string = null;

	public mark:boolean = false;
	public undo:boolean = false;
	public copy:boolean = false;
	public paste:boolean = false;
	public accept:boolean = false;
	public custom:boolean = false;
	public cancel:boolean = false;
	public ignore:boolean = false;
	public prevent:boolean = false;
	public modified:boolean = false;
	public mousedown:boolean = false;
	public mouseinit:boolean = false;
	public mousemark:boolean = false;
	public printable$:boolean = false;

	public alt:boolean = false;
	public ctrl:boolean = false;
	public meta:boolean = false;
	public shift:boolean = false;

	private static instance:BrowserEvent = null;
	private static DBLClickDetection:number = 250;
	private static ctrmod:string = BrowserEvent.detect();

	private static detect() : string
	{
		let os:string = navigator.platform;
		if (os == null) throw "@BrowserEvent: Unable to detect platform";

		if (os.startsWith("Mac"))
			return("meta");

		return("ctrl");
	}

	public static get() : BrowserEvent
	{
		if (BrowserEvent.instance == null)
			BrowserEvent.instance = new BrowserEvent();

		return(BrowserEvent.instance);
	}

	private constructor()
	{
	}

	public setFocusEvent() : void
	{
		this.reset();
		this.event$ = {type: "focus"};
	}

	public setKeyEvent(key:KeyMap) : void
	{
		this.reset();

		let event:any =
		{
			type: "keydown",
			key: key.key,
			altKey: key.alt,
			ctrlKey: key.ctrl,
			metaKey: key.meta,
			shiftKey: key.shift
		};

		this.setEvent(event);
	}

	public setEvent(event:any) : void
	{
		this.event$ = event;
		this.type$ = event.type;
		let bubble:boolean = false;

		Framework.setEvent(event);

		if (this.type == "mouseout") bubble = true;
		if (this.type == "mouseover") bubble = true;
		if (this.type.includes("drag")) bubble = true;

		if (!bubble && event["stopPropagation"])
			event.stopPropagation();

		// Checkboxes and radio fires click on change
		if (this.type == "change") this.wait$ = false;

		if (!this.isKeyEvent) this.reset();
		else                  this.KeyEvent();

		if (this.isMouseEvent) this.mouseEvent();

		// could have been set outside this window
		if (event.altKey != null) this.alt = event.altKey;
		if (event.ctrlKey != null) this.ctrl = event.ctrlKey;
		if (event.metaKey != null) this.meta = event.metaKey;
		if (event.shiftKey != null) this.shift = event.shiftKey;
	}

	 public get event() : any
	 {
		  return(this.event$);
	 }

	public reset() : void
	{
		this.key = null;
		this.mark = false;
		this.undo = false;
		this.copy = false;
		this.paste = false;
		this.accept = false;
		this.cancel = false;
		this.ignore = false;
		this.prevent = false;
		this.modified = false;
		this.mouseinit = false;
		this.custom = false;
		this.printable$ = false;

		this.ctrlkey = null;
		this.funckey = null;
	}

	public get undoing() : boolean
	{
		if (this.type != "keyup")
			return(false);

		return(this.undo);
	}

	public get pasting() : boolean
	{
		if (this.type != "keyup")
			return(false);

		return(this.paste);
	}

	public get isMouseEvent() : boolean
	{
		if (this.event.type == "wheel") return(true);
		if (this.event.type == "contextmenu") return(true);

		if (this.event.type.includes("drag")) return(true);
		if (this.event.type?.includes("click")) return(true);
		if (this.event.type?.startsWith("mouse")) return(true);

		return(false);
	}

	public get bubbleMouseEvent() : boolean
	{
		if (this.type == "contextmenu") return(true);
		if (this.type.includes("drag")) return(true);
		if (this.type.includes("click")) return(true);
		return(false);
	}

	public get isKeyEvent() : boolean
	{
		return(this.event.type?.startsWith("key") && this.event.key != null);
	}

	public get isPrintableKey() : boolean
	{
		if (this.ctrlkey != null) return(false);
		if (this.funckey != null) return(false);
		return(this.key != null && this.key.length == 1);
	}

	public get onFuncKey() : boolean
	{
		if (this.event.type != "keyup") return(false);
		return(this.funckey != null && this.event.key?.startsWith("F") && this.event.key.length > 1);
	}

	public get onScrollUp() : boolean
	{
		if (this.type != "wheel" || this.event.deltaY == 0)
			return(false);

		if (this.event.deltaY > 0 && Properties.MouseScrollDirection == ScrollDirection.Up) return(true);
		if (this.event.deltaY < 0 && Properties.MouseScrollDirection == ScrollDirection.Down) return(true);

		return(false);
	}

	public get onScrollDown() : boolean
	{
		if (this.type != "wheel" || this.event.deltaY == 0)
			return(false);

		if (this.event.deltaY < 0 && Properties.MouseScrollDirection == ScrollDirection.Up) return(true);
		if (this.event.deltaY > 0 && Properties.MouseScrollDirection == ScrollDirection.Down) return(true);

		return(false);
	}

	public get onCtrlKeyDown() : boolean
	{
		return(this.ctrlkey != null && this.type == "keydown");
	}

	public get type() : string
	{
		return(this.type$);
	}

	public get waiting() : boolean
	{
		return(this.wait$);
	}

	public get basetype() : string
	{
		return(this.event$.type);
	}

	public set type(type:string)
	{
		this.type$ = type;
	}

	public get repeat() : boolean
	{
		if (this.key == null)
			return(false);

		if (this.alt || this.ctrl || this.meta)
			return(false);

		return(this.type == "keydown" && this.repeat$);
	}

	public get printable() : boolean
	{
		if (this.repeat && this.isPrintableKey) return(true);
		else return(this.type == "keyup" && this.printable$);
	}

	public get modifier() : boolean
	{
		return(this.alt || this.ctrl || this.meta || this.shift);
	}

	public preventDefault(flag?:boolean) : void
	{
		if (flag == null) flag = this.prevent;
		if (flag) this.event.preventDefault();
	}


	private KeyEvent() : void
	{
		this.mark = false;
		this.copy = false;
		this.accept = false;
		this.cancel = false;
		this.custom = false;
		this.printable$ = false;

		switch(this.event.type)
		{
			case "keyup" :

			this.ignore = true;
			this.useq = this.dseq;

			if (!this.alt && !this.ctrl && !this.meta)
			{
				if (this.event.key?.length == 1)
				{
					this.ignore = false;
					this.printable$ = true;
					this.custom = false;
					this.key = this.event.key;
				}
			}

			if (this.key == "Backspace") this.ignore = false;
			if (this.event.key == "Delete") this.ignore = false;
			if (this.event.key == "PageUp") this.ignore = false;
			if (this.event.key == "PageDown") this.ignore = false;

			if (this.event.key == "ArrowLeft") this.ignore = false;
			if (this.event.key == "ArrowRight") this.ignore = false;

			if (this.event.key == "Tab") {this.custom = true; this.ignore = false;}

			if (this.event.key == "PageUp") {this.custom = true; this.ignore = false;}
			if (this.event.key == "PageDown") {this.custom = true; this.ignore = false;}

			if (this.event.key == "ArrowUp") {this.custom = true; this.ignore = false;}
			if (this.event.key == "ArrowDown") {this.custom = true; this.ignore = false;}

			if (this.event.key == "Alt") {this.ignore = true; this.alt = false;}
			if (this.event.key == "Meta") {this.ignore = true; this.meta = false;}
			if (this.event.key == "Shift") {this.ignore = true; this.shift = false;}
			if (this.event.key == "Control") {this.ignore = true; this.ctrl = false;}

			if (this.event.key == "Enter") {this.custom = true; this.accept = true; this.ignore = false;}
			if (this.event.key == "Escape") {this.custom = true; this.cancel = true; this.ignore = false;}

			if (this.ctrlkey != null) this.ignore = false;

			if (this.key != null && this.key.startsWith("F") && this.event.key.length > 1)
				this.ignore = false;

			break;

			case "keypress":

				this.ignore = true;
				this.custom = false;
				this.key = this.event.key;

				if (this.event.key.length == 1)
					this.printable$ = true;

			break;

			case "keydown":

				this.ignore = true;
				this.prevent = false;
				this.custom = false;
				this.printable$ = false;

				this.repeat$ = (this.dseq != this.useq && this.event.key == this.key);
				this.dseq = (++this.dseq % 32768);

				this.ctrlkey = null;
				this.funckey = null;

				this.key = this.event.key;

				if (this.key.length == 1 && (this.alt || this.ctrl || this.meta))
				{
					this.ignore = false;
					if (this.alt) this.ctrlkey = "ALT-"+this.key;
					if (this.ctrl) this.ctrlkey = "CTRL-"+this.key;
					if (this.meta) this.ctrlkey = "META-"+this.key;

					switch(this.key)
					{
						case '+':
						case '-':
						case '@':
						case 'a':
						case 'c':
						case 'x':
						case 'v':
						case 'r':
						case 'z': break;
						default : this.prevent = true;
					}

					let mod:Boolean = false;
					if (BrowserEvent.ctrmod == "ctrl" && this.ctrl) mod = true;
					if (BrowserEvent.ctrmod == "meta" && this.meta) mod = true;

					if (mod && this.key == 'a') this.mark = true;
					if (mod && this.key == 'c') this.copy = true;
					if (mod && this.key == 'z') this.undo = true; else this.undo = false;
					if (mod && this.key == 'v') this.paste = true; else this.paste = false;
				}
				else
				{
					this.undo = false;
					this.paste = false;
				}

				if (this.key == "Alt") this.alt = true;
				if (this.key == "Meta") this.meta = true;
				if (this.key == "Shift") this.shift = true;
				if (this.key == "Control") this.ctrl = true;

				if (this.key == "Tab") this.prevent = true;
				if (this.key == "Enter") this.prevent = true;
				if (this.key == "Escape") this.prevent = true;

				if (this.key == "PageUp") this.prevent = true;
				if (this.key == "PageDown") this.prevent = true;

				if (this.key == "ArrowUp") this.prevent = true;
				if (this.key == "ArrowDown") this.prevent = true;

				if (this.key == "Tab" && this.repeat$) {this.ignore = false; this.custom = true; this.prevent = true}
				if (this.key == "ArrowUp" && this.repeat$) {this.ignore = false; this.custom = true; this.prevent = true}
				if (this.key == "ArrowDown" && this.repeat$) {this.ignore = false; this.custom = true; this.prevent = true}

				if (this.key?.startsWith("F") && this.event.key?.length > 1)
				{
					this.prevent = true;
					this.funckey = this.key;
				}

			break;

			default:
				this.key = null;
				this.ignore = true;
				this.prevent = false;
				this.custom = false;
				this.printable$ = false;
			break;
		}
	 }

	public async wait() : Promise<void>
	{
		for (let i = 0; i < 10 && this.wait$; i++)
			await new Promise(resolve => setTimeout(resolve,BrowserEvent.DBLClickDetection/10));

		this.wait$ = false;
		this.type = this.event.type;
	}

	private mouseEvent() : void
	{
		this.reset();

		if (this.event.type == "click")
		{
			if (this.wait$)
				return;

			this.type = "wait";
			this.wait$ = true;

			setTimeout(() => {this.wait$ = false},
			  BrowserEvent.DBLClickDetection);
		}

		if (this.event.type == "dblclick")
		{
			this.type = "skip";
			this.wait$ = false;
		}

		if (this.type == "contextmenu")
			this.prevent = true;

		if (this.type == "mouseup")
		{
			this.mousedown = false;
			setTimeout(() => {this.mousemark = false;},0);
		}

		if (this.type == "mousedown")
		{
			this.mousedown = true;
			this.mousemark = false;
		}

		if (this.onScrollUp || this.onScrollDown)
			this.prevent = true;

		let first:boolean = !this.mousemark;
		if (this.type == "mousemove" && this.mousedown)
		{
			this.mousemark = true;
			this.mouseinit = first;
		}
	 }

	public clone() : BrowserEvent
	{
		let clone:BrowserEvent = new BrowserEvent();

		for(let attr in this)
		{
			let name:string = attr;
			clone[name] = this[name];
		}

		return(clone);
	}

	public toString() : string
	{
		return(this.type+" prevent: "+this.prevent+" ignore: "+this.ignore+" printable: "+this.printable+" key: "+this.key+" navigation: "+this.custom);
	}
}