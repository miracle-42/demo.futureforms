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

import { MSGGRP } from "../messages/Internal.js";
import { Record, RecordState } from "./Record.js";
import { Relation } from "./relations/Relation.js";
import { FilterStructure } from "./FilterStructure.js";
import { Block as ModelBlock } from "../model/Block.js";
import { Level, Messages } from "../messages/Messages.js";
import { EventType } from "../control/events/EventType.js";
import { FlushStrategy } from "../application/FormsModule.js";
import { DataSource, LockMode } from "./interfaces/DataSource.js";

export class DataSourceWrapper
{
	private eof$:boolean;
	private cache$:Record[];
	private hwm$:number = 0;
	private columns$:string[] = [];
	private source$:DataSource = null;
	private modified$:boolean = false;

	constructor(public block?:ModelBlock)
	{
		this.cache$ = [];
		this.eof$ = true;
	}

	public get source() : DataSource
	{
		if (this.source$ == null)
			this.source$ = this.block?.datasource;

		return(this.source$);
	}

	public set source(source:DataSource)
	{
		this.source$ = source;
	}

	public get columns() : string[]
	{
		return(this.columns$);
	}

	public set columns(columns:string[])
	{
		this.columns$ = columns;
	}

	public getRecords() : number
	{
		return(this.cache$.length);
	}

	public get dirty() : boolean
	{
		return(this.modified$);
	}

	public set dirty(flag:boolean)
	{
		this.modified$ = flag;

		if (!this.dirty)
		{
			for (let i = 0; i < this.cache$.length; i++)
				this.cache$[i].setClean(true);
		}
	}

	public get transactional() : boolean
	{
		if (this.source?.transactional) return(true);
		return(false);
	}

	public async clear(flush:boolean) : Promise<boolean>
	{
		this.hwm$ = 0;
		this.cache$ = [];
		this.columns$ = [];

		if (!flush)
		{
			this.source.clear();
			this.block.view.setAttributes();
			return(true);
		}

		await this.source.closeCursor();
		return(this.flush());
	}

	public setSynchronized() : void
	{
		this.dirty = false;

		this.cache$.forEach((rec) =>
		{rec.state = RecordState.Consistent;})

		this.block.view.setAttributes();
	}

	public getDirtyCount() : number
	{
		let dirty:number = 0;

		for (let i = 0; i < this.cache$.length; i++)
		{
			if (this.cache$[i].dirty && this.cache$[i].prepared)
				dirty++;
		}

		return(dirty);
	}

	public getPendingCount() : number
	{
		let pending:number = 0;

		for (let i = 0; i < this.cache$.length; i++)
		{
			if (!this.cache$[i].synched)
				pending++;
		}

		return(pending);
	}

	public async undo() : Promise<Record[]>
	{
		return(this.source.undo());
	}

	public async flush() : Promise<boolean>
	{
		try
		{
			this.cache$.forEach((record) =>
			{
				if (!record.synched)
					this.linkToMasters(record);

				if (record.state == RecordState.New)
					record.state = RecordState.Insert;
			});

			let succces:boolean = true;
			let records:Record[] = await this.source.flush();

			for (let i = 0; i < records.length; i++)
			{
				if (records[i].failed)
					continue;

				if (records[i].state == RecordState.Insert)
				{
					records[i].flushing = true;
					succces = await this.block.postInsert(records[i]);
					records[i].flushing = false;

					if (succces)
					{
						records[i].state = RecordState.Inserted;
						this.block.view.setAttributes(records[i]);
						records[i].setClean(false);
					}
				}

				else

				if (records[i].state == RecordState.Inserted)
				{
					records[i].flushing = true;
					succces = await this.block.postUpdate(records[i]);
					records[i].flushing = false;

					if (succces)
					{
						this.block.view.setAttributes(records[i]);
						records[i].setClean(false);
					}
				}

				else

				if (records[i].state == RecordState.Update)
				{
					records[i].flushing = true;
					succces = await this.block.postUpdate(records[i]);
					records[i].flushing = false;

					if (succces)
					{
						records[i].state = RecordState.Updated;
						this.block.view.setAttributes(records[i]);
						records[i].setClean(false);
					}
				}

				else

				if (records[i].state != RecordState.Deleted)
				{
					records[i].flushing = true;
					succces = await this.block.postDelete(records[i]);
					records[i].flushing = false;

					if (succces)
					{
						records[i].state = RecordState.Deleted;
						this.block.view.setAttributes(records[i]);
						records[i].setClean(false);
					}
				}
			}

			return(true);
		}
		catch (error)
		{
			Messages.handle(MSGGRP.FRAMEWORK,error,Level.severe);
			return(false);
		}
	}

