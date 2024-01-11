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

import { Form } from "./Form.js";
import { Row } from "../view/Row.js";
import { Filters } from "./filters/Filters.js";
import { Filter } from "./interfaces/Filter.js";
import { SQLRest } from "../database/SQLRest.js";
import { MSGGRP } from "../messages/Internal.js";
import { SubQuery } from "./filters/SubQuery.js";
import { Record, RecordState } from "./Record.js";
import { Relation } from "./relations/Relation.js";
import { Messages } from "../messages/Messages.js";
import { SQLSource } from "../database/SQLSource.js";
import { QueryByExample } from "./QueryByExample.js";
import { Block as ViewBlock } from '../view/Block.js';
import { FilterStructure } from "./FilterStructure.js";
import { DataSource } from "./interfaces/DataSource.js";
import { Form as InterfaceForm } from '../public/Form.js';
import { MemoryTable } from "./datasources/MemoryTable.js";
import { DataSourceWrapper } from "./DataSourceWrapper.js";
import { EventType } from "../control/events/EventType.js";
import { QueryManager } from "./relations/QueryManager.js";
import { FormBacking } from "../application/FormBacking.js";
import { Block as InterfaceBlock } from '../public/Block.js';
import { DatabaseTable } from "../database/DatabaseTable.js";
import { FieldInstance } from "../view/fields/FieldInstance.js";
import { FlightRecorder } from "../application/FlightRecorder.js";
import { FormEvents, FormEvent } from "../control/events/FormEvents.js";


export class Block
{
	private form$:Form = null;
	private name$:string = null;
	private record$:number = -1;
	private view$:ViewBlock = null;
	private queried$:boolean = false;
	private ctrlblk$:boolean = false;
	private source$:DataSource = null;
	private pubfrm$:InterfaceForm = null;
	private pubblk$:InterfaceBlock = null;
	private qbe:QueryByExample = new QueryByExample(this);
	private filter:FilterStructure = new FilterStructure();

	constructor(form:Form, name:string)
	{
		this.name$ = name;
		this.form$ = form;
		this.form.addBlock(this);
		this.pubfrm$ = form.parent;

		this.filter.name = this.name;
		this.filter.and(this.qbe.filters,"qbe");
		this.filter.and(new FilterStructure(),"masters");
		this.filter.and(new FilterStructure(),"details");

		this.datasource = form.datamodel.getDataSource(this.name);
	}

	public get name() : string
	{
		return(this.name$);
	}

	public get form() : Form
	{
		return(this.form$);
	}

	public get pubblk()
	{
		return(this.pubblk$);
	}

	public get empty() : boolean
	{
		return(this.record$ < 0);
	}

	public get view() : ViewBlock
	{
		return(this.view$);
	}

	public get ctrlblk() : boolean
	{
		return(this.ctrlblk$);
	}

	public get queried() : boolean
	{
		return(this.queried$);
	}

	public set queried(flag:boolean)
	{
		this.queried$ = flag;
	}

	public get qberec() : Record
	{
		return(this.qbe.record);
	}

	public get querymode() : boolean
	{
		return(this.qbe.querymode);
	}

	public set querymode(flag:boolean)
	{
		this.qbe.querymode = flag;
	}

	public set ctrlblk(flag:boolean)
	{
		this.ctrlblk$ = flag;
	}

	public get qbeallowed() : boolean
	{
		return(this.pubblk$.qbeallowed);
	}

	public get queryallowed() : boolean
	{
		if (!this.source$.queryallowed) return(false);
		else return(this.pubblk$.queryallowed);
	}

	public get insertallowed() : boolean
	{
		if (!this.source$.insertallowed) return(false);
		return(this.pubblk$.insertallowed);
	}

	public get updateallowed() : boolean
	{
		if (!this.source$.updateallowed) return(false);
		return(this.pubblk$.updateallowed);
	}

	public get deleteallowed() : boolean
	{
		if (!this.source$.deleteallowed) return(false);
		return(this.pubblk$.deleteallowed);
	}

	public set dirty(flag:boolean)
	{
		this.wrapper.dirty = flag;
	}

	public get dirty() : boolean
	{
		return(this.wrapper?.dirty);
	}

