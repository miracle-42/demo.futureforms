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

import { Form } from './Form.js';
import { Record } from './Record.js';
import { Status } from '../view/Row.js';
import { Alert } from '../application/Alert.js';
import { ListOfValues } from './ListOfValues.js';
import { DateConstraint } from './DateConstraint.js';
import { KeyMap } from '../control/events/KeyMap.js';
import { Block as ViewBlock } from '../view/Block.js';
import { FieldProperties } from './FieldProperties.js';
import { TriggerFunction } from './TriggerFunction.js';
import { Block as ModelBlock } from '../model/Block.js';
import { EventType } from '../control/events/EventType.js';
import { FormBacking } from '../application/FormBacking.js';
import { FormEvents } from '../control/events/FormEvents.js';
import { FilterStructure } from '../model/FilterStructure.js';
import { DataSource } from '../model/interfaces/DataSource.js';
import { EventFilter } from '../control/events/EventFilter.js';
import { FieldInstance } from '../view/fields/FieldInstance.js';
import { FieldFeatureFactory } from '../view/FieldFeatureFactory.js';
import { Record as ModelRecord, RecordState } from '../model/Record.js';

/**
 * Intersection between datasource and html elements
 *
 * All generic code for a block should be put here, ie
 * 	Lookups
 * 	Triggers
 * 	List of values
 * 	etc
 */
export class Block
{
	private form$:Form = null;
	private name$:string = null;
	private updateallowed$:boolean = true;

	/** Allow Query By Example */
	public qbeallowed:boolean = true;

	/** Can block be queried */
	public queryallowed:boolean = true;

	/** Is insert allowed */
	public insertallowed:boolean = true;

	/** Is delete allowed */
	public deleteallowed:boolean = true;

	/**
	 * @param form : The form to attach to
	 * @param name : The name of the block, used for binding elements
	 */
	constructor(form:Form, name:string)
	{
		this.form$ = form;
		this.name$ = name?.toLowerCase();
		FormBacking.getModelBlock(this,true);
		FormBacking.getBacking(form).blocks.set(this.name$,this);
	}

	public get form() : Form
	{
		return(this.form$);
	}

	public get name() : string
	{
		return(this.name$);
	}

	/** Is update allowed */
	public get updateallowed() : boolean
	{
		return(this.updateallowed$);
	}

	/** Is update allowed */
	public set updateallowed(flag:boolean)
	{
		this.updateallowed$ = flag;
		let blk:ViewBlock = FormBacking.getViewBlock(this);

		if (blk)
		{
			if (flag) blk.enableUpdate();
			else		 blk.disableUpdate();
		}
	}

	/** The dynamic query filters applied to this block */
	public get filter() : FilterStructure
	{
		return(FormBacking.getModelBlock(this).QueryFilter);
	}

	/** Current row number in block */
	public get row() : number
	{
		return(FormBacking.getViewBlock(this).row);
	}

	/** Number of displayed rows in block */
	public get rows() : number
	{
		return(FormBacking.getViewBlock(this).rows);
	}

	/** Set focus on this block */
	public async focus() : Promise<boolean>
	{
		return(FormBacking.getViewBlock(this).focus());
	}

	/** Current record number in block */
	public get record() : number
	{
		return(FormBacking.getModelBlock(this).record);
	}

	/** The state of the current record */
	public get state() : RecordState
	{
		return(this.getRecord()?.state);
	}

	/** Get all field names */
	public get fields() : string[]
	{
		return(FormBacking.getViewBlock(this).getFieldNames());
	}

	/** Flush changes to backend */
	public flush() : void
	{
		FormBacking.getModelBlock(this).flush();
	}

	/** Clear the block. If force, no validation will take place */
	public async clear(force?:boolean) : Promise<boolean>
	{
		return(FormBacking.getModelBlock(this).clear(!force));
	}

	/** Is the block in query mode */
	public queryMode() : boolean
	{
		return(FormBacking.getModelBlock(this).querymode);
	}

