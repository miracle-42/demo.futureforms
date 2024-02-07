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

import { DataType } from "./DataType.js";
import { DataMapper } from "./DataMapper.js";
import { MSGGRP } from "../../messages/Internal.js";
import { Messages } from "../../messages/Messages.js";
import { Class, isClass } from "../../public/Class.js";
import { ListOfValues } from "../../public/ListOfValues.js";
import { Properties } from "../../application/Properties.js";
import { FormsModule } from "../../application/FormsModule.js";
import { ComponentFactory } from '../../application/interfaces/ComponentFactory.js';
import { Formatter, SimpleFormatter, isFormatter, isSimpleFormatter } from "./interfaces/Formatter.js";


export interface Style
{
	style:string;
	value:string;
}

export class BasicProperties
{
	protected tag$:string = null;
	protected styles$:Style[] = [];
	protected classes$:string[] = [];
	protected mapper$:DataMapper = null;
	protected formatter$:Formatter = null;
	protected listofvalues$:ListOfValues = null;
	protected simpleformatter$:SimpleFormatter = null;
	protected attribs$:Map<string,string> = new Map<string,string>();

	protected hidden$:boolean = false;
	protected enabled$:boolean = false;
	protected advquery$:boolean = true;
	protected derived$:boolean = false;
	protected readonly$:boolean = false;
	protected required$:boolean = false;

	protected value$:string = null;
	protected values$:Map<any,any> = new Map<any,any>();

	protected handled$:string[] = ["id","name",Properties.BindAttr,"row","invalid"];

	protected structured$:string[] =
	[
		"hidden","enabled","readonly","required","derived","advquery",
		"value","class","style","mapper","formatter","lov"
	];

	public get tag() : string
	{
		return(this.tag$);
	}

	public set tag(tag:string)
	{
		this.tag$ = tag?.toLowerCase();
	}

	public setTag(tag:string) : BasicProperties
	{
		this.tag = tag;
		return(this);
	}

	public get enabled() : boolean
	{
		return(this.enabled$);
	}

	public set enabled(flag:boolean)
	{
		this.enabled$ = flag;
	}

	public setEnabled(flag:boolean) : BasicProperties
	{
		this.enabled = flag;
		return(this);
	}

	public get readonly() : boolean
	{
		return(this.readonly$);
	}

	public set readonly(flag:boolean)
	{
		this.readonly$ = flag;
	}

	public setReadOnly(flag:boolean) : BasicProperties
	{
		this.readonly = flag;
		return(this);
	}

	public get required() : boolean
	{
		return(this.required$);
	}

	public set required(flag:boolean)
	{
		this.required$ = flag;
	}

	public get derived() : boolean
	{
		return(this.derived$);
	}

	public set derived(flag:boolean)
	{
		this.derived$ = flag;
	}

	public get advquery() : boolean
	{
		return(this.advquery$);
	}

	public set advquery(flag:boolean)
	{
		this.advquery$ = flag;
	}

	public setRequired(flag:boolean) : BasicProperties
	{
		this.required = flag;
		return(this);
	}

	public setDerived(flag:boolean) : BasicProperties
	{
		this.derived = flag;
		return(this);
	}

	public setAdvancedQuery(flag:boolean) : BasicProperties
	{
		this.advquery = flag;
		return(this);
	}

	public get hidden() : boolean
	{
		return(this.hidden$);
	}

	public set hidden(flag:boolean)
	{
		this.hidden$ = flag;
	}

	public setHidden(flag:boolean) : BasicProperties
	{
		this.hidden = flag;
		return(this);
	}

	public get styleElements() : Style[]
	{
		return(this.styles$);
	}

	public getStyle(style:string) : string
	{
		style = style?.toLowerCase();

		for (let i = 0; i < this.styles$.length; i++)
		{
			if (this.styles$[i].style == style)
				return(this.styles$[i].value);
		}

		return(null);
	}

	public getStyles() : Style[]
	{
		return(this.styles$);
	}

	public setType(type:DataType) : BasicProperties
	{
		let date:boolean = this.hasClass("date");
		let datetime:boolean = this.hasClass("datetime");

		this.removeClass("date");
		this.removeClass("integer");
		this.removeClass("decimal");
		this.removeClass("datetime");

		switch(type)
		{
			case DataType.date :
			{
				if (!datetime) this.setClass("date");
				else 		   this.setClass("datetime");
			}
			break;

			case DataType.datetime :
			{
				if (date) this.setClass("date");
				else 	  this.setClass("datetime");
			}
			break;

			case DataType.integer : this.setClass("integer"); break;
			case DataType.decimal : this.setClass("decimal"); break;
		}

		return(this);
	}