	public async clear(flush:boolean) : Promise<boolean>
	{
		this.queried = false;

		if (this.ctrlblk)
		{
			for (let i = 0; i < this.wrapper.getRecords(); i++)
				this.wrapper.getRecord(i).clear();
		}
		else
		{
			if (!await this.wrapper.clear(flush))
				return(false);
		}

		this.form.clearBlock(this);
		return(true);
	}

	public hasEventTransaction() : boolean
	{
		return(this.form.hasEventTransaction(this));
	}

	public async checkEventTransaction(event:EventType) : Promise<boolean>
	{
		return(this.form.checkEventTransaction(event,this));
	}

	public async setEventTransaction(event:EventType, record:Record) : Promise<boolean>
	{
		return(this.form.setEventTransaction(event,this,record));
	}

	public endEventTransaction(event:EventType, success:boolean) : void
	{
		this.form.endEventTransaction(event,this,success);
	}

	public get datasource() : DataSource
	{
		return(this.source$);
	}

	public set datasource(source:DataSource)
	{
		if (this.source$ != null)
		{
			this.form$.datamodel.clear(this,true);
			this.form$.datamodel.setWrapper(this);
			this.view.clear(true,true,true);
		}

		this.source$ = source;
		this.ctrlblk = (source == null);
		if (this.source$) this.source$.name = this.name;

		this.addColumns();
	}

	public reset(source:boolean) : void
	{
		if (source)
		{
			this.source$ = null;
			this.ctrlblk = true;
		}

		this.view.reset();
	}

	public addColumns(fields?:string[]) : void
	{
		if (this.view == null)
			return;

		if (this.source$ == null)
			return;

		if (fields == null)
			fields = [];

		this.view.fieldinfo.forEach((info,field) =>
		{if (!info.derived) fields.push(field);});

		if (fields.length > 0)
			this.source$.addColumns(fields);
	}

	public createMemorySource(recs?:number, columns?:string[]) : MemoryTable
	{
		let data:any[][] = [];

		if (recs == null)
		{
			recs = this.view$.rows;
			columns = this.view$.getFieldNames();
		}

		for (let r = 0; r < recs; r++)
		{
			let row:any[] = [];

			for (let c = 0; c < columns.length; c++)
				row.push(null);

			data.push(row);
		}

		return(new MemoryTable(columns,data));
	}

	public get wrapper() : DataSourceWrapper
	{
		if (this.querymode) return(this.qbe.wrapper);
		return(this.form.datamodel.getWrapper(this));
	}

	public async preInsert(record:Record) : Promise<boolean>
	{
		if (this.ctrlblk) return(true);
		if (!await this.setEventTransaction(EventType.PreInsert,record)) return(false);
		let success:boolean = await this.fire(EventType.PreInsert);
		this.endEventTransaction(EventType.PreInsert,success);
		return(success);
	}

	public async postInsert(record:Record) : Promise<boolean>
	{
		if (this.ctrlblk) return(true);
		if (!await this.setEventTransaction(EventType.PostInsert,record)) return(false);
		let success:boolean = await this.fire(EventType.PostInsert);
		this.endEventTransaction(EventType.PostInsert,success);
		return(success);
	}

	public async preUpdate(record:Record) : Promise<boolean>
	{
		if (this.ctrlblk) return(true);
		if (!await this.setEventTransaction(EventType.PreUpdate,record)) return(false);
		let success:boolean = await this.fire(EventType.PreUpdate);
		this.endEventTransaction(EventType.PreUpdate,success);
		return(success);
	}

	public async postUpdate(record:Record) : Promise<boolean>
	{
		if (this.ctrlblk) return(true);
		if (!await this.setEventTransaction(EventType.PostUpdate,record)) return(false);
		let success:boolean = await this.fire(EventType.PostUpdate);
		this.endEventTransaction(EventType.PostUpdate,success);
		return(success);
	}

	public async preDelete(record:Record) : Promise<boolean>
	{
		if (this.ctrlblk) return(true);
		if (record.state == RecordState.New) return(true);
		if (!await this.setEventTransaction(EventType.PreDelete,record)) return(false);
		let success:boolean = await this.fire(EventType.PreDelete);
		this.endEventTransaction(EventType.PreDelete,success);
		return(success);
	}

