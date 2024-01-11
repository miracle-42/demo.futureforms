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

import { DataType } from "../DataType.js";
import { DataMapper, Tier } from "../DataMapper.js";
import { dates } from "../../../model/dates/dates.js";
import { FieldProperties } from "../FieldProperties.js";
import { Formatter as DefaultFormatter } from "../Formatter.js";
import { FieldFeatureFactory } from "../../FieldFeatureFactory.js";
import { BrowserEvent } from "../../../control/events/BrowserEvent.js";
import { FieldEventHandler } from "../interfaces/FieldEventHandler.js";
import { KeyMap, KeyMapping } from "../../../control/events/KeyMap.js";
import { Formatter, SimpleFormatter } from "../interfaces/Formatter.js";
import { FieldImplementation, FieldState } from "../interfaces/FieldImplementation.js";

enum Case
{
	upper,
	lower,
	mixed,
	initcap
}

export class Input implements FieldImplementation, EventListenerObject
{
	private type:string = null;
	private before:string = "";
	private initial:string = "";
	private int:boolean = false;
	private dec:boolean = false;
	private trim$:boolean = true;
	private maxlen:number = null;
	private case:Case = Case.mixed;
	private state:FieldState = null;
	private placeholder:string = null;
	private formatter:Formatter = null;
	private datamapper:DataMapper = null;
	private properties:FieldProperties = null;
	private sformatter:SimpleFormatter = null;
	private eventhandler:FieldEventHandler = null;

	private element:HTMLInputElement = null;
	private datatype$:DataType = DataType.string;
	private event:BrowserEvent = BrowserEvent.get();

	public get trim() : boolean
	{
		return(this.trim$);
	}

	public set trim(flag:boolean)
	{
		this.trim$ = flag;
	}

	public get datatype() : DataType
	{
		return(this.datatype$);
	}

	public set datatype(type:DataType)
	{
		this.datatype$ = type;
	}

	public setValidated() : void
	{
		this.initial = this.getElementValue();
	}

	public create(eventhandler:FieldEventHandler, _tag:string) : HTMLInputElement
	{
		this.element = document.createElement("input");
		this.eventhandler = eventhandler;
		return(this.element);
	}

	public apply(properties:FieldProperties, init:boolean) : void
	{
		this.properties = properties;
		this.datamapper = properties.mapper;
		if (init) this.addEvents(this.element);
		this.setAttributes(properties.getAttributes());
	}

	public getFieldState() : FieldState
	{
		return(this.state);
	}

	public setFieldState(state:FieldState) : void
	{
		this.state = state;
		let enabled:boolean = this.properties.enabled;
		let readonly:boolean = this.properties.readonly;

		switch(state)
		{
			case FieldState.OPEN:
				if (enabled) FieldFeatureFactory.setEnabledState(this.element,this.properties,true);
				if (!readonly) FieldFeatureFactory.setReadOnlyState(this.element,this.properties,false);
				break;

			case FieldState.READONLY:
				if (enabled) FieldFeatureFactory.setEnabledState(this.element,this.properties,true);
				FieldFeatureFactory.setReadOnlyState(this.element,this.properties,true);
				break;

			case FieldState.DISABLED:
				FieldFeatureFactory.setEnabledState(this.element,this.properties,false);
				break;
		}
	}

	public clear() : void
	{
		this.setValue(null);
	}

	public getValue() : any
	{
		let value:string = this.getElementValue();

		if (this.trim)
			value = value?.trim();

		if (this.datamapper != null)
		{
			value = this.datamapper.getValue(Tier.Backend);
			if (value == null) this.setElementValue(null);
			return(value);
		}

		if (value.length == 0)
			return(null);

		if (this.datatype$ == DataType.boolean)
			return(value.toLowerCase() == "true");

		if (DataType[this.datatype$].startsWith("date"))
		{
			let date:Date = dates.parse(value);
			return(date);
		}

		if (this.datatype$ == DataType.integer || this.datatype$ == DataType.decimal)
			return(+value);

		if (this.formatter != null)
			return(this.formatter.getValue());

		if (this.sformatter != null)
			return(this.sformatter.getValue());

		if (this.properties.validValues.size > 0)
		{
			let keyval:any = null;

			this.properties.validValues.forEach((val,key) =>
			{
				if (value == val)
					keyval = key;
			});

			if (keyval != null)
				value = keyval;

			return(value);
		}

		return(value);
	}

