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

import { Field } from "./Field.js";
import { Status } from "../Row.js";
import { DataType } from "./DataType.js";
import { Form } from "../../public/Form.js";
import { FieldTypes } from "./FieldType.js";
import { Class } from "../../public/Class.js";
import { Display } from "./implementations/Display.js";
import { FieldProperties } from "./FieldProperties.js";
import { CheckBox } from "./implementations/CheckBox.js";
import { Properties } from "../../application/Properties.js";
import { FieldFeatureFactory } from "../FieldFeatureFactory.js";
import { FieldEventHandler } from "./interfaces/FieldEventHandler.js";
import { FieldImplementation, FieldState } from "./interfaces/FieldImplementation.js";
import { BrowserEvent, BrowserEvent as Event} from "../../control/events/BrowserEvent.js";


export class FieldInstance implements FieldEventHandler
{
	private form$:Form = null;
	private field$:Field = null;
	private ignore$:string = null;
	private element$:HTMLElement = null;
	private impl:FieldImplementation = null;
	private properties$:FieldProperties = null;
	private defproperties$:FieldProperties = null;
	private insproperties$:FieldProperties = null;
	private qbeproperties$:FieldProperties = null;
	private clazz:Class<FieldImplementation> = null;

	constructor(form:Form,tag:HTMLElement)
	{
		this.form$ = form;
		this.properties$ = FieldFeatureFactory.consume(tag);
		this.field$ = Field.create(form,this.properties$.block,this.properties$.name,this.properties$.row);

		this.clazz = FieldTypes.get(tag.tagName,this.properties$.getAttribute("type"));

		this.impl = new this.clazz();
		this.impl.create(this,this.properties$.tag);

		this.properties.inst = this;

		this.defproperties$ = this.properties;
		this.insproperties$ = this.properties;
		this.qbeproperties$ = this.properties;

		this.element$ = this.impl.getElement();
		FieldFeatureFactory.setMode(this,null);

		this.field$.addInstance(this);
	}

	public finalize() : void
	{
		let query:string = this.properties$.getAttribute("query");
		let insert:string = this.properties$.getAttribute("insert");

		this.properties$.removeAttribute("query");
		this.properties$.removeAttribute("insert");

		this.insproperties$ = FieldFeatureFactory.clone(this.properties$);

		if (insert != null)
		{
			let flag:boolean = insert.toLowerCase() == "true";
			this.insproperties$.setReadOnly(!flag);
		}

		if (query == null) query = "true";
		let flag:boolean = query.toLowerCase() == "true";
		this.qbeproperties$ = FieldFeatureFactory.clone(this.properties$);

		this.qbeproperties$.enabled = flag;
		this.qbeproperties$.required = false;
		this.qbeproperties$.readonly = !flag;

		FieldFeatureFactory.apply(this,this.properties$);
		this.impl.apply(this.properties$,true);
	}

	public resetProperties() : void
	{
		let props:FieldProperties = null;

		switch(this.field.row.status)
		{
			case Status.na 		: if (this.properties$ != this.defproperties$) props = this.defproperties$; break;
			case Status.qbe 		: if (this.properties$ != this.qbeproperties$) props = this.qbeproperties$; break;
			case Status.new 		: if (this.properties$ != this.insproperties$) props = this.insproperties$; break;
			case Status.update 	: if (this.properties$ != this.defproperties$) props = this.defproperties$; break;
			case Status.insert 	: if (this.properties$ != this.insproperties$) props = this.insproperties$; break;
		}

		if (props != null)
			this.applyProperties(props);

		FieldFeatureFactory.setMode(this,this.properties$);
	}

	public setDefaultProperties(props:FieldProperties, status:Status) : void
	{
		switch(status)
		{
			case Status.qbe : this.qbeproperties$ = props; break;
			case Status.new : this.insproperties$ = props; break;
			case Status.insert : this.insproperties$ = props; break;
			default : this.defproperties$ = props;
		}

		if (status != this.field.row.status)
			return;

		this.properties$ = props;
		let clazz:Class<FieldImplementation> = FieldTypes.get(props.tag,props.type);

		if (clazz == this.clazz) this.updateField(props);
		else					 		 this.changeFieldType(clazz,props);
	}

	public applyProperties(props:FieldProperties) : void
	{
		this.properties$ = props;
		let clazz:Class<FieldImplementation> = FieldTypes.get(props.tag,props.type);

		if (clazz == this.clazz) this.updateField(props);
		else					       this.changeFieldType(clazz,props);
	}

	// Properties changed, minor adjustments
	private updateField(newprops:FieldProperties) : void
	{
		let value:any = null;
		let valid:boolean = this.valid;

		if (!this.field.dirty) value = this.impl.getValue();
		else				   	  value = this.impl.getIntermediateValue();

		this.impl.apply(newprops,false);
		FieldFeatureFactory.reset(this.element);
		FieldFeatureFactory.apply(this,newprops);

		this.valid = valid;

		if (!this.field.dirty) this.impl.setValue(value);
		else				        this.impl.setIntermediateValue(value);
	}