	public async postDelete(record:Record) : Promise<boolean>
	{
		if (this.ctrlblk) return(true);
		if (!await this.setEventTransaction(EventType.PostDelete,record)) return(false);
		let success:boolean = await this.fire(EventType.PostDelete);
		this.endEventTransaction(EventType.PostDelete,success);
		return(success);
	}

	public async preQuery() : Promise<boolean>
	{
		if (this.ctrlblk) return(true);
		if (!await this.setEventTransaction(EventType.PreQuery,this.qberec)) return(false);
		let success:boolean = await this.fire(EventType.PreQuery);
		this.endEventTransaction(EventType.PreQuery,success);
		return(success);
	}

	public async onFetch(record:Record) : Promise<boolean>
	{
		if (this.ctrlblk) return(true);
		if (!await this.setEventTransaction(EventType.OnFetch,record)) return(false);
		let success:boolean = await this.fire(EventType.OnFetch);
		this.endEventTransaction(EventType.OnFetch,success);
		return(success);
	}

	public async postQuery() : Promise<boolean>
	{
		if (this.ctrlblk) return(true);
		if (!await this.checkEventTransaction(EventType.PostQuery)) return(false);
		let success:boolean = await this.fire(EventType.PostQuery);
		return(success);
	}

	public async validateField(record:Record, field:string) : Promise<boolean>
	{
		if (record == null)
			return(true);

		if (!await this.view.validateDate(field,record.getValue(field)))
			return(false);

		if (!await this.setEventTransaction(EventType.WhenValidateField,record)) return(false);
		let success:boolean = await this.fire(EventType.WhenValidateField,field);
		this.endEventTransaction(EventType.WhenValidateField,success);

		if (success)
		{
			if (this.querymode) this.setFilter(field);
			else success = await this.form.queryFieldDetails(this.name,field);
		}

		if (success)
			success = await this.fire(EventType.PostChange,field);

		return(success);
	}

	public async validateRecord() : Promise<boolean>
	{
		let record:Record = this.getRecord();
		let row:Row = this.view.displayed(record);

		if (!record || !row)
			return(true);

		if (row.validated)
			return(true);

		if (!await this.setEventTransaction(EventType.WhenValidateRecord,record)) return(false);
		let success:boolean = await this.fire(EventType.WhenValidateRecord);
		this.endEventTransaction(EventType.WhenValidateRecord,success);

		if (success)
			success = await this.wrapper.modified(record,false);

		if (success)
			row.validated = true;

		return(success);
	}

	public rewind() : void
	{
		this.record = -1;
	}

	public move(delta:number) : number
	{
		this.record = this.record + delta;
		return(this.record$);
	}

	public get record() : number
	{
		if (this.record$ < 0) return(0);
		else				  		 return(this.record$);
	}

	public set record(record:number)
	{
		this.record$ = record;
	}

	public get interface() : InterfaceBlock
	{
		return(this.pubblk$);
	}

	public getValue(field:string) : any
	{
		return(this.wrapper.getValue(this.record,field));
	}

	public setValue(field:string, value:any) : boolean
	{
		return(this.wrapper.setValue(this.record,field,value));
	}

	public locked(record?:Record) : boolean
	{
		if (this.querymode) return(true);
		if (record == null) record = this.getRecord(0);
		return(this.wrapper.locked(record));
	}

	public async lock(record?:Record) : Promise<boolean>
	{
		if (this.querymode) return(true);
		if (record == null) record = this.getRecord(0);
		return(this.wrapper.lock(record,false));
	}

	public async refresh(offset:number, reset:boolean) : Promise<void>
	{
		if (this.querymode) return;

		let record:Record = this.getRecord(offset);
		this.view.setRecordProperties(record);

		await this.wrapper.refresh(record);
		if (reset) record.failed = false;

		this.view.refresh(record);
	}