	public setValue(value:any) : boolean
	{
		if (this.trim && typeof value === "string")
			value = value?.trim();

		if (this.datamapper != null)
		{
			this.datamapper.setValue(Tier.Backend,value);
			value = this.datamapper.getValue(Tier.Frontend);
		}

		if (DataType[this.datatype$].startsWith("date"))
		{
			if (typeof value === "number")
				value = new Date(+value);

			if (value instanceof Date)
			{
				try {value = dates.format(value);}
				catch (error) {value = null;}
			}
		}

		if (this.datatype$ == DataType.integer || this.datatype$ == DataType.decimal)
		{
			if (isNaN(+value) || (this.datatype$ == DataType.integer && (value+"").includes(".")))
				value = null;
		}

		if (this.formatter != null)
		{
			this.formatter.setValue(value);
			if (this.formatter.isNull()) value = null;
			else value = this.formatter.getValue();
		}

		if (this.sformatter != null)
		{
			this.sformatter.setValue(value);
			value = this.sformatter.getValue();
		}

		if (value == null)
			value = "";

		value += "";

		this.setElementValue(value);

		this.before = value;
		this.initial = value;

		return(true);
	}

	public getIntermediateValue(): string
	{
		if (this.datamapper != null)
			return(this.datamapper.getIntermediateValue(Tier.Backend));

		let value:string = this.getElementValue();

		if (this.formatter == null)
		{
			if (this.trim)
				value = value?.trim();
		}

		return(value);
	}

	public setIntermediateValue(value:string) : void
	{
		if (this.datamapper != null)
		{
			this.datamapper.setIntermediateValue(Tier.Backend,value);
			value = this.datamapper.getIntermediateValue(Tier.Frontend);
		}

		if (value == null)
			value = "";

		if (this.trim)
			value = value?.trim();

		if (this.formatter != null && value.length > 0)
		{
			this.formatter.setValue(value);
			value = this.formatter.getValue();
		}

		this.setElementValue(value);
	}

	public getElement() : HTMLElement
	{
		return(this.element);
	}

	public setAttributes(attributes:Map<string,any>) : void
	{
		this.int = false;
		this.dec = false;
		this.case = Case.mixed;
		this.placeholder = null;
		this.datatype$ = DataType.string;

		this.type = attributes.get("type");
		if (this.type == null) this.type = "text";

		if (this.type == "number")
			this.datatype$ = DataType.integer;

		if (this.type == "date")
			this.datatype$ = DataType.date;

		if (this.type == "datetime")
			this.datatype$ = DataType.datetime;

		attributes.forEach((value,attr) =>
		{
			if (attr == "trim")
			{
				if (value != "false")
					this.trim = value?.trim().toLowerCase() == "true";
			}

			if (attr == "date")
			{
				if (value != "false")
					this.datatype$ = DataType.date;
			}

			if (attr == "datetime")
			{
				if (value != "false")
					this.datatype$ = DataType.datetime;
			}

			if (attr == "upper")
			{
				if (value != "false")
					this.case = Case.upper;
			}

			if (attr == "lower")
			{
				if (value != "false")
					this.case = Case.lower;
			}

			if (attr == "initcap")
			{
				if (value != "false")
					this.case = Case.initcap;
			}

			if (attr == "boolean")
			{
				if (value != "false")
					this.datatype$ = DataType.boolean;
			}

			if (attr == "integer")
			{
				if (value != "false")
				{
					this.int = true;
					this.datatype$ = DataType.integer;
				}
			}

			if (attr == "decimal")
			{
				if (value != "false")
				{
					this.dec = true;
					this.datatype$ = DataType.decimal;
				}
			}

			if (attr == "maxlength")
			{
				this.maxlen = +value;

				if (isNaN(this.maxlen))
					this.maxlen = null;
			}

			if (attr == "placeholder")
				this.placeholder = value;
		});

		this.getFormatter(attributes);

		if (this.formatter != null)
		{
			this.element.type = "text";
			this.placeholder = this.formatter.placeholder;

			if (this.element.getAttribute("size") == null)
				this.element.setAttribute("size",""+this.formatter.size());
		}

		this.element.removeAttribute("placeholder");
	}