	/** Is the block empty */
	public empty() : boolean
	{
		return(FormBacking.getModelBlock(this).empty);
	}

	/** Refresh (re-query) the record @param offset : offset to current record */
	public async refresh(offset?:number) : Promise<void>
	{
		if (offset == null) offset = 0;
		await FormBacking.getModelBlock(this).refresh(offset);
	}

	/** Is field bound to this block */
	public hasField(name:string) : boolean
	{
		return(this.fields.includes(name?.toLowerCase()));
	}

	/** Show the datepicker for the specified field */
	public showDatePicker(field:string, row?:number) : void
	{
		field = field?.toLowerCase();
		FormBacking.getViewForm(this.form).showDatePicker(this.name,field,row);
	}

	/** Show the LOV associated with the field. Normally only 1 LOV can be active, force overrules this rule */
	public showListOfValues(field:string, row?:number) : void
	{
		field = field?.toLowerCase();
		FormBacking.getViewForm(this.form).showListOfValues(this.name,field,row);
	}

	/** Simulate keystroke @param key: the keystroke @param field: send from field @param clazz: narrow in field */
	public async sendkey(key:KeyMap, field?:string, clazz?:string) : Promise<boolean>
	{
		return(this.form.sendkey(key,this.name,field,clazz));
	}

	/** Perform the query details operation */
	public async querydetails(field?:string) : Promise<boolean>
	{
		if (!field) return(FormBacking.getModelBlock(this).queryDetails(true));
		else return(FormBacking.getModelForm(this.form).queryFieldDetails(this.name,field));
	}

	/** Navigate to previous record */
	public async prevrecord() : Promise<boolean>
	{
		return(FormBacking.getViewBlock(this).prevrecord());
	}

	/** Navigate to next record */
	public async nextrecord() : Promise<boolean>
	{
		return(FormBacking.getViewBlock(this).nextrecord());
	}

	/** Navigate to row and optionally field @param row: the to navigate to*/
	public async goRow(row:number) : Promise<boolean>
	{
		return(FormBacking.getViewBlock(this).goRow(row));
	}

	/** Navigate to field @param clazz: narrow in field*/
	public async goField(field:string, clazz?:string) : Promise<boolean>
	{
		return(FormBacking.getViewBlock(this).goField(field,clazz));
	}

	/** Show a message (similar to js alert) */
	public message(msg:string, title?:string) : void
	{
		Alert.message(msg,title);
	}

	/** Show a warning (similar to js alert) */
	public warning(msg:string, title?:string) : void
	{
		Alert.warning(msg,title);
	}

	/** Is this a control block (not bound to a datasource) */
	public isControlBlock() : boolean
	{
		return(FormBacking.getModelBlock(this).ctrlblk);
	}

	/** Get the LOV for the given block and field */
	public getListOfValues(field:string) : ListOfValues
	{
		return(FormBacking.getBacking(this.form).getListOfValues(this.name,field));
	}

	/** Bind LOV to field(s) */
	public setListOfValues(lov:ListOfValues, field:string|string[]) : void
	{
		if (!Array.isArray(field))
			field = [field];

		for (let i = 0; i < field.length; i++)
			FormBacking.getBacking(this.form).setListOfValues(this.name,field[i],lov);
	}

	/** Remove LOV from field(s) */
	public removeListOfValues(field:string|string[]) : void
	{
		if (!Array.isArray(field))
			field = [field];

		for (let i = 0; i < field.length; i++)
			FormBacking.getBacking(this.form).removeListOfValues(this.name,field[i]);
	}

	/** Specify a constraint on possible valid dates */
	public setDateConstraint(constraint:DateConstraint, field:string|string[]) : void
	{
		if (!Array.isArray(field))
			field = [field];

		for (let i = 0; i < field.length; i++)
			FormBacking.getBacking(this.form).setDateConstraint(this.name,field[i],constraint);
	}