	public async insert(before?:boolean) : Promise<boolean>
	{
		if (before == null)
			before = false;

		if (this.querymode)
			return(false);

		if (!this.view.hasInsertableFields())
		{
			Messages.warn(MSGGRP.BLOCK,1,this.name); // No insertable fields
			return(false);
		}

		if (!await this.view.validate())
			return(false);

		if (!this.checkEventTransaction(EventType.PreInsert))
			return(false);

		let record:Record = this.wrapper.create(this.record,before);
		if (!record) return(false);

		if (!await this.form.view.onCreateRecord(this.view,record))
		{
			await this.wrapper.delete(record);
			return(false);
		}

		if (record != null)
		{
			let offset:number = 0;
			let noex:boolean = this.view.empty();
			let inst:FieldInstance = this.view.form.current;
			let init:boolean = inst?.field.block.model == this;
			let last:boolean = this.view.row == this.view.rows-1;

			if (noex)
			{
				before = true;
				this.view.openrow();
			}
			else
			{
				if (last && !before)
					offset = 1;

				if (init && !await this.form.view.leaveField(null,offset))
				{
					await this.wrapper.delete(record);
					return(false);
				}

				if (init && !await this.form.view.leaveRecord(this.view,offset))
				{
					await this.wrapper.delete(record);
					return(false);
				}
			}

			this.scroll(offset,this.view.row);
			await this.view.refresh(record);
			inst = this.view.findFirstEditable(record);

			if (inst == null)
			{
				// Cannot navigate to record
				await this.wrapper.delete(record);
				Messages.warn(MSGGRP.BLOCK,2,this.name);
				return(false);
			}

			let details:Block[] = this.getAllDetailBlocks(true);

			for (let i = 0; i < details.length; i++)
			{
				if (details[i]!= this)
					await details[i].clear(true);
			}

			this.view.current = inst;
			this.view.form.blur(true);

			if (!before && !last)
			{
				this.move(1);
				this.view.move(1);
			}

			if (!await this.form.view.enterRecord(this.view,0))
			{
				await this.wrapper.delete(record);
				return(false);
			}

			if (!await this.form.view.enterField(inst,0,true))
			{
				await this.wrapper.delete(record);
				return(false);
			}

			if (!await this.form.view.onRecord(this.view))
			{
				await this.wrapper.delete(record);
				return(false);
			}

			inst.focus(true);
			this.dirty = true;
			this.view.refresh(record);
			this.view.getRow(inst.row).activateIndicators(true);

			return(true);
		}

		return(false);
	}

	public async delete() : Promise<boolean>
	{
		if (this.querymode)
			return(false);

		if (this.getRecord().state != RecordState.New && this.getRecord().state != RecordState.Insert)
		{
			if (!this.source$.deleteallowed)
				return(false);

			if (!this.checkEventTransaction(EventType.PreDelete))
				return(false);
		}

		let inst:FieldInstance = this.view.form.current;

		let empty:boolean = false;
		let offset:number = this.view.rows - this.view.row - 1;

		let success:boolean = await this.wrapper.modified(this.getRecord(),true);

		if (success)
		{
			this.view.skip();

			await this.prefetch(1,offset-1);
			empty = this.wrapper.getRecords() <= this.record;

			if (empty)
			{
				this.move(-1);
				this.view.move(-1);
			}

			this.scroll(0,this.view.row);
			await this.view.refresh(this.getRecord());

			if (!empty) this.view.current = inst;
			else inst = this.view.getPreviousInstance(inst);

			this.view.getRow(this.view.row).validated = true;

			inst?.focus(true);
			this.view.getRow(inst.row).activateIndicators(true);

			if (this.getRecord() != null)
			{
				if (!await this.form.view.enterRecord(this.view,0))
				{
					inst?.blur();
					return(false);
				}

				if (!await this.form.view.enterField(inst,0,true))
				{
					inst?.blur();
					return(false);
				}

				if (!await this.form.view.onRecord(this.view))
				{
					inst?.blur();
					return(false);
				}
			}
		}
		else
		{
			await this.view.refresh(this.getRecord());
		}

		return(true);
	}

	public getDirtyCount() : number
	{
		return(this.wrapper.getDirtyCount());
	}

	public getPendingCount() : number
	{
		return(this.wrapper.getPendingCount());
	}

	public async undo(requery:boolean) : Promise<boolean>
	{
		if (this.ctrlblk)
			return(true);

		if (this.qbe.querymode)
		{
			this.form.cancelQueryMode(this);
			return(true);
		}

		let undo:Record[] = await this.wrapper?.undo();

		if (requery)
		{
			for (let i = 0; i < undo.length; i++)
				this.view.refresh(undo[i]);
		}

		this.view.validated = true;
		return(true);
	}