	public getValue(record:number, field:string) : any
	{
		return(this.cache$[record]?.getValue(field));
	}

	public setValue(record:number, field:string, value:any) : boolean
	{
		if (record < 0 || record >= this.cache$.length)
			return(false);

		this.cache$[record].setValue(field,value);
		return(true);
	}

	public locked(record:Record) : boolean
	{
		if (!this.source.rowlocking)
			return(true);

		if (record.state == RecordState.New || record.state == RecordState.Insert)
			return(true);

		return(record.locked);
	}

	public async lock(record:Record, force:boolean) : Promise<boolean>
	{
		this.dirty = true;

		if (record.block.ctrlblk)
			return(true);

		if (this.locked(record))
			return(true);

		if (!this.source.transactional)
			return(true);

		if (record.state == RecordState.Deleted)
			return(false);

		if (this.source.rowlocking == LockMode.None)
			return(true);

		if (!force && this.source.rowlocking == LockMode.Optimistic)
			return(true);

		await this.block.setEventTransaction(EventType.OnLockRecord,record);
		let success:boolean = await this.block.fire(EventType.OnLockRecord);
		this.block.endEventTransaction(EventType.OnLockRecord,success);

		if (!success)
			return(false);

		success = await this.source.lock(record);

		if (success) record.locked = true;
		else 			 record.failed = true;

		if (record.locked)
		{
			await this.block.setEventTransaction(EventType.OnRecordLocked,record);
			success = await this.block.fire(EventType.OnRecordLocked);
			this.block.endEventTransaction(EventType.OnRecordLocked,success);
		}

		return(success);
	}

	public async refresh(record:Record) : Promise<void>
	{
		if (record.state == RecordState.Delete)
			return;

		if (record.state == RecordState.Deleted)
			return;

		if (record.state == RecordState.New || record.state == RecordState.Insert)
		{
			record.clear();
			record.state = RecordState.New;
			this.block.view.setAttributes(record);
			return;
		}

		await this.source.refresh(record);
		record.setClean(false);

		if (record.state == RecordState.Update)
			record.state = RecordState.Consistent;

		this.block.view.refresh(record);
		await this.block.onFetch(record);

		this.block.view.setAttributes(record);
	}

	public async modified(record:Record, deleted:boolean) : Promise<boolean>
	{
		let success:boolean = true;
		if (record == null) return(true);

		record.failed = false;

		if (deleted)
		{
			record.setDirty();
			this.dirty = true;

			let skip:boolean = false;
			if (record.state == RecordState.New) skip = true;
			if (record.state == RecordState.Insert) skip = true;

			if (!skip && !await this.lock(record,false))
				return(false);

			success = await this.delete(record);

			if (success)
			{
				if (!skip) record.state = RecordState.Delete;
				else       record.state = RecordState.Deleted;

				this.block.view.setAttributes(record);
			}
		}
		else if (record.dirty)
		{
			success = true;
			this.dirty = true;

			switch(record.state)
			{
				case RecordState.New :
					success = await this.insert(record);

					if (success)
					{
						record.state = RecordState.Insert;
						this.block.view.setAttributes(record);
					}
				break;

				case RecordState.Insert :
				case RecordState.Inserted :
					success = await this.update(record);
				break;


				case RecordState.Update :
				case RecordState.Updated :
				case RecordState.Consistent :
					success = await this.update(record);

					if (success)
					{
						record.state = RecordState.Update;
						this.block.view.setAttributes(record);
					}
				break;
			}
		}

		if (success && this.block?.interface.flushStrategy == FlushStrategy.Row)
		{
			success = await this.flush();
			if (success) success = !record.failed;
		}

		return(success);
	}

	public create(pos:number, before?:boolean) : Record
	{
		this.hwm$++;
		this.dirty = true;

		if (pos > this.cache$.length)
			pos = this.cache$.length - 1;

		if (before && pos >= 0) pos--;
		let inserted:Record = new Record(this.source);
		this.cache$.splice(pos+1,0,inserted);

		inserted.wrapper = this;
		inserted.prepared = true;
		inserted.state = RecordState.New;

		return(inserted);
	}

