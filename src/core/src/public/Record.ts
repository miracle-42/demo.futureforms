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

import { Row } from "../view/Row.js";
import { Field } from "../view/fields/Field.js";
import { FieldProperties } from "./FieldProperties.js";
import { Block as ModelBlock } from "../model/Block.js";
import { Record as Internal, RecordState } from "../model/Record.js";

export class Record
{
	private rec$:Internal = null;

	constructor(rec:Internal)
	{
		this.rec$ = rec;
	}

	public get recno() : number
	{
		return(this.rec$.wrapper.index(this.rec$));
	}

	public get state() : RecordState
	{
		return(this.rec$.state);
	}

	public get inserted() : boolean
	{
		return(this.rec$.inserted);
	}

	public get updated() : boolean
	{
		return(this.rec$.updated);
	}

	public get deleted() : boolean
	{
		return(this.rec$.deleted);
	}

	public get synchronized() : boolean
	{
		return(this.rec$.synched);
	}

	public get response() : any
	{
		return(this.rec$.response);
	}

	public getValue(field:string) : any
	{
		field = field?.toLowerCase();
		let blk:ModelBlock = this.rec$.block;
		let row:Row = blk?.view.displayed(this.rec$);

		let fld:Field = row?.getField(field);

		if (fld == null && row != null)
		{
			if (blk.view.row == row.rownum)
				fld = blk.view.getRow(-1)?.getField(field);
		}

		if (fld != null)
			return(fld.getValue());

		return(this.rec$.getValue(field));
	}

	/**
	 * Execute datasource default lock method.
	 */
	public async lock() : Promise<boolean>
	{
		return(this.rec$.wrapper?.lock(this.rec$,true));
	}

	/**
	 * Mark the record as locked.
	 */
	public markAsLocked(flag?:boolean) : void
	{
		if (flag == null) flag = true;
		this.rec$.locked = flag;
	}

	/**
	 * Make sure the datasource marks this record updated.
	 * @param field any non derived field
	 */
	public setDirty(field?:string) : void
	{
		this.rec$.setDirty(field);
		this.rec$.wrapper.dirty = true;
	}

	/**
	 * setAndValidate field value as if changed by a user.
	 * @param field
	 */
	 public async setAndValidate(field:string, value:any) : Promise<boolean>
	 {
		if (!await this.lock())
			return(false);

		this.setValue(field,value);
		field = field?.toLowerCase();
		let blk:ModelBlock = this.rec$.block;

		return(blk.validateField(this.rec$,field));
	 }

	/**
	 * Set the field value. This operation neither locks the record, nor marks it dirty
	 * @param field
	 * @param value
	 */
	public setValue(field:string, value:any) : void
	{
		field = field?.toLowerCase();
		this.rec$.setValue(field,value);
		let blk:ModelBlock = this.rec$.block;
		let row:Row = blk?.view.displayed(this.rec$);

		if (row != null)
		{
			let fld:Field = row.getField(field);
			if (this.rec$.dirty) row.invalidate();

			if (fld != null)
			{
				fld.setValue(value);
			}
			else
			{
				if (blk.view.row == row.rownum)
				{
					fld = blk.view.getRow(-1)?.getField(field);
					if (fld != null) fld.setValue(value);
				}
			}
		}
	}

	public getStyle(field:string, style:string) : string
	{
		return(this.getProperties(field).getStyle(style));
	}

	public setStyle(field:string, style:string, value:any) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.setStyle(style,value),field);
	}

	public removeStyle(field:string, style:string) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.removeStyle(style),field);
	}

	public hasClass(field:string, clazz:string) : boolean
	{
		return(this.getProperties(field).hasClass(clazz));
	}

	public setClass(field:string, clazz:string) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.setClass(clazz),field);
	}

	public removeClass(field:string, clazz:string) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.removeClass(clazz),field);
	}

	public hasAttribute(field:string, attr:string) : boolean
	{
		return(this.getProperties(field).hasAttribute(attr));
	}

	public getAttribute(field:string, attr:string) : string
	{
		return(this.getProperties(field).getAttribute(attr));
	}

	public setAttribute(field:string, attr:string, value?:any) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.setAttribute(attr,value),field);
	}

	public removeAttribute(field:string, attr:string) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.removeAttribute(attr),field);
	}

	public getProperties(field?:string, clazz?:string) : FieldProperties
	{
		field = field?.toLowerCase();
		let blk:ModelBlock = this.rec$.block;
		return(new FieldProperties(blk.view.getRecordProperties(this.rec$,field,clazz)));
	}

	public setProperties(props:FieldProperties, field:string, clazz?:string) : void
	{
		field = field?.toLowerCase();
		clazz = clazz?.toLowerCase();
		let blk:ModelBlock = this.rec$.block;
		blk.view.setRecordProperties(this.rec$,field,clazz,props);
	}

	public clearProperties(field:string, clazz?:string) : void
	{
		field = field?.toLowerCase();
		clazz = clazz?.toLowerCase();
		let blk:ModelBlock = this.rec$.block;
		blk.view.setRecordProperties(this.rec$,field,clazz,null);
	}

	public toString() : string
	{
		return(this.rec$.toString());
	}
}