	public async flush() : Promise<boolean>
	{
		if (this.ctrlblk)
			return(true);

		if (this.qbe.querymode)
			return(true);

		let succces:boolean = await this.validateRecord();
		if (succces) return(this.wrapper?.flush());

		return(false);
	}

	public setFilter(field:string, filter?:Filter|FilterStructure) : void
	{
		let qryfld:boolean = this.view.fieldinfo.get(field)?.query;
		if (qryfld == null) qryfld = this.source$?.columns.includes(field);
		if (qryfld)	this.qbe.setFilter(field,filter);
	}

	public cancel() : void
	{
		this.qbe.querymode = false;
	}

	public async enterQuery() : Promise<boolean>
	{
		this.queried$ = false;
		this.view.current = null;

		if (!await this.wrapper.clear(true))
			return(false);

		this.record = 0;

		this.qbe.clear();
		this.qbe.querymode = true;
		this.view.clear(true,true);
		this.view.display(0,this.qberec);

		this.view.lockUnused();
		this.view.setCurrentRow(0,true);

		return(true);
	}

	public async executeQuery(qryid:object) : Promise<boolean>
	{
		this.queried = true;
		let runid:object = null;
		this.view.current = null;

		if (!this.setMasterDependencies())
		{
			this.form.clearBlock(this);
			return(false);
		}

		if (qryid == null)
			qryid = this.form.QueryManager.startNewChain();

		// Abort query if obsolete
		if (qryid != this.form.QueryManager.getQueryID())
			return(true);

		let waits:number = 0;
		// Wait for stale query to finish displaying rows
		runid = this.form.QueryManager.getRunning(this);

		while(runid)
		{
			waits++;
			await QueryManager.sleep(10);

			// Abort query if obsolete
			if (qryid != this.form.QueryManager.getQueryID())
			{
				//console.log("Stale query for '"+this.name+"' aborted");
				return(true);
			}

			runid = this.form.QueryManager.getRunning(this);

			if (runid && waits > 1000)
			{
				waits = 0; // Waiting on previous query
				Messages.warn(MSGGRP.BLOCK,3,this.name);
			}
		}

		this.form.QueryManager.setRunning(this,qryid);

		this.view.clear(true,true);
		this.qbe.querymode = false;
		let wrapper:DataSourceWrapper = this.wrapper;

		FlightRecorder.debug("@model.block: execute query "+this.name+" filter: "+this.filter.toString());

		this.record = -1;
		let record:Record = null;

		if (!await wrapper.query(this.filter))
		{
			this.form.QueryManager.setRunning(this,null);
			return(false);
		}

		while(!this.view.empty(0))
		{
			// Datasource is lacking
			Messages.severe(MSGGRP.BLOCK,4,this.name);
			return(false);
		}

		let found:boolean = false;
		for (let i = 0; i < this.view.rows; i++)
		{
			record = await wrapper.fetch();

			if (record == null)
				break;

			found = true;
			this.record = 0;
			this.view.display(i,record);
		}

		if (found)
		{
			await this.view$.setCurrentRow(0,false);
		}
		else
		{
			let blocks:Block[] = this.getAllDetailBlocks(true);
			blocks.forEach((det) => {det.view.clear(true,true,true)})
		}

		this.form.QueryManager.setRunning(this,null);

		this.view.lockUnused();
		return(true);
	}

	public showLastQuery() : void
	{
		if (this.querymode)
		{
			this.qbe.showLastQuery();
			this.view.clear(true,true);
			this.view.display(0,this.qberec);
			this.view$.setCurrentRow(0,false);
		}
	}

	public scroll(records:number, offset:number) : number
	{
		if (this.querymode)
			return(0);

		let displayed:number = 0;
		this.view.clear(false,false);

		let wrapper:DataSourceWrapper = this.wrapper;
		let pos:number = this.record + records - offset;

		if (pos < 0)
		{
			pos = 0;
			records = offset - this.record;
		}

		for (let i = 0; i < this.view.rows; i++)
		{
			let rec:Record = wrapper.getRecord(pos++);

			if (rec == null)
				break;

			displayed++;
			this.view$.display(i,rec);
		}

		if (offset >= displayed)
			records = records - offset + displayed - 1;

		this.move(records);

		this.view.lockUnused();
		return(records);
	}

