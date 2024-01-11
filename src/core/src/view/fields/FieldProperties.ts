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
import { Class } from "../../public/Class.js";
import { FieldInstance } from "./FieldInstance.js";
import { BasicProperties } from "./BasicProperties.js";
import { ListOfValues } from "../../public/ListOfValues.js";
import { Formatter, SimpleFormatter } from "./interfaces/Formatter.js";


export class FieldProperties extends BasicProperties
{
	protected row$:number = -1;
	protected id$:string = null;
	protected name$:string = null;
	protected block$:string = null;
	protected inst$:FieldInstance = null;

	public get id() : string
	{
		return(this.id$);
	}

	public set id(id:string)
	{
		this.id$ = null;

		if (id != null)
		{
			this.id$ = id.trim().toLowerCase();
			if (this.id$.length == 0) this.id$ = null;
		}
	}

	public get type() : string
	{
		return(this.inst$.element.getAttribute("type"));
	}

	public get name() : string
	{
		return(this.name$);
	}

	public set name(name:string)
	{
		this.name$ = null;

		if (name != null)
		{
			this.name$ = name.trim().toLowerCase();
			if (this.name$.length == 0) this.name$ = null;
		}
	}

	public get block() : string
	{
		return(this.block$);
	}

	public set block(block:string)
	{
		this.block$ = null;

		if (block != null)
		{
			this.block$ = block.trim().toLowerCase();
			if (this.block$.length == 0) this.block$ = null;
		}
	}

	public get row() : number
	{
		return(this.row$);
	}

	public set row(row:number)
	{
		if (row < 0) this.row$ = -1;
		else		    this.row$ = row;
	}

	public get inst() : FieldInstance
	{
		return(this.inst$);
	}

	public set inst(inst:FieldInstance)
	{
		this.inst$ = inst;
	}

	public setTag(tag:string) : FieldProperties
	{
		this.tag = tag;
		return(this);
	}

	public setType(type:DataType) : FieldProperties
	{
		super.setType(type);
		return(this);
	}

	public setEnabled(flag:boolean) : FieldProperties
	{
		this.enabled = flag;
		return(this);
	}

	public setDisabled(flag:boolean) : FieldProperties
	{
		this.setEnabled(!flag);
		return(this);
	}

	public setReadOnly(flag:boolean) : FieldProperties
	{
		this.readonly = flag;
		return(this);
	}

	public setRequired(flag:boolean) : FieldProperties
	{
		this.required = flag;
		return(this);
	}

	public setHidden(flag:boolean) : FieldProperties
	{
		this.hidden = flag;
		return(this);
	}

	public setStyles(styles:string) : FieldProperties
	{
		this.styles = styles;
		return(this);
	}

	public removeStyle(style:string) : FieldProperties
	{
		super.removeStyle(style);
		return(this);
	}

	public setClass(clazz:string) : FieldProperties
	{
		super.setClass(clazz);
		return(this);
	}

	public setClasses(classes:string|string[]) : FieldProperties
	{
		super.setClasses(classes);
		return(this);
	}

	public removeClass(clazz:any) : FieldProperties
	{
		super.removeClass(clazz);
		return(this);
	}

	public setAttribute(attr:string, value?:any) : FieldProperties
	{
		super.setAttribute(attr,value);
		return(this);
	}

	public setAttributes(attrs:Map<string,string>) : FieldProperties
	{
		super.setAttributes(attrs);
		return(this);
	}

	public removeAttribute(attr:string) : FieldProperties
	{
		super.removeAttribute(attr);
		return(this);
	}

	public setValue(value:string) : FieldProperties
	{
		this.value = value;
		return(this);
	}

    public setValidValues(values: string[] | Set<any> | Map<any,any>) : FieldProperties
	{
		this.validValues = values;
		return(this);
	}

	public setMapper(mapper:Class<DataMapper>|DataMapper|string) : FieldProperties
	{
		super.setMapper(mapper);
		return(this);
	}

	public setFormatter(formatter:Class<Formatter>|Formatter|string) : FieldProperties
	{
		super.setFormatter(formatter);
		return(this);
	}

	/** Set simple formatter */
	public setSimpleFormatter(formatter:Class<SimpleFormatter>|SimpleFormatter|string) : FieldProperties
	{
		super.setSimpleFormatter(formatter);
		return(this);
	}

	/** Set listofvalues */
	public setListOfValues(listofvalues:Class<ListOfValues>|ListOfValues|string) : FieldProperties
	{
		super.setListOfValues(listofvalues);
		return(this);
	}
}