	public async handleEvent(event:Event) : Promise<void>
	{
		this.event.setEvent(event);
		let bubble:boolean = false;
		this.event.modified = false;

		if (this.event.type == "skip")
			return;

		if (this.event.type == "wait")
			await this.event.wait();

		if (this.event.waiting)
			return;

		if (this.event.undo)
		{
			this.event.preventDefault(true);

			let pos:number = this.getPosition();
			this.setElementValue(this.initial);

			if (this.formatter)
			{
				this.formatter.setValue(this.getElementValue());
				this.setElementValue(this.formatter.getValue());
			}

			if (this.sformatter)
			{
				this.sformatter.setValue(this.getElementValue());
				this.setElementValue(this.sformatter.getValue());
			}

			if (this.getElementValue().length > pos)
				this.setPosition(pos);
		}

		if (this.event.paste)
		{
			if (this.event.type == "keydown")
			{
				this.element.value = "";
			}
			else
			{
				let pos:number = this.getPosition();

				if (this.formatter)
				{
					this.formatter.setValue(this.getElementValue());
					this.setElementValue(this.formatter.getValue());
				}

				if (this.sformatter)
				{
					this.sformatter.setValue(this.getElementValue());
					this.setElementValue(this.sformatter.getValue());
				}

				if (this.getElementValue().length > pos)
					this.setPosition(pos);
			}
		}

		if (this.event.type == "focus")
		{
			bubble = true;
			this.before = this.getElementValue();
			this.initial = this.getIntermediateValue();
			this.element.removeAttribute("placeholder");
		}

		if (this.formatter != null)
		{
			if (!this.xfixed())
					return;
		}

		if (this.sformatter != null)
		{
			if (!this.xformat())
					return;
		}

		if (this.event.type == "blur")
		{
			bubble = true;

			let value:string = this.getElementValue();
			if (this.datamapper) value = this.datamapper.getValue(Tier.Backend);

			if (value != this.initial)
			{
				this.setValue(value);
				this.event.type = "change+blur";
			}
		}

		if (!this.disabled && !this.readonly && this.event.type == "mouseover" && this.placeholder != null)
			this.element.setAttribute("placeholder",this.placeholder);

		if (this.event.type == "mouseout" && this.placeholder != null)
			this.element.removeAttribute("placeholder");

		this.event.preventDefault();

		if (this.int)
		{
			if (!this.xint())
				return;
		}

		if (this.dec)
		{
			if (!this.xdec())
				return;
		}

		if (this.case != Case.mixed)
		{
			if (!this.xcase())
				return;
		}

		if (this.event.ignore) return;
		if (this.event.custom) bubble = true;

		if (this.event.type == "change")
		{
			bubble = false;
			let value:string = this.getElementValue();
			if (this.datamapper) value = this.datamapper.getValue(Tier.Backend);

			if (value != this.initial)
			{
				bubble = true;
				this.setValue(value);
			}
		}

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

		if (this.event.accept || this.event.cancel)
			bubble = true;

		let after:string = this.getElementValue();

		if (this.before != after)
		{
			bubble = true;
			this.before = after;
			this.event.modified = true;

			if (this.datamapper != null)
				this.datamapper.setIntermediateValue(Tier.Frontend,after);
		}

		if (bubble)
			await this.eventhandler.handleEvent(this.event);
	}

	private xcase() : boolean
	{
		if (this.type == "range")
			return(true);

		if (this.element.readOnly)
			return(true);

		if (this.event.type == "keydown" && this.event.isPrintableKey)
		{
			if (this.event.ctrlkey != null || this.event.funckey != null)
				return(true);

			this.event.preventDefault(true);
			let pos:number = this.getPosition();
			let sel:number[] = this.getSelection();
			let value:string = this.getElementValue();

			if (this.maxlen != null && value.length >= this.maxlen)
				return(true);

			if (sel[1] - sel[0] > 0)
				value = value.substring(0,sel[0]) + value.substring(sel[1])

			if (pos >= value.length) value += this.event.key;
			else value = value.substring(0,pos) + this.event.key + value.substring(pos);

			if (this.case == Case.upper)
				value = value.toLocaleUpperCase();

			if (this.case == Case.lower)
				value = value.toLocaleLowerCase();

			if (this.case == Case.initcap)
			{
				let cap:boolean = true;
				let initcap:string = "";

				for (let i = 0; i < value.length; i++)
				{
					if (cap) initcap += value.charAt(i).toLocaleUpperCase();
					else 	 initcap += value.charAt(i).toLocaleLowerCase();

					cap = false;
					if (value.charAt(i) == ' ')
						cap = true;
				}

				value = initcap;
			}

			this.setElementValue(value);
			this.setPosition(pos+1);
		}

		return(true);
	}