	public getQueryMaster() : Block
	{
		return(this.form.QueryManager.qmaster$);
	}

	public get QueryFilter() : FilterStructure
	{
		return(this.qbe.filters);
	}

	public get MasterFilter() : FilterStructure
	{
		return(this.filter.getFilterStructure("masters"));
	}

	public get DetailFilter() : FilterStructure
	{
		return(this.filter.getFilterStructure("details"));
	}

	public getDetailBlockFilter(block:Block, create?:boolean) : FilterStructure
	{
		let flt:FilterStructure = this.DetailFilter.getFilterStructure(block.name);

		if (flt == null && create)
		{
			flt = new FilterStructure();
			this.DetailFilter.and(flt,block.name);
		}

		return(flt);
	}

	public getMasterBlockFilter(block:Block, create?:boolean) : FilterStructure
	{
		let flt:FilterStructure = this.MasterFilter.getFilterStructure(block.name);

		if (flt == null && create)
		{
			flt = new FilterStructure();
			this.MasterFilter.and(flt,block.name);
		}

		return(flt);
	}

	public getMasterBlock(link:Relation) : Block
	{
		return(this.form.BlockCoordinator.getMasterBlock(link));
	}

	public getMasterBlocks() : Block[]
	{
		if (!this.form) return([]);
		return(this.form.BlockCoordinator.getMasterBlocks(this));
	}

	public getMasterLinks() : Relation[]
	{
		return(this.form.BlockCoordinator.getMasterLinks(this));
	}

	public getDetailBlock(link:Relation) : Block
	{
		return(this.form.BlockCoordinator.getDetailBlock(link));
	}

	public getDetailBlocks(all:boolean) : Block[]
	{
		return(this.form.BlockCoordinator.getDetailBlocks(this,all));
	}

	public findMasterRelation(master:Block) : Relation
	{
		return(this.form.BlockCoordinator.findRelation(master,this));
	}

	public getDetailLinks() : Relation[]
	{
		return(this.form.BlockCoordinator.getDetailLinks(this));
	}

	public getAllDetailBlocks(all:boolean) : Block[]
	{
		let blocks:Block[] = [];
		let details:Block[] = this.getDetailBlocks(all);

		details?.forEach((blk) =>
		{blocks.push(...blk.getAllDetailBlocks(all));});

		blocks.push(this);
		return(blocks);
	}

	public setMasterDependencies() : boolean
	{
		this.MasterFilter.clear();
		let rels:Relation[] = this.getMasterLinks();

		for (let i = 0; i < rels.length; i++)
		{
			let link:Relation = rels[i];
			let master:Block = this.getMasterBlock(link);

			if (master.empty)
				return(false);

			if (master.getRecord().state == RecordState.Delete)
				return(false);

			for (let i = 0; i < link.master.fields.length; i++)
			{
				let mfld:string = link.master.fields[i];
				let dfld:string = link.detail.fields[i];

				let value:any = master.getValue(mfld);

				if (value != null)
				{
					let flt:Filter = Filters.Equals(dfld);
					flt.constraint = master.getValue(mfld);
					this.getMasterBlockFilter(master,true).and(flt,dfld);
				}
				else
				{
					let flt:Filter = Filters.IsNull(dfld);
					flt.constraint = master.getValue(mfld);
					this.getMasterBlockFilter(master,true).and(flt,dfld);
				}
			}
		}

		return(true);
	}

