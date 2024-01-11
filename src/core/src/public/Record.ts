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

/**
 * Public interface to a Record.
 *
 * A Record is a collection of name,value pairs
 *	and represents data from a backend.
 *
 */
export class Record
{
	private rec$:Internal = null;

	constructor(rec:Internal)
	{
		this.rec$ = rec;
	}

	/** The record number */
	public get recno() : number
	{
		return(this.rec$.wrapper.index(this.rec$));
	}

	/** State of record */
	public get state() : RecordState
	{
		return(this.rec$.state);
	}

	/** Is record in an inserted state */
	public get inserted() : boolean
	{
		return(this.rec$.inserted);
	}

	/** Is record in an updated state */
	public get updated() : boolean
	{
		return(this.rec$.updated);
	}

	/** Is record in an deleted state */
	public get deleted() : boolean
	{
		return(this.rec$.deleted);
	}

	/** Has the record been synchronized with the backend */
	public get synchronized() : boolean
	{
		return(this.rec$.synched);
	}

	/** Get the response from the last operation on the backend */
	public get response() : any
	{
		return(this.rec$.response);
	}

	/** Get the value of a given field */
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

	/** Execute datasource default lock method */
	public async lock() : Promise<boolean>
	{
		return(this.rec$.wrapper?.lock(this.rec$,true));
	}

	/** Mark the record as locked */
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

  /**
	* Change the tag input, span, div ... for the given field
	* @param field
	* @param tag
	*/
	public setTag(field:string, tag:string) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.setTag(tag),field);
		else console.error("field '"+field+"' was not found in record");
	}

	/** Set readonly state for a given field */
	public setReadOnly(field:string, flag:boolean) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.setReadOnly(flag),field);
		else console.error("field '"+field+"' was not found in record");
	}

	/** Set required state for a given field */
	public setRequired(field:string, flag:boolean) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.setRequired(flag),field);
		else console.error("field '"+field+"' was not found in record");
	}

	/** Set enabled state for a given field */
	public setEnabled(field:string, flag:boolean) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.setEnabled(flag),field);
		else console.error("field '"+field+"' was not found in record");
	}

	/** Set disabled state for a given field */
	public setDisabled(field:string, flag:boolean) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.setEnabled(!flag),field);
		else console.error("field '"+field+"' was not found in record");
	}

	/** Get the style for a given field and type */
	public getStyle(field:string, style:string) : string
	{
		return(this.getProperties(field).getStyle(style));
	}

	/** Set a style for a given field */
	public setStyle(field:string, style:string, value:any) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.setStyle(style,value),field);
		else console.error("field '"+field+"' was not found in record");
	}

	/** Remove a style for a given field */
	public removeStyle(field:string, style:string) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.removeStyle(style),field);
		else console.error("field '"+field+"' was not found in record");
	}

	/** Check if a given field has class */
	public hasClass(field:string, clazz:string) : boolean
	{
		return(this.getProperties(field).hasClass(clazz));
	}

	/** Set a class on a given field */
	public setClass(field:string, clazz:string) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.setClass(clazz),field);
		else console.error("field '"+field+"' was not found in record");
	}

	/** Remove a class on a given field */
	public removeClass(field:string, clazz:string) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.removeClass(clazz),field);
		else console.error("field '"+field+"' was not found in record");
	}

	/** Check if a given field has attribute */
	public hasAttribute(field:string, attr:string) : boolean
	{
		return(this.getProperties(field).hasAttribute(attr));
	}

	/** Get the value of a given field and attribute */
	public getAttribute(field:string, attr:string) : string
	{
		return(this.getProperties(field).getAttribute(attr));
	}

	/** Set an attribute on a given field */
	public setAttribute(field:string, attr:string, value?:any) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.setAttribute(attr,value),field);
		else console.error("field '"+field+"' was not found in record");
	}

	/** Remove an attribute on a given field */
	public removeAttribute(field:string, attr:string) : void
	{
		let props:FieldProperties = this.getProperties(field);
		if (props) this.setProperties(props.removeAttribute(attr),field);
		else console.error("field '"+field+"' was not found in record");
	}

	/** Get a copy of all properties for a given field */
	public getProperties(field:string, clazz?:string) : FieldProperties
	{
		if (!field) return(null);
		field = field.toLowerCase();
		let blk:ModelBlock = this.rec$.block;
		return(new FieldProperties(blk.view.getRecordProperties(this.rec$,field,clazz)));
	}

	/** Apply properties on a given field. Properties will be cloned */
	public setProperties(props:FieldProperties, field:string, clazz?:string) : void
	{
		field = field?.toLowerCase();
		clazz = clazz?.toLowerCase();
		let blk:ModelBlock = this.rec$.block;
		blk.view.setRecordProperties(this.rec$,field,clazz,props);
	}

	/** Clear all custom properties for the given record, field and class */
	public clearProperties(field?:string, clazz?:string) : void
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