	private xint() : boolean
	{
		if (this.type == "range")
			return(true);

		if (this.element.readOnly)
			return(true);

		let pos:number = this.getPosition();

		if (this.event.type == "keydown")
		{
			if (this.event.isPrintableKey)
			{
				let pass:boolean = false;

				if (this.event.key >= '0' && this.event.key <= '9')
					pass = true;

				if (this.event.key == "-" && !this.getElementValue().includes("-") && pos == 0)
					pass = true;

				if (this.maxlen != null && this.getElementValue().length >= this.maxlen)
					pass = false;

				if (!pass)
				{
					this.event.preventDefault(true);
				}
				else if (this.event.repeat && this.event.key != ".")
				{
					let value:string = this.getElementValue();

					let a:string = value.substring(pos);
					let b:string = value.substring(0,pos);

					this.setElementValue(b + this.event.key + a);
					this.setPosition(++pos);
				}
			}
		}

		return(true);
	}

	private xdec() : boolean
	{
		if (this.type == "range")
			return(true);

		if (this.element.readOnly)
			return(true);

		let pos:number = this.getPosition();

		if (this.event.type == "keydown")
		{
			if (this.event.isPrintableKey)
			{
				let pass:boolean = false;

				if (this.event.key >= '0' && this.event.key <= '9')
					pass = true;

				if (this.event.key == "." && !this.getElementValue().includes("."))
					pass = true;

				if (this.event.key == "-" && !this.getElementValue().includes("-") && pos == 0)
						pass = true;

				if (this.maxlen != null && this.getElementValue().length >= this.maxlen)
					pass = false;

				if (!pass)
				{
					this.event.preventDefault(true);
				}
				else if (this.event.repeat && this.event.key != ".")
				{
					let value:string = this.getElementValue();

					let a:string = value.substring(pos);
					let b:string = value.substring(0,pos);

					this.setElementValue(b + this.event.key + a);
					this.setPosition(++pos);
				}
			}
		}

		return(true);
	}

	private xformat() : boolean
	{
		if (this.type == "range")
			return(true);

		if (this.element.readOnly)
			return(true);

		if (this.event.type == "keydown" && this.event.isPrintableKey)
		{
			if (this.event.ctrlkey != null || this.event.funckey != null)
				return(true);

			this.event.preventDefault(true);
			let pos:number = this.getPosition();
			let sel:number[] = this.getSelection();
			let value:string = this.getElementValue();

			if (sel[1] - sel[0] > 0)
				value = value.substring(0,sel[0]) + value.substring(sel[1])

			if (pos >= value.length) value += this.event.key;
			else value = value.substring(0,pos) + this.event.key + value.substring(pos);

			this.sformatter.setValue(value);
			value = this.sformatter.getValue();

			this.setElementValue(value);
			this.setPosition(pos+1);
		}

		return(true);
	}