	public async insert(record:Record) : Promise<boolean>
	{
		if (!await this.block.preInsert(record))
			return(false);

		if (!await this.source.insert(record))
			return(false);

		return(true);
	}

	public async update(record:Record) : Promise<boolean>
	{
		if (!await this.block.preUpdate(record))
			return(false);

		if (!await this.source.update(record))
			return(false);

		return(true);
	}

	public async delete(record:Record) : Promise<boolean>
	{
		let skip:boolean = false;
		let pos:number = this.index(record);

		if (record.state == RecordState.New) skip = true;
		if (record.state == RecordState.Insert) skip = true;

		if (pos < 0)
			return(false);

		if (!await this.block.preDelete(record))
			return(false);

		if (!skip && !await this.source.delete(record))
			return(false);

		this.hwm$--;
		this.cache$.splice(pos,1);

		return(true);
	}

	public getRecord(record:number) : Record
	{
		return(this.cache$[record]);
	}

	public async query(filter?:FilterStructure) : Promise<boolean>
	{
		let success:boolean = await this.source.query(filter);

		if (success)
		{
			this.hwm$ = 0;
			this.cache$ = [];
			this.eof$ = false;
		}

		return(success);
	}

	public async fetch() : Promise<Record>
	{
		if (this.hwm$ >= this.cache$.length)
		{
			if (this.eof$) return(null);
			let recs:Record[] = await this.source.fetch();

			if (recs == null || recs.length == 0)
			{
				this.eof$ = true;
				return(null);
			}

			if (recs.length < this.source.arrayfecth)
				this.eof$ = true;

			this.cache$.push(...recs);
		}

		let record:Record = this.cache$[this.hwm$];

		if (!record.prepared)
		{
			record.setClean(true);
			record.wrapper = this;

			await this.block.onFetch(record);
			record.prepared = true;
		}

		this.hwm$++;
		return(record);
	}

	public async prefetch(record:number,records:number) : Promise<number>
	{
		let possible:number = 0;

		if (record >= this.hwm$ && records >= 0)
		{
			records += record - this.hwm$ + 1;
			record = this.hwm$ - 1;
		}

		if (records < 0)
		{
			possible = record > -records ? -records : record;
		}
		else
		{
			possible = this.hwm$ - record - 1;
			let fetch:number = records - possible;

			for (let i = 0; i < fetch; i++)
			{
				if (await this.fetch() == null)
					break;

				possible++;
			}

			if (possible > records)
				possible = records;
		}

		if (possible < 0) possible = 0;
		return(possible);
	}

	public indexOf(column:string) : number
	{
		let idx:number = this.columns$.indexOf(column);

		if (idx < 0)
		{
			this.columns$.push(column);
			idx = this.columns$.length-1;
		}

		return(idx);
	}

	public async copy(header?:boolean, all?:boolean) : Promise<any[][]>
	{
		let table:any[][] = [];
		while(all && await this.fetch() != null);

		let head:string[] = [];
		head.push(...this.columns);
		head.push(...this.source.columns);

		if (header)
			table.push(head);

		this.cache$.forEach((record) =>
		{
			if (record.prepared)
			{
				let data:any[] = [];
				head.forEach((col) => {data.push(record.getValue(col))})
				table.push(data);
			}
		})

		return(table);
	}

	public index(record:Record) : number
	{
		if (record == null)
			return(-1);

		for (let i = 0; i < this.cache$.length; i++)
		{
			if (this.cache$[i].id == record.id)
				return(i);
		}

		return(-1);
	}

	private linkToMasters(record:Record) : void
	{
		let masters:ModelBlock[] = this.block.getMasterBlocks();

		for (let i = 0; i < masters.length; i++)
		{
			let rel:Relation = this.block.findMasterRelation(masters[i]);

			for (let f = 0; f < rel.detail.fields.length; f++)
			{
				let col:string = rel.detail.fields[i];
				let mst:string = rel.master.fields[i];

				if (record.getValue(col) == null)
					record.setValue(col,masters[i].getValue(mst));
			}
		}
	}

	public dump() : void
	{
		this.cache$.forEach((rec) => console.log(rec.toString()));
	}
}