	/** Get data from datasource @param header: include column names @param all: fetch all data from datasource */
	public async getSourceData(header?:boolean, all?:boolean) : Promise<any[][]>
	{
		return(FormBacking.getModelBlock(this).copy(all,header));
	}

	/** As getSourceData but copies the data to the clipboard. Requires https */
	public async saveDataToClipBoard(header?:boolean, all?:boolean) : Promise<void>
	{
		let str:string = "";
		let data:string[][] = await this.getSourceData(header,all);

		data.forEach((rec) =>
		{
			let row:string = "";
			rec.forEach((col) => {row += ", "+col})
			str += row.substring(2)+"\n";
		})

		str = str.substring(0,str.length-1);
		navigator.clipboard.writeText(str);
	}

	public get datasource() : DataSource
	{
		return(FormBacking.getModelBlock(this,true).datasource);
	}

	public set datasource(source:DataSource)
	{
		FormBacking.getModelBlock(this,true).datasource = source;
	}

	/** Delete the current record */
	public async delete() : Promise<boolean>
	{
		return(FormBacking.getModelBlock(this)?.delete());
	}

	/** Insert a blank record @param before: Insert above the current row */
	public async insert(before?:boolean) : Promise<boolean>
	{
		return(FormBacking.getModelBlock(this)?.insert(before));
	}

	public getValue(field:string) : any
	{
		return(this.getRecord()?.getValue(field));
	}

	public setValue(field:string, value:any) : void
	{
		this.getRecord()?.setValue(field,value);
	}

	/** Is the block in a valid state */
	public isValid(field:string) : boolean
	{
		return(FormBacking.getViewBlock(this).isValid(field));
	}

	/** Mark the field valid */
	public setValid(field:string, flag:boolean) : void
	{
		FormBacking.getViewBlock(this).setValid(field,flag);
	}

	public getCurrentField() : string
	{
		return(FormBacking.getViewBlock(this).current.name);
	}

	/** Is block synchronized with backend */
	public hasPendingChanges() : boolean
	{
		return(FormBacking.getModelBlock(this).getPendingCount() > 0);
	}

	/** Show the last query for this block */
	public showLastQuery() : void
	{
		FormBacking.getModelBlock(this).showLastQuery();
	}

	/** setAndValidate field value as if changed by a user (fire all events) */
	public async setAndValidate(field:string, value:any) : Promise<boolean>
	{
		return(this.getRecord().setAndValidate(field,value));
	}

	/** Lock current record */
	public async lock() : Promise<void>
	{
		this.getRecord().lock();
	}

	/** Mark the current record as dirty */
	public setDirty(field?:string) : void
	{
		this.getRecord().setDirty(field);
	}

	public getRecord(offset?:number) : Record
	{
		let intrec:ModelRecord = null;
		if (offset == null) offset = 0;

		let block:ModelBlock = FormBacking.getModelBlock(this);

		if (!FormBacking.getModelForm(this.form).hasEventTransaction(block))
		{
			intrec = block.getRecord(offset);
		}
		else
		{
			if (offset != 0)
			{
				let running:EventType = FormBacking.getModelForm(this.form).eventTransaction.getEvent(block);
				Alert.fatal("During transaction "+EventType[running]+" only current record can be accessed","Transaction Violation");
				return(null);
			}

			intrec = FormBacking.getModelForm(this.form).eventTransaction.getRecord(block);
		}

		return(intrec == null ? null : new Record(intrec));
	}

	/** Rehash the fields. Typically after dynamic insert/delete of HTML elements */
	public reIndexFieldOrder() : void
	{
		FormBacking.getViewForm(this.form).rehash(this.name);
	}

	/** Get properties used in Query By Example mode */
	public getQBEProperties(field:string) : FieldProperties
	{
		field = field?.toLowerCase();
		let inst:FieldInstance[] = FormBacking.getViewBlock(this).getFields(field);
		if (inst.length > 0) return(new FieldProperties(inst[0].qbeProperties));
		return(null);
	}