	private xfixed() : boolean
	{
		if (this.type == "range")
			return(true);

		if (this.element.readOnly)
			return(true);

		let force:boolean = null;

		if (this.event.key == "Insert")
			force = true;

		if (this.event.key == "Delete")
			force = true;

		this.event.preventDefault(force);
		let pos:number = this.getPosition();

		if (this.event.type == "focus")
		{
			if (this.formatter.isNull())
			{
				let first:number = this.formatter.first();
				this.setElementValue(this.formatter.getValue());
				setTimeout(() => {this.setPosition(first)},0);
			}

			return(true);
		}

		if (this.event.key == "Enter")
		{
			this.setElementValue(this.formatter.finish());
			if (this.formatter.isNull()) this.clear();
			return(true);
		}

		// Change should not fire because of preventDefault etc
		if (this.event.type == "blur" || this.event.type == "change")
		{
			this.setElementValue(this.formatter.finish());
			if (this.formatter.isNull()) this.clear();
			return(true);
		}

		if (this.event.type == "drop")
		{
			this.event.preventDefault(true);
			return(true);
		}

		if ((this.event.key == "Backspace" || this.event.key == "Delete") && !this.event.modifier)
		{
			if (pos > 0) pos--;
			this.event.preventDefault(true);

			if (this.event.type == "keyup")
				return(true);

			let area:number[] = this.getSelection();
			if (area[0] == area[1]) area[0]--;

			this.formatter.delete(area[0],area[1]);
			this.setElementValue(this.formatter.getValue());

			if (!this.formatter.modifiable(pos))
				pos = this.formatter.prev(pos) + 1;

			this.setPosition(pos);
			return(true);
		}

		if (this.event.type == "keypress" && this.event.isPrintableKey)
		{
			let last:number = this.formatter.last();
			if (pos > last) pos = this.formatter.prev(pos);

			if (!this.formatter.modifiable(pos))
			{
				pos = this.formatter.next(pos);
				this.setPosition(pos);
			}

			let area:number[] = this.getSelection();

			if (area[1] - area[0] > 1)
				this.formatter.delete(area[0],area[1]);

			if (!this.formatter.insCharacter(pos,this.event.key))
			{
				this.setElementValue(this.formatter.getValue());
				this.event.preventDefault(true);
				this.setPosition(pos);
				return(true);
			}

			this.setElementValue(this.formatter.getValue());

			let npos:number = this.formatter.next(pos);
			if (npos <= pos) npos++;

			this.setPosition(npos);
			this.event.preventDefault(true);

			return(false);
		}

		if (this.formatter && DataType[this.datatype].startsWith("date"))
		{
			if (KeyMapping.parseBrowserEvent(this.event) == KeyMap.now)
			{
				this.formatter.setValue(this.getCurrentDate());
				this.setElementValue(this.formatter.getValue());

				this.setPosition(this.formatter.first());
				return(true);
			}
		}

		return(true);
	}

	private getCurrentDate() : string
	{
		return(dates.format(new Date()));
	}

	private getPosition() : number
	{
		let pos:number = this.element.selectionStart;
		if (pos < 0) pos = 0;
		return(pos);
	}

	private setPosition(pos:number) : void
	{
		if (pos < 0) pos = 0;
		this.element.selectionStart = pos;
		this.element.selectionEnd = pos;
	}

	private getSelection() : number[]
	{
		let pos:number[] = [];
		pos[1] = this.element.selectionEnd;
		pos[0] = this.element.selectionStart;
		return(pos);
	}

	private getElementValue() : string
	{
		return(this.element.value);
	}

	private setElementValue(value:string) : void
	{
		if (value == null) value = "";
		this.element.value = value;
	}

	private get disabled() : boolean
	{
		return(this.element.disabled);
	}

	private get readonly() : boolean
	{
		return(this.element.readOnly);
	}

	private getFormatter(attributes:Map<string,any>) : void
	{
		let impl:any = this.properties.formatter;
		let format:string = attributes.get("format");

		// custom date and datetime requires a formatter
		if (!impl && (format || attributes.has("date") || attributes.has("datetime")))
			impl = new DefaultFormatter();

		if (impl)
		{
			this.formatter = impl;
			this.formatter.format = format;
			this.formatter.datatype = this.datatype;
		}

		if (!impl)
			this.sformatter = this.properties.simpleformatter;
	}

	private addEvents(element:HTMLElement) : void
	{
		element.addEventListener("blur",this);
		element.addEventListener("focus",this);
		element.addEventListener("change",this);

		element.addEventListener("keyup",this);
		element.addEventListener("keydown",this);
		element.addEventListener("keypress",this);

		element.addEventListener("wheel",this);
		element.addEventListener("mouseup",this);
		element.addEventListener("mouseout",this);
		element.addEventListener("mousedown",this);
		element.addEventListener("mouseover",this);
		element.addEventListener("mousemove",this);

		element.addEventListener("drop",this);

		element.addEventListener("drag",this);
		element.addEventListener("dragend",this);
		element.addEventListener("dragover",this);
		element.addEventListener("dragstart",this);
		element.addEventListener("dragenter",this);
		element.addEventListener("dragleave",this);

		element.addEventListener("click",this);
		element.addEventListener("dblclick",this);
		element.addEventListener("contextmenu",this);
	}
}