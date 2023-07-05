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

import { Pattern } from "../Pattern.js";
import { DataType } from "../DataType.js";
import { Section } from "../interfaces/Pattern.js";
import { DataMapper, Tier } from "../DataMapper.js";
import { Alert } from "../../../application/Alert.js";
import { FieldProperties } from "../FieldProperties.js";
import { FieldFeatureFactory } from "../../FieldFeatureFactory.js";
import { BrowserEvent } from "../../../control/events/BrowserEvent.js";
import { FieldEventHandler } from "../interfaces/FieldEventHandler.js";
import { KeyMap, KeyMapping } from "../../../control/events/KeyMap.js";
import { DatePart, dates, FormatToken } from "../../../model/dates/dates.js";
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
	private maxlen:number = null;
	private cse:Case = Case.mixed;
	private pattern:Pattern = null;
	private state:FieldState = null;
	private placeholder:string = null;
	private datamapper:DataMapper = null;
	private datetokens:FormatToken[] = null;
	private properties:FieldProperties = null;
	private eventhandler:FieldEventHandler = null;

	private element:HTMLInputElement = null;
	private datatype$:DataType = DataType.string;
	private event:BrowserEvent = BrowserEvent.get();

	public get datatype() : DataType
	{
		return(this.datatype$);
	}

	public set datatype(type:DataType)
	{
		this.datatype$ = type;
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
		this.before = "";
		this.setElementValue(null);
	}

	public bonusstuff(value:any) : any
	{
		// finish date with defaults from today
		if (DataType[this.datatype$].startsWith("date") && this.pattern && value == null)
		{
			let date:Date = dates.parse(this.getElementValue());

			if (date == null && !this.pattern.isNull())
			{
				let fine:string = this.finishDate();

				date = dates.parse(fine);

				if (date != null)
				{
					this.pattern.setValue(fine);
					this.setElementValue(this.pattern.getValue());
				}
				else
				{
					if (dates.parse(this.getElementValue()) == null)
						this.setElementValue(null);
				}
			}

			return(date);
		}

		return(value);
	}

	public getValue() : any
	{
		let value:string = this.getElementValue().trim();

		if (this.datamapper != null)
		{
			value = this.datamapper.getValue(Tier.Backend);
			if (value == null) this.setElementValue(null);
			return(value);
		}

		if (value.trim().length == 0)
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

		if (this.pattern != null)
			return(this.pattern.getValue().trim());

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

		if (this.pattern != null)
		{
			this.pattern.setValue(value);
			if (this.pattern.isNull()) value = "";
			else value = this.pattern.getValue();
		}

		if (value == null)
			value = "";

		value += "";
		this.before = value;
		this.initial = value;
		this.setElementValue(value);

		if (this.pattern != null)
			this.setPosition(this.pattern.findPosition(0));

		return(true);
	}

	public getIntermediateValue(): string
	{
		if (this.datamapper != null)
			return(this.datamapper.getIntermediateValue(Tier.Backend));

		let value:string = this.getElementValue();
		if (this.pattern == null) value = value.trim();

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

		value = value.trim();

		if (this.pattern != null && value.length > 0)
		{
			this.pattern.setValue(value);
			value = this.pattern.getValue();
		}

		this.before = value;
		this.initial = value;

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
		this.pattern = null;
		this.cse = Case.mixed;
		this.placeholder = null;
		this.datatype$ = DataType.string;

		let datepattern:string = "";
		let types:FormatToken[] = dates.tokenizeFormat();

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
			if (attr == "upper")
				this.cse = Case.upper;

			if (attr == "lower")
				this.cse = Case.lower;

			if (attr == "initcap")
				this.cse = Case.initcap;

			if (attr == "boolean")
				this.datatype$ = DataType.boolean;

			if (attr == "integer")
			{
				this.int = true;
				this.datatype$ = DataType.integer;
			}

			if (attr == "decimal")
			{
				this.dec = true;
				this.datatype$ = DataType.decimal;
			}

			if (attr == "date" || attr == "datetime")
			{
				this.datetokens = [];
				let parts:number = 3;
				this.placeholder = "";

				this.datatype$ = DataType.date;
				types = dates.tokenizeFormat();

				types.forEach((type) =>
				{
					if (type.type == DatePart.Year || type.type == DatePart.Month || type.type == DatePart.Day)
					{
						parts--;
						this.datetokens.push(type);
						this.placeholder += type.mask;
						datepattern += "{"+type.length+"#}";

						if (parts > 0)
						{
							datepattern += type.delimitor;
							this.placeholder += type.delimitor;
						}
					}
				})
			}

			if (attr == "datetime")
			{
				let parts:number = 3;
				this.datatype$ = DataType.datetime;

				datepattern += " ";
				this.placeholder += " ";

				types.forEach((type) =>
				{
					if (type.type == DatePart.Hour || type.type == DatePart.Minute || type.type == DatePart.Second)
					{
						parts--;
						this.datetokens.push(type);
						this.placeholder += type.mask;
						datepattern += "{"+type.length+"#}";

						if (parts > 0)
						{
							datepattern += type.delimitor;
							this.placeholder += type.delimitor;
						}
					}
				})
			}

			if (attr == "maxlength")
			{
				this.maxlen = +value;

				if (isNaN(this.maxlen))
					this.maxlen = null;
			}

			if (attr == "format")
				this.pattern = new Pattern(value);

			if (attr == "placeholder")
				this.placeholder = value;
		});

		if (datepattern.length > 0)
		{
			this.element.type = "text";
			this.pattern = new Pattern(datepattern);
			this.placeholder = this.placeholder.toLowerCase();
		}
		else if (this.pattern != null)
		{
			this.element.type = "text";

			if (this.element.getAttribute("size") == null)
				this.element.setAttribute("size",""+this.pattern.getPlaceholder().length);
		}

		this.element.removeAttribute("placeholder");
	}

	public async handleEvent(event:Event) : Promise<void>
	{
		this.event.setEvent(event);
		let bubble:boolean = false;
		this.event.modified = false;

		if (this.event.type == "wait")
			await this.event.wait();

		if (this.event.waiting)
			return;

		if (this.event.type == "focus")
		{
			bubble = true;
			this.initial = this.getIntermediateValue();

			if (this.pattern != null)
			{
				this.initial = this.pattern.getValue();
				this.setElementValue(this.initial);
				this.setPosition(0);
			}

			if (this.placeholder != null)
				this.element.removeAttribute("placeholder");
		}

		if (this.pattern != null)
		{
			if (!this.xfixed())
					return;
		}

		if (this.event.type == "blur")
		{
			bubble = true;
			let change:boolean = false;

			if (this.pattern == null)
			{
				if (this.getIntermediateValue() != this.initial)
					change = true;
			}
			else
			{
				if (this.pattern.getValue() != this.initial)
					change = true;
			}

			if (change)
			{
				this.event.type = "change";

				if (this.pattern != null)
				{
					this.pattern.setValue(this.getElementValue());

					if (this.pattern.isNull()) this.setElementValue(null);
					else					   this.setElementValue(this.pattern.getValue());
				}

				this.initial = this.getIntermediateValue();
				if (this.pattern != null) this.initial = this.pattern.getValue();

				this.eventhandler.handleEvent(this.event);
				this.event.type = "blur";
			}

			this.initial = this.getIntermediateValue();
			if (this.pattern != null) this.initial = this.pattern.getValue();

			if (this.placeholder != null)
			this.element.removeAttribute("placeholder");
		}

		if (!this.disabled && this.event.type == "mouseover" && this.placeholder != null)
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

		if (this.cse != Case.mixed)
		{
			if (!this.xcase())
				return;
		}

		if (this.event.ignore) return;
		if (this.event.custom) bubble = true;

		if (event.type == "change")
		{
			bubble = false;

			if (this.datatype$ == DataType.integer || this.datatype$ == DataType.decimal)
			{
				let num:string = this.getElementValue();

				if (isNaN(+num)) this.setElementValue(null);
				else if (num.trim().length > 0) this.setElementValue((+num)+"");
			}

			if (this.pattern == null)
			{
				if (this.getIntermediateValue() != this.initial)
					bubble = true;
			}
			else
			{
				this.pattern.setValue(this.getElementValue());

				if (this.pattern.isNull()) this.setElementValue(null);
				else					   		this.setElementValue(this.pattern.getValue());

				if (this.pattern.getValue() != this.initial)
					bubble = true;
			}

			this.initial = this.getIntermediateValue();
			if (this.pattern != null) this.initial = this.pattern.getValue();
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

		if (!this.event.isMouseEvent)
		{
			let after:string = this.getElementValue();

			if (this.before != after)
			{
				bubble = true;
				this.before = after;
				this.event.modified = true;

				if (this.datamapper != null)
					this.datamapper.setIntermediateValue(Tier.Frontend,after);
			}
		}

		if (this.event.accept || this.event.cancel)
			bubble = true;

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

			if (this.cse == Case.upper)
				value = value.toLocaleUpperCase();

			if (this.cse == Case.lower)
				value = value.toLocaleLowerCase();

			if (this.cse == Case.initcap)
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

	private xfixed() : boolean
	{
		if (this.type == "range")
			return(true);

		if (this.element.readOnly)
			return(true);

		let prevent:boolean = this.event.prevent;

		if (this.event.prevent)
			prevent = true;

		if (this.event.type == "drop")
			prevent = true;

		if (this.event.type == "keypress")
			prevent = true;

		if (this.event.key == "ArrowLeft" && this.event.shift)
			prevent = true;

		if (!this.event.modifier)
		{
			switch(this.event.key)
			{
					case "Backspace":
					case "ArrowLeft":
					case "ArrowRight": prevent = true;
			}
		}

		this.event.preventDefault(prevent);
		let pos:number = this.getPosition();

		// Get ready to markup
		if (this.event.mousedown && this.event.mouseinit)
			this.clearSelection();

		// Mark current pos for replace
		if (this.event.type == "click" && !this.event.mousemark)
		{
			let npos:number = this.pattern.findPosition(pos);
			this.setSelection([npos,npos]);

			setTimeout(() =>
			{
				// Sometimes setSelection can fail
				let sel:number[] = this.getSelection();
				if (sel[0] == sel[1]) this.setSelection([npos,npos]);
			},0);

			return(true);
		}

		if (this.event.type == "focus")
		{
			pos = this.pattern.findPosition(0);

			this.pattern.setValue(this.getIntermediateValue());
			this.setIntermediateValue(this.pattern.getValue());

			this.setPosition(pos);
			this.pattern.setPosition(pos);

			return(true);
		}

		if (this.event.type == "blur")
		{
			this.pattern.setValue(this.getIntermediateValue());
			if (this.pattern.isNull()) this.clear();
				return(true);
		}

		if (this.event.type == "change")
			return(true);

		if (this.event.type?.startsWith("mouse") || this.event.type == "wheel")
			return(true);

		let ignore:boolean = this.event.ignore;
		if (this.event.printable) ignore = false;

		if (this.event.repeat)
		{
			switch(this.event.key)
			{
					case "Backspace":
					case "ArrowLeft":
					case "ArrowRight": ignore = false;
			}
		}

		if (ignore) return(true);

		if (this.event.key == "Backspace" && !this.event.modifier)
		{
			let sel:number[] = this.getSelection();

			if (sel[0] == sel[1] && !this.pattern.input(sel[0]))
			{
					pos = this.pattern.prev(true);
					this.setSelection([pos,pos]);
			}
			else
			{
				pos = sel[0];

				if (sel[0] > 0 && sel[0] == sel[1])
				{
					pos--;

					// Move past fixed pattern before deleting
					if (!this.pattern.setPosition(pos) && sel[0] > 0)
					{
						let pre:number = pos;

						pos = this.pattern.prev(true);
						let off:number = pre - pos;

						if (off > 0)
						{
								sel[0] = sel[0] - off;
								sel[1] = sel[1] - off;
						}
					}
				}

				pos = sel[0];
				this.setElementValue(this.pattern.delete(sel[0],sel[1]));

				if (sel[1] == sel[0] + 1)
					pos = this.pattern.prev(true);

				if (!this.pattern.setPosition(pos))
					pos = this.pattern.prev(true,pos);

				if (!this.pattern.setPosition(pos))
					pos = this.pattern.next(true,pos);

				this.setSelection([pos,pos]);
			}

			return(true);
		}

		if (this.event.undo || this.event.paste)
		{
			setTimeout(() =>
			{
				this.pattern.setValue(this.getIntermediateValue());
				this.setValue(this.pattern.getValue());
				this.setPosition(this.pattern.next(true,pos));
			},0);
			return(true);
		}

		if (this.datetokens != null)
		{
			if (KeyMapping.parseBrowserEvent(this.event) == KeyMap.now)
			{
				this.pattern.setValue(this.getCurrentDate());
				this.setElementValue(this.pattern.getValue());

				this.setPosition(0);
				this.pattern.setPosition(0);

				return(true);
			}
		}

		if (this.event.printable)
		{
			let sel:number[] = this.getSelection();

			if (sel[0] != sel[1])
			{
				pos = sel[0];

				if (!this.pattern.isValid(pos,this.event.key))
					return(true);

				this.pattern.delete(sel[0],sel[1]);
				this.setElementValue(this.pattern.getValue());
				pos = this.pattern.findPosition(sel[0]);
				this.setSelection([pos,pos]);
			}

			if (this.pattern.setCharacter(pos,this.event.key))
			{
				if (this.datetokens != null)
					this.validateDateField(pos);

				pos = this.pattern.next(true,pos);
						this.setElementValue(this.pattern.getValue());
						this.setSelection([pos,pos]);
			}

			return(true);
		}

		if (this.event.key == "ArrowLeft")
		{
			let sel:number[] = this.getSelection();

			if (!this.event.modifier)
			{
				pos = this.pattern.prev(true);
				this.setSelection([pos,pos]);
			}
			else if (this.event.shift)
			{
				if (pos > 0)
				{
					pos--;
					this.setSelection([pos,sel[1]-1]);
				}
			}

			return(false);
		}

		if (this.event.key == "ArrowRight")
		{
			let sel:number[] = this.getSelection();

			if (!this.event.modifier)
			{
				pos = this.pattern.next(true);
				this.setSelection([pos,pos]);
			}
			else if (this.event.shift)
			{
				pos = sel[1];

				if (pos < this.pattern.size())
					this.setSelection([sel[0],pos]);
			}

			return(false);
		}

		return(true);
	}

	private finishDate() : string
	{
		let empty:boolean = false;
		let input:string = this.getElementValue();
		let today:string = dates.format(new Date());

		this.datetokens.forEach((part) =>
		{
			empty = true;

			for (let i = part.pos; i < part.pos + part.length; i++)
				if (input.charAt(i) != ' ') empty = false;

			if (!empty)
			{
				let fld:string = input.substring(part.pos,part.pos+part.length);

				fld = fld.trim();

				if (part.type == DatePart.Year && fld.length == 2)
					fld = today.substring(part.pos,part.pos+2) + fld;

				while(fld.length < part.length) fld = "0"+fld;
				input = input.substring(0,part.pos) + fld + input.substring(part.pos+part.length);
			}

			if (empty)
			{
				input = input.substring(0,part.pos) +
				today.substring(part.pos,part.pos+part.length) +
				input.substring(part.pos+part.length);

			}
		})

		return(input);
	}

	private validateDateField(pos:number) : void
	{
		let section:Section = this.pattern.findField(pos);
		let token:FormatToken = this.datetokens[section.field()];

		let maxval:number = 0;
		let value:string = section.getValue();

		switch(token.type)
		{
			case DatePart.Day 		: maxval = 31; break;
			case DatePart.Month 		: maxval = 12; break;
			case DatePart.Hour 		: maxval = 23; break;
			case DatePart.Minute 	: maxval = 59; break;
			case DatePart.Second 	: maxval = 59; break;
		}

		if (maxval > 0 && +value > maxval)
			section.setValue(""+maxval);


		let finished:boolean = true;
		this.pattern.getFields().forEach((section) =>
		{
			value = section.getValue();

			if (value.trim().length > 0)
			{
				let lpad:string = "";

				for (let i = 0; i < value.length; i++)
				{
					if (value.charAt(i) != ' ') break;
					else lpad += "0";
				}

				if (lpad.length > 0)
					section.setValue(lpad+value.substring(lpad.length));
			}

			if (section.getValue().includes(' '))
				finished = false;
		});

		if (finished)
		{
			let dayentry:number = -1;

			for (let i = 0; i < this.datetokens.length; i++)
			{
				if (this.datetokens[i].type == DatePart.Day)
					dayentry = i;
			}

			if (dayentry >= 0)
			{
				let tries:number = 3;
				value = this.pattern.getValue();

				while(dates.parse(this.pattern.getValue()) == null && --tries >= 0)
				{
					let day:number = +this.pattern.getField(dayentry).getValue();
					this.pattern.getField(dayentry).setValue(""+(day-1));
				}

				if (tries < 3)
					Alert.message("Date '"+value+"' is invalid, changed to "+this.pattern.getValue(),"Date Validation");
			}
		}
	}

	private getCurrentDate() : string
	{
		return(dates.format(new Date()));
	}

	private getPosition() : number
	{
		let pos:number = this.element.selectionStart;

		if (pos < 0)
		{
			pos = 0;
			this.setSelection([pos,pos]);
		}

		return(pos);
	}

	private setPosition(pos:number) : void
	{
		if (pos < 0) pos = 0;
		let sel:number[] = [pos,pos];

		if (pos == 0) sel[1] = 1;
			this.element.setSelectionRange(sel[0],sel[1]);
	}

	private setSelection(sel:number[]) : void
	{
		if (sel[0] < 0) sel[0] = 0;
		if (sel[1] < sel[0]) sel[1] = sel[0];

		this.element.selectionStart = sel[0];
		this.element.selectionEnd = sel[1]+1;
	}

	private clearSelection() : void
	{
		this.element.setSelectionRange(0,0);
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