	/** Get properties used in insert mode */
	public getInsertProperties(field:string) : FieldProperties
	{
		field = field?.toLowerCase();
		let inst:FieldInstance[] = FormBacking.getViewBlock(this).getFields(field);
		if (inst.length > 0) return(new FieldProperties(inst[0].insertProperties));
		return(null);
	}

	/** Get properties used in display mode */
	public getDefaultProperties(field:string) : FieldProperties
	{
		field = field?.toLowerCase();
		let inst:FieldInstance[] = FormBacking.getViewBlock(this).getFields(field);
		if (inst.length > 0) return(new FieldProperties(inst[0].updateProperties));
		return(null);
	}

	/** As in getQBEProperties, but narrow down on the field id */
	public getQBEPropertiesById(field:string, id:string) : FieldProperties
	{
		id = id?.toLowerCase();
		field = field?.toLowerCase();
		let inst:FieldInstance = FormBacking.getViewBlock(this).getFieldById(field,id);
		if (inst != null) return(new FieldProperties(inst.qbeProperties));
		return(null);
	}

	/** As in getInsertProperties, but narrow down on the field id */
	public getInsertPropertiesById(field:string, id:string) : FieldProperties
	{
		id = id?.toLowerCase();
		field = field?.toLowerCase();
		let inst:FieldInstance = FormBacking.getViewBlock(this).getFieldById(field,id);
		if (inst != null) return(new FieldProperties(inst.insertProperties));
		return(null);
	}

	/** As in getDefaultProperties, but narrow down on the field id */
	public getDefaultPropertiesById(field:string, id:string) : FieldProperties
	{
		id = id?.toLowerCase();
		field = field?.toLowerCase();
		let inst:FieldInstance = FormBacking.getViewBlock(this).getFieldById(field,id);
		if (inst != null) return(new FieldProperties(inst.updateProperties));
		return(null);
	}

	/** As in getQBEProperties, but narrow down on a given class */
	public getQBEPropertiesByClass(field:string, clazz?:string) : FieldProperties
	{
		let props:FieldProperties[] = this.getAllQBEPropertiesByClass(field,clazz);
		return(props.length == 0 ? null : props[0])
	}

	/** As in getInsertProperties, but narrow down a given class */
	public getInsertPropertiesByClass(field:string, clazz?:string) : FieldProperties
	{
		let props:FieldProperties[] = this.getAllInsertPropertiesByClass(field,clazz);
		return(props.length == 0 ? null : props[0])
	}

	/** As in getDefaultProperties, but narrow down a given class */
	public getDefaultPropertiesByClass(field:string, clazz?:string) : FieldProperties
	{
		let props:FieldProperties[] = this.getAllDefaultPropertiesByClass(field,clazz);
		return(props.length == 0 ? null : props[0])
	}

	/** Get properties for all fields in Query By Example mode */
	public getAllQBEPropertiesByClass(field:string, clazz?:string) : FieldProperties[]
	{
		clazz = clazz?.toLowerCase();
		field = field?.toLowerCase();
		let props:FieldProperties[] = [];
		FormBacking.getViewBlock(this).getInstancesByClass(field,clazz).
		forEach((inst) => {props.push(new FieldProperties(inst.qbeProperties))})
		return(props);
	}

	/** Get properties for all fields in insert mode */
	public getAllInsertPropertiesByClass(field:string, clazz?:string) : FieldProperties[]
	{
		clazz = clazz?.toLowerCase();
		field = field?.toLowerCase();
		let props:FieldProperties[] = [];
		FormBacking.getViewBlock(this).getInstancesByClass(field,clazz).
		forEach((inst) => {props.push(new FieldProperties(inst.insertProperties))})
		return(props);
	}

	/** Get properties for all fields in display mode */
	public getAllDefaultPropertiesByClass(field:string, clazz?:string) : FieldProperties[]
	{
		clazz = clazz?.toLowerCase();
		field = field?.toLowerCase();
		let props:FieldProperties[] = [];
		FormBacking.getViewBlock(this).getInstancesByClass(field,clazz).
		forEach((inst) => {props.push(new FieldProperties(inst.updateProperties))})
		return(props);
	}