	public async setDetailDependencies() : Promise<boolean>
	{
		let blocks:Block[] = this.getDetailBlocks(false);

		for (let i = 0; i < blocks.length; i++)
		{
			if (blocks[i].QueryFilter.empty && blocks[i].DetailFilter.empty)
				return(true);

			let rel:Relation = blocks[i].findMasterRelation(this);

			if (await this.asSubQuery(this,blocks[i],rel))
				continue;

			let src:DataSource = blocks[i].datasource.clone();
			if (src instanceof DatabaseTable) src.columns = rel.detail.fields;

			src.name = blocks[i].name+".subquery";
			let details:FilterStructure = new FilterStructure();
			let filters:FilterStructure = new FilterStructure();

			filters.and(details,"details")

			filters.and(blocks[i].QueryFilter,"qbe");
			details.and(blocks[i].DetailFilter,"subquery");

			let filter:SubQuery = Filters.SubQuery(rel.master.fields);
			this.getDetailBlockFilter(blocks[i],true).and(filter,blocks[i].name);

			if (!await src.query(filters))
				return(false);

			let values:any[][] = [];

			while(true)
			{
				let recs:Record[] = await src.fetch();

				if (recs == null || recs.length == 0)
					break;

				recs.forEach((rec) =>
				{
					let row:any[] = [];
					rel.detail.fields.forEach((col) => row.push(rec.getValue(col)));
					values.push(row);
				});
			}

			filter.constraint = values;
		}

		return(true);
	}

	public getQueryID() : object
	{
		return(this.form.QueryManager.getQueryID());
	}

	public startNewQueryChain() : object
	{
		return(this.form.QueryManager.startNewChain());
	}

	public async queryDetails(newqry:boolean) : Promise<boolean>
	{
		if (this.querymode)
			return(true);

		if (this.view.empty())
			return(true);

		if (!this.form.finalized)
			return(true);

		let success:boolean = true;
		let qryid:object = this.getQueryID();
		if (newqry) qryid = this.startNewQueryChain();

		let blocks:Block[] = this.getDetailBlocks(true);

		for (let i = 0; i < blocks.length; i++)
		{
			if (!await blocks[i].executeQuery(qryid))
				success = false;
		}

		return(success);
	}

	public async prefetch(records:number, offset:number) : Promise<number>
	{
		return(this.wrapper.prefetch(this.record+offset,records));
	}

	public getRecord(offset?:number) : Record
	{
		if (offset == null) offset = 0;
		if (this.querymode) return(this.qberec);
		return(this.wrapper.getRecord(this.record+offset));
	}

	public async copy(header?:boolean, all?:boolean) : Promise<any[][]>
	{
		return(this.wrapper?.copy(all,header));
	}

	public finalize() : void
	{
		this.pubblk$ = this.form.parent.getBlock(this.name);
		this.view$ = FormBacking.getViewForm(this.form$.parent).getBlock(this.name);

		if (this.view$ == null)
		{
			this.view$ = FormBacking.getViewBlock(this,true);
			this.view.finalize();
		}

		if (this.pubblk$ == null)
		{
			this.pubblk$ = new InterfaceBlock(this.pubfrm$,this.name);
			FormBacking.getBacking(this.form.parent).setAutoGenerated(this.pubblk$);
		}

		if (!this.ctrlblk && this.datasource)
		{
			if (!this.datasource.queryallowed)
				this.pubblk$.qbeallowed = false;

			if (!this.datasource.insertallowed)
				this.pubblk$.insertallowed = false;

			if (!this.datasource.updateallowed)
				this.pubblk$.updateallowed = false;
		}

		if (!this.pubblk$.qbeallowed)
			this.view.disableQuery();

		if (!this.pubblk$.insertallowed)
			this.view.disableInsert();

		if (!this.pubblk$.updateallowed)
			this.view.disableUpdate();

		this.addColumns();
	}

	private async asSubQuery(master:Block, detail:Block, rel:Relation) : Promise<boolean>
	{
		if (!(master.datasource instanceof SQLSource)) return(false);
		if (!(detail.datasource instanceof SQLSource)) return(false);

		let source:SQLSource = detail.datasource;
		let sql:SQLRest = await source.getSubQuery(detail.filter,rel.master.fields,rel.detail.fields);

		if (sql != null)
		{
			let filter:SubQuery = new SubQuery(rel.master.fields);
			this.getDetailBlockFilter(detail,true).and(filter,detail.name);

			filter.subquery = sql.stmt;
			filter.setBindValues(sql.bindvalues);

			return(true);
		}

		return(false);
	}

	public async fire(type:EventType, field?:string) : Promise<boolean>
	{
		let frmevent:FormEvent = FormEvent.BlockEvent(type,this.pubfrm$,this.name,field);
		return(FormEvents.raise(frmevent));
	}
}