	// Properties changed, build new field
	private changeFieldType(clazz:Class<FieldImplementation>, newprops:FieldProperties) : void
	{
		let value:any = null;
		let valid:boolean = this.valid;

		if (!this.field.dirty) value = this.impl.getValue();
		else				   value = this.impl.getIntermediateValue();

		this.clazz = clazz;
		this.impl = new this.clazz();
		this.impl.create(this,newprops.tag);

		let before:HTMLElement = this.element;
		this.element$ = this.impl.getElement();
		FieldFeatureFactory.apply(this,newprops);

		this.impl.apply(newprops,true);
		before.replaceWith(this.element);

		this.valid = valid;

		if (!this.field.dirty) this.impl.setValue(value);
		else				   this.impl.setIntermediateValue(value);
	}

	public get row() : number
	{
		return(this.properties$.row);
	}

	public get form() : Form
	{
		return(this.form$);
	}

	public get id() : string
	{
		return(this.properties$.id);
	}

	public get name() : string
	{
		return(this.properties$.name);
	}

	public get block() : string
	{
		return(this.properties.block);
	}

	public get field() : Field
	{
		return(this.field$);
	}

	public get element() : HTMLElement
	{
		return(this.element$);
	}

	public get datatype() : DataType
	{
		return(this.impl.datatype);
	}

	public set datatype(type:DataType)
	{
		this.impl.datatype = type;
	}

	public setValidated() : void
	{
		this.impl.setValidated();
	}

	public get implementation() : FieldImplementation
	{
		return(this.impl);
	}

	public get ignore() : string
	{
		return(this.ignore$);
	}

	public set ignore(value:string)
	{
		this.ignore$ = value;
	}

	public get valid() : boolean
	{
		let valid:boolean = true;

		this.element.classList.forEach((clazz) =>
		{
			if (clazz == Properties.Classes.Invalid)
				valid = false;
		})

		return(valid);
	}

	public set valid(flag:boolean)
	{
		if (!flag) this.element.classList.add(Properties.Classes.Invalid);
		else       this.element.classList.remove(Properties.Classes.Invalid);
	}

	public get properties() : FieldProperties
	{
		return(this.properties$);
	}

	public get defaultProperties() : FieldProperties
	{
		return(this.defproperties$);
	}

	public get qbeProperties() : FieldProperties
	{
		return(this.qbeproperties$);
	}

	public get updateProperties() : FieldProperties
	{
		return(this.defproperties$);
	}

	public get insertProperties() : FieldProperties
	{
		return(this.insproperties$);
	}

	public clear() : void
	{
		this.valid = true;
		this.impl.clear();
		this.resetProperties();
	}

	public getValue() : any
	{
		return(this.impl.getValue());
	}

	public setValue(value:any) : boolean
	{
		this.valid = true;
		this.field.valid = true;
		return(this.impl.setValue(value));
	}

	public getIntermediateValue() : string
	{
		return(this.impl.getIntermediateValue());
	}

	public setIntermediateValue(value:string) : void
	{
		this.valid = true;
		this.field.valid = true;
		this.impl.setIntermediateValue(value);
	}

	public skip() : void
	{
		let focus:Element = document.activeElement;
		let inst:HTMLElement = this.impl.getElement();

		if (focus == inst)
		{
			this.ignore = "skip";
			inst.blur();
		}
	}

	public blur(ignore?:boolean) : void
	{
		if (ignore == null) ignore = false;
		let focus:Element = document.activeElement;
		let inst:HTMLElement = this.impl.getElement();

		if (focus == inst)
		{
			if (ignore) this.ignore = "blur";
			inst.blur();
			this.ignore = null;
		}
	}

	public focus(ignore?:boolean) : void
	{
		if (ignore == null) ignore = false;
		let focus:Element = document.activeElement;
		let inst:HTMLElement = this.impl.getElement();

		if (focus != inst)
		{
			if (ignore) this.ignore = "focus";
			let event:BrowserEvent = BrowserEvent.get();

			inst.focus();

			if (!ignore)
			{
				event.setFocusEvent();
				this.field.handleEvent(this,event);
			}

			this.ignore = null;
		}
	}

	public hasFocus() : boolean
	{
		return(this.impl.getElement() == document.activeElement);
	}

	public focusable(status?:Status) : boolean
	{
		let props:FieldProperties = this.properties$;

		if (status != null)
		{
			switch(status)
			{
				case Status.na : props = this.defproperties$; break;
				case Status.qbe : props = this.qbeproperties$; break;
				case Status.new : props = this.insproperties$; break;
				case Status.insert : props = this.insproperties$; break;
				case Status.update : props = this.defproperties$; break;
			}
		}

		if (this.impl instanceof Display && props.getAttribute("tabindex") == null)
			return(false);

		if (this.impl instanceof CheckBox && props.readonly)
			return(false);

		if (props.hidden) return(false);
		if (!props.enabled) return(false);

		return(true);
	}

	public editable(status?:Status) : boolean
	{
		if (this.impl instanceof Display)
			return(false);

		let props:FieldProperties = this.properties$;

		if (status != null)
		{
			switch(status)
			{
				case Status.na : props = this.defproperties$; break;
				case Status.qbe : props = this.qbeproperties$; break;
				case Status.new : props = this.insproperties$; break;
				case Status.insert : props = this.insproperties$; break;
				case Status.update : props = this.defproperties$; break;
			}
		}

		return(!props.readonly && !props.hidden);
	}

	public setFieldState(state:FieldState) : void
	{
		this.impl.setFieldState(state);
	}

	public async handleEvent(event:Event) : Promise<void>
	{
		return(this.field.handleEvent(this,event));
	}

	public toString() : string
	{
		return(this.name+"["+this.row+"]");
	}
}