	/** Apply Query By Example properties to field @param clazz: narrow down on class */
	public setQBEProperties(props:FieldProperties, field:string, clazz?:string) : void
	{
		field = field?.toLowerCase();
		clazz = clazz?.toLowerCase();
		FormBacking.getViewBlock(this).getInstancesByClass(field,clazz).
		forEach((inst) => {FieldFeatureFactory.replace(props,inst,Status.qbe);})
	}

	/** Apply insert properties to field @param clazz: narrow down on class */
	public setInsertProperties(props:FieldProperties, field:string, clazz?:string) : void
	{
		field = field?.toLowerCase();
		clazz = clazz?.toLowerCase();
		FormBacking.getViewBlock(this).getInstancesByClass(field,clazz).
		forEach((inst) => {FieldFeatureFactory.replace(props,inst,Status.insert);})
	}

	/** Apply display properties to field @param clazz: narrow down on class */
	public setDefaultProperties(props:FieldProperties, field:string, clazz?:string) : void
	{
		field = field?.toLowerCase();
		clazz = clazz?.toLowerCase();
		FormBacking.getViewBlock(this).getInstancesByClass(field,clazz).
		forEach((inst) => {FieldFeatureFactory.replace(props,inst,Status.update);})
	}

	/** Apply Query By Example properties to field @param clazz: narrow down on id */
	public setQBEPropertiesById(props:FieldProperties, field:string, id:string) : void
	{
		id = id?.toLowerCase();
		field = field?.toLowerCase();
		let inst:FieldInstance = FormBacking.getViewBlock(this).getFieldById(field,id);
		FieldFeatureFactory.replace(props,inst,Status.qbe);
	}

	/** Apply insert properties to field @param clazz: narrow down on id */
	public setInsertPropertiesById(props:FieldProperties, field:string, id:string) : void
	{
		id = id?.toLowerCase();
		field = field?.toLowerCase();
		let inst:FieldInstance = FormBacking.getViewBlock(this).getFieldById(field,id);
		FieldFeatureFactory.replace(props,inst,Status.insert);
	}

	/** Apply display properties to field @param clazz: narrow down on id */
	public setDefaultPropertiesById(props:FieldProperties, field:string, id:string) : void
	{
		id = id?.toLowerCase();
		field = field?.toLowerCase();
		let inst:FieldInstance = FormBacking.getViewBlock(this).getFieldById(field,id);
		FieldFeatureFactory.replace(props,inst,Status.update);
	}

	/** Re query the block with current filters */
	public async reQuery() : Promise<boolean>
	{
		return(FormBacking.getModelForm(this.form).executeQuery(this.name,true,true));
	}

	/** Escape Query By Example mode */
	public cancelQueryMode() : void
	{
		FormBacking.getModelForm(this.form).cancelQueryMode(this.name);
	}

	/** Enter Query By Example mode */
	public async enterQueryMode() : Promise<boolean>
	{
		return(FormBacking.getModelForm(this.form).enterQuery(this.name));
	}

	/** Execute query on block */
	public async executeQuery() : Promise<boolean>
	{
		return(FormBacking.getModelForm(this.form).executeQuery(this.name,false,true));
	}

	/** Remove event listener @param handle: the handle returned when applying the event listener */
	public removeEventListener(handle:object) : void
	{
		FormEvents.removeListener(handle);
	}

	/** Apply event listener @param filter: filter on the event */
	public addEventListener(method:TriggerFunction, filter?:EventFilter|EventFilter[]) : object
	{
		if (!filter) filter = {} as EventFilter;
		(filter as EventFilter).block = this.name;
		return(FormEvents.addListener(this.form,this,method,filter));
	}

	/** Dump the fetched records to the console */
	public dump() : void
	{
		FormBacking.getModelBlock(this).wrapper.dump();
	}
}