	public get style() : string
	{
		let style:string = "";
		this.styles$.forEach((element) => {style += element.style+":"+element.value+";"});
		return(style)
	}

	public set styles(styles:string|Style[])
	{
		if (styles == null)
		{
			this.styles$ = [];
			return;
		}

		if (!(typeof styles === "string"))
		{
			this.styles$ = styles;
			return;
		}

		let elements:string[] = styles.split(";")

		for (let i = 0; i < elements.length; i++)
		{
			let element:string = elements[i].trim();

			if (element.length > 0)
			{
				let pos:number = element.indexOf(':');

				if (pos > 0)
				{
					let style:string = element.substring(0,pos).trim();
					let value:string = element.substring(pos+1).trim();

					this.setStyle(style,value);
				}
			}
		}
	}

	public setStyles(styles:string|Style[]) : BasicProperties
	{
		this.styles = styles;
		return(this);
	}

	public setStyle(style:string, value:string) : BasicProperties
	{
		value = value?.toLowerCase();
		style = style?.toLowerCase();

		this.removeStyle(style);
		this.styles$.push({style: style, value: value});

		return(this);
	}

	public removeStyle(style:string) : BasicProperties
	{
		style = style?.toLowerCase();

		for (let i = 0; i < this.styles$.length; i++)
		{
			if (this.styles$[i].style == style)
			{
				this.styles$.splice(i,1);
				break;
			}
		}

		return(this);
	}

	public setClass(clazz:string) : BasicProperties
	{
		if (clazz == null)
			return(this);

		clazz = clazz.trim();

		if (clazz.includes(' '))
		{
			this.setClasses(clazz);
			return(this);
		}

		clazz = clazz?.toLowerCase();

		if (!this.classes$.includes(clazz))
			this.classes$.push(clazz);

		return(this);
	}

	public setClasses(classes:string|string[]) : BasicProperties
	{
		this.classes$ = [];

		if (classes == null)
			return(this);

		if (!Array.isArray(classes))
			classes = classes.split(' ');

		for (let i = 0; i < classes.length; i++)
		{
			if (classes[i]?.length > 0)
				this.classes$.push(classes[i].toLowerCase());
		}

		return(this);
	}

	public getClasses() : string[]
	{
		return(this.classes$);
	}

	public hasClass(clazz:string) : boolean
	{
		clazz = clazz?.toLowerCase();
		return(this.classes$.includes(clazz));
	}

	public removeClass(clazz:any) : BasicProperties
	{
		clazz = clazz?.toLowerCase();
		let idx:number = this.classes$.indexOf(clazz);
		if (idx >= 0) this.classes$.splice(idx,1)
		return(this);
	}

	public getAttributes() : Map<string,string>
	{
		return(this.attribs$);
	}

	public setAttributes(attrs:Map<string,string>) : BasicProperties
	{
		this.attribs$ = attrs;
		return(this);
	}

	public hasAttribute(attr:string) : boolean
	{
		return(this.attribs$.has(attr?.toLowerCase()));
	}

	public getAttribute(attr:string) : string
	{
		return(this.attribs$.get(attr?.toLowerCase()));
	}

	public setAttribute(attr:string, value?:any) : BasicProperties
	{
		attr = attr?.toLowerCase();

		if (this.handled$.includes(attr))
			return(this);

		if (this.structured$.includes(attr))
		{
			let flag:boolean = true;

			if (value != null && value.toLowerCase() == "false")
				flag = false;

			switch(attr)
			{
				case "value": this.value$ = value; break;
				case "hidden": this.hidden = flag; break;
				case "enabled": this.enabled = flag; break;
				case "derived": this.derived = flag; break;
				case "advquery": this.advquery = flag; break;
				case "readonly": this.readonly = flag; break;
				case "required": this.required = flag; break;

				case "style": this.setStyles(value); break;
				case "class": this.setClasses(value); break;

				case "mapper": this.setMapper(value); break;
				case "lov": this.setListOfValues(value); break;
				case "formatter": this.setFormatterType(value); break;
			}

			return(this);
		}

		let val:string = "";
		attr = attr?.toLowerCase();

		if (value != null)
			val += value;

		this.attribs$.set(attr,val);
		return(this);
	}

	public removeAttribute(attr:string) : BasicProperties
	{
		attr = attr?.toLowerCase();
		this.attribs$.delete(attr);

		switch(attr)
		{
			case "value": this.value$ = null; break;
			case "hidden": this.hidden = false; break;
			case "enabled": this.enabled = false; break;
			case "derived": this.derived = false; break;
			case "advquery": this.advquery = true; break;
			case "readonly": this.readonly = false; break;
			case "required": this.required = false; break;

			case "style": this.setStyles(null); break;
			case "class": this.setClasses(null); break;

			case "mapper": this.setMapper(null); break;
			case "lov": this.setListOfValues(null); break;
			case "formatter": this.setFormatter(null); break;
		}

		return(this);
	}

	public get value() : string
	{
		return(this.value$);
	}

	public set value(value:string)
	{
		this.value$ = null;

		if (value != null)
		{
			this.value$ = value.trim();
			if (this.value$.length == 0)
				this.value$ = null;
		}
	}

	public setValue(value:string) : BasicProperties
	{
		this.value = value;
		return(this);
	}


	 public get validValues() : Map<any,any>
	{
		return(this.values$);
	 }

	 public set validValues(values: string[] | Set<any> | Map<any,any>)
	{
		if (Array.isArray(values) || values instanceof Set)
		{
			this.values$ = new Map<any,any>();
			values.forEach((value:string) => {this.values$.set(value,value)});
		}
		else this.values$ = values;
	 }

	 public setValidValues(values: string[] | Set<any> | Map<any,any>) : BasicProperties
	{
		this.validValues = values;
		return(this);
	}

	 public getValidValues() : Map<any,any>
	{
		return(this.values$);
	 }

	public get mapper() : DataMapper
	{
		return(this.mapper$);
	}

	public set mapper(mapper:DataMapper)
	{
		this.mapper$ = mapper;
	}

	public setMapper(mapper:Class<DataMapper>|DataMapper|string) : BasicProperties
	{
		let factory:ComponentFactory =
			Properties.FactoryImplementation;

		if (typeof mapper === "string")
			mapper = FormsModule.getComponent(mapper);

		if (!isClass(mapper)) this.mapper$ = mapper;
		else this.mapper$ = factory.createBean(mapper) as DataMapper;

		if (this.mapper$ != null && !("getIntermediateValue" in this.mapper$))
		{
			// Not an instance of DataMapper
			Messages.severe(MSGGRP.FRAMEWORK,18,(this.mapper$ as any).constructor.name);
			this.mapper$ = null;
		}

		return(this);
	}

	public get formatter() : Formatter
	{
		return(this.formatter$);
	}

	public set formatter(formatter:Formatter)
	{
		this.formatter$ = formatter;
	}

	public setFormatter(formatter:Class<Formatter>|Formatter|string) : BasicProperties
	{
		let factory:ComponentFactory =
			Properties.FactoryImplementation;

		if (typeof formatter === "string")
			formatter = FormsModule.getComponent(formatter);

		if (!isClass(formatter)) this.formatter$ = formatter;
		else this.formatter$ = factory.createBean(formatter) as Formatter;

		return(this);
	}

	public get simpleformatter() : SimpleFormatter
	{
		return(this.simpleformatter$);
	}

	public set simpleformatter(formatter:SimpleFormatter)
	{
		this.simpleformatter$ = formatter;
	}

	public setSimpleFormatter(formatter:Class<SimpleFormatter>|SimpleFormatter|string) : BasicProperties
	{
		let factory:ComponentFactory =
			Properties.FactoryImplementation;

		if (typeof formatter === "string")
		{
			let map:string = formatter;
			formatter = FormsModule.getComponent(map);
			if (!formatter) Messages.severe(MSGGRP.FRAMEWORK,19,map); // Not mapped
		}

		if (!isClass(formatter)) this.simpleformatter$ = formatter;
		else this.simpleformatter$ = factory.createBean(formatter) as SimpleFormatter;

		return(this);
	}

	public get listofvalues() : ListOfValues
	{
		return(this.listofvalues$);
	}

	public set listofvalues(listofvalues:ListOfValues)
	{
		this.listofvalues$ = listofvalues;
	}

	public setListOfValues(listofvalues:Class<ListOfValues>|ListOfValues|string) : BasicProperties
	{
		let factory:ComponentFactory =
			Properties.FactoryImplementation;

		if (typeof listofvalues === "string")
		{
			let map:string = listofvalues;
			listofvalues = FormsModule.getComponent(map);
			if (!listofvalues) Messages.severe(MSGGRP.FRAMEWORK,19,map); // Not mapped
		}

		if (!isClass(listofvalues)) this.listofvalues$ = listofvalues;
		else this.listofvalues$ = factory.createBean(listofvalues) as ListOfValues;

		return(this);
	}

	private setFormatterType(formatter:string) : void
	{
		let impl:any = FormsModule.getComponent(formatter);

		if (isFormatter(impl)) this.setFormatter(impl);
		else if (isSimpleFormatter(impl)) this.setSimpleFormatter(impl);
	}
}