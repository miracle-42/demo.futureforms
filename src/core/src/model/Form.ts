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

import { Block } from './Block.js';
import { Record } from './Record.js';
import { DataModel } from './DataModel.js';
import { Alert } from '../application/Alert.js';
import { Form as ViewForm } from '../view/Form.js';
import { Connection } from '../database/Connection.js';
import { Logger, Type } from '../application/Logger.js';
import { DataSource } from './interfaces/DataSource.js';
import { EventTransaction } from './EventTransaction.js';
import { Form as InterfaceForm } from '../public/Form.js';
import { QueryManager } from './relations/QueryManager.js';
import { EventType } from '../control/events/EventType.js';
import { FormBacking } from '../application/FormBacking.js';
import { FormEvents } from '../control/events/FormEvents.js';
import { FormMetaData } from '../application/FormMetaData.js';
import { EventFilter } from '../control/events/EventFilter.js';
import { FieldInstance } from '../view/fields/FieldInstance.js';
import { BlockCoordinator } from './relations/BlockCoordinator.js';


export class Form
{
	private block$:Block = null;
	private viewfrm$:ViewForm = null;
	private parent$:InterfaceForm = null;
	private datamodel$:DataModel = new DataModel();
	private qrymgr$:QueryManager = new QueryManager();
	private blocks$:Map<string,Block> = new Map<string,Block>();
	private evttrans$:EventTransaction = new EventTransaction();
	private blkcord$:BlockCoordinator = new BlockCoordinator(this);

	constructor(parent:InterfaceForm)
	{
		this.parent$ = parent;
		FormBacking.setModelForm(parent,this);
		this.viewfrm$ = FormBacking.getViewForm(this.parent,true);
		Logger.log(Type.formbinding,"Create modelform: "+this.parent.name);
	}

	public get name() : string
	{
		return(this.parent.name);
	}

	public get block() : Block
	{
		return(this.block$);
	}

	public get view() : ViewForm
	{
		return(this.viewfrm$);
	}

	public get parent() : InterfaceForm
	{
		return(this.parent$);
	}

	public set dirty(flag:boolean)
	{
		let blocks:Block[] = Array.from(this.blocks$.values());

		for (let i = 0; i < blocks.length; i++)
			blocks[i].dirty = flag;
	}

	public get dirty() : boolean
	{
		let blocks:Block[] = Array.from(this.blocks$.values());

		for (let i = 0; i < blocks.length; i++)
		{
			if (blocks[i].dirty)
				return(true);
		}

		return(false);
	}

	public get QueryManager() : QueryManager
	{
		return(this.qrymgr$);
	}

	public get BlockCoordinator() : BlockCoordinator
	{
		return(this.blkcord$);
	}

	public getDirtyCount() : number
	{
		let dirty:number = 0;
		let blocks:Block[] = Array.from(this.blocks$.values());

		for (let i = 0; i < blocks.length; i++)
			dirty += blocks[i].getDirtyCount();

		return(dirty);
	}

	public synchronize() : void
	{
		this.blocks$.forEach((block) =>
		{block.wrapper.setSynchronized();});
	}

	public async undo() : Promise<boolean>
	{
		let dirty:Block[] = [];
		let requery:Set<Block> = new Set<Block>();
		let blocks:Block[] = Array.from(this.blocks$.values());

		for (let i = 0; i < blocks.length; i++)
		{
			if (blocks[i].dirty)
			{
				dirty.push(blocks[i]);

				if (!await blocks[i].undo(false))
					return(false);
			}
		}

		// Only requery top-level blocks

		for (let i = 0; i < dirty.length; i++)
			requery.add(dirty[i]);

		for (let i = 0; i < dirty.length; i++)
		{
			this.blkcord$.getDetailBlocks(dirty[i],true).
			forEach((detail) =>
			{
				if (!detail.ctrlblk)
					requery.delete(detail)
			});
		}

		dirty = [...requery];

		for (let i = 0; i < dirty.length; i++)
		{
			if (!dirty[i].ctrlblk)
			{
				if (!dirty[i].queried) await dirty[i].clear(false);
				else await dirty[i].executeQuery(dirty[i].startNewQueryChain());
			}
		}

		return(true);
	}

	public clear() : void
	{
		let blocks:Block[] = Array.from(this.blocks$.values());

		for (let i = 0; i < blocks.length; i++)
		{
			blocks[i].dirty = false;
			blocks[i].wrapper.clear(false);
		}
	}

	public async flush() : Promise<boolean>
	{
		let blocks:Block[] = Array.from(this.blocks$.values());

		for (let i = 0; i < blocks.length; i++)
		{
			if (!await blocks[i].flush())
				return(false);
		}

		return(true);
	}

	public getBlocks() : Block[]
	{
		let blocks:Block[] = [];

		this.blocks$.forEach((block) =>
			{blocks.push(block)})

		return(blocks);
	}

	public getBlock(name:string) : Block
	{
		return(this.blocks$.get(name));
	}

	public get datamodel() : DataModel
	{
		return(this.datamodel$);
	}

	public setDataSource(blk:string,source:DataSource) : void
	{
		let block:Block = this.getBlock(blk);
		if (block) block.datasource = source;
		else this.datamodel.setDataSource(blk,source);
	}

	public get eventTransaction() : EventTransaction
	{
		return(this.evttrans$);
	}

	public hasEventTransaction(block:Block) : boolean
	{
		return(this.eventTransaction.getEvent(block) != null);
	}

	public checkEventTransaction(event:EventType, block:Block) : boolean
	{
		let running:EventType = this.eventTransaction.getEvent(block);

		if (running != null)
			Alert.fatal("Cannot start transaction "+EventType[event]+" while running "+EventType[running],"Transaction Violation");

		return(running == null);
	}

	public async wait4EventTransaction(event:EventType, block:Block) : Promise<boolean>
	{
		let running:EventType = this.eventTransaction.getTrxSlot(block);

		if (running)
		{
			let source:string = this.name+(block ? "."+block.name : "")
			Alert.fatal("Cannot start transaction "+EventType[event]+" while running "+EventType[running]+" on "+source,"Transaction Violation");
			return(false);
		}

		return(true);
	}

	public async setEventTransaction(event:EventType, block:Block, record:Record) : Promise<boolean>
	{
		let running:EventType = this.eventTransaction.start(event,block,record);

		if (running)
		{
			let source:string = this.name+(block ? "."+block.name+"."+block.view.current : "");
			Alert.fatal("Cannot start transaction "+EventType[event]+" while running "+EventType[running]+" on "+source,"Transaction Violation");
			return(false);
		}

		return(true);
	}

	public endEventTransaction(_event:EventType, block:Block, _success:boolean) : void
	{
		this.eventTransaction.finish(block);
	}

	public addBlock(block:Block) : void
	{
		this.datamodel$.setWrapper(block);
		this.blocks$.set(block.name,block);
		Logger.log(Type.formbinding,"Add block '"+block.name+"' to modelform: "+this.parent.name);
	}

	public async finalize() : Promise<void>
	{
		let meta:FormMetaData = FormMetaData.get(this.parent);

		meta?.formevents.forEach((filter,method) =>
		{
			let handle:object = FormEvents.addListener(this.parent,this.parent,method,filter);
			FormBacking.getBacking(this.parent).listeners.push(handle);
		})

		meta?.getDataSources().forEach((source,block) =>
		{
			let blk:Block = this.getBlock(block);
			if (blk != null) blk.datasource = source;
		})

		this.blocks$.forEach((block) =>
			{block.finalize()});

		meta?.blockattrs.forEach((block,attr) =>
		{this.parent[attr] = this.parent.getBlock(block)})

		FormBacking.getBacking(this.parent).links.
		forEach((link) => this.BlockCoordinator.link(link))

		this.blocks$.forEach((block) =>
		{
			FormMetaData.getBlockEvents(block.pubblk).forEach((event) =>
			{
				if (!event.filter) event.filter = {} as EventFilter;
				if (!Array.isArray(event.filter)) event.filter = [event.filter];

				for (let i = 0; i < event.filter.length; i++)
					(event.filter[i] as EventFilter).block = block.name;

				let handle:object = FormEvents.addListener(this.parent,block.pubblk,event.method,event.filter);
				FormBacking.getBacking(this.parent).listeners.push(handle);
			})
		})

		this.blocks$.forEach((block) =>
		{block.addColumns(this.BlockCoordinator.getLinkedColumns(block))});

		await this.initControlBlocks();
	}

	public getQueryMaster() : Block
	{
		return(this.qrymgr$.QueryMaster);
	}

	public async save() : Promise<boolean>
	{
		if (!await this.view.validate())
			return(false);

		let dbconns:Connection[] = Connection.getAllConnections();

		for (let i = 0; i < dbconns.length; i++)
		{
			if (dbconns[i].connected())
				await dbconns[i].commit();
		}

		Alert.message("Transactions successfully saved","Transactions");
		return(true);
	}

	public async enterQuery(block:Block|string) : Promise<boolean>
	{
		if (typeof block === "string")
			block = this.getBlock(block);

		if (block.ctrlblk)
			return(false);

		if (block.querymode)
			return(true);

		if (!block.queryallowed)
			return(false);

		this.QueryManager.stopAllQueries();

		while(this.QueryManager.hasRunning())
		{
			await QueryManager.sleep(10);
			// Wait for stale query to finish displaying rows
		}

		if (!block.view.validated)
		{
			if (!await block.view.validate())
				return(false);
		}

		await this.flush();

		if (!this.blkcord$.allowQueryMode(block))
			return(false);

		if (!block.view.hasQueryableFields())
			return(false);

		this.clearDetailDepencies(block);

		await this.enterQueryMode(block);

		let inst:FieldInstance = this.view.current;

		inst?.blur(true);
		inst = block.view.getQBEInstance(inst);

		if (inst) inst.focus();
		else block.view.findFirstEditable(block.qberec)?.focus();

		return(true);
	}

	public clearBlock(block:Block) : void
	{
		block.queried = false;

		block.view.clear(true,true,true);
		let blocks:Block[] = this.blkcord$.getDetailBlocks(block,true);

		for (let i = 0; i < blocks.length; i++)
			this.clearBlock(blocks[i]);
	}

	private clearQueryFilters(block:Block) : void
	{
		block.qberec.clear();
		block.QueryFilter.clear();

		let blocks:Block[] = this.blkcord$.getDetailBlocks(block,true);

		for (let i = 0; i < blocks.length; i++)
			this.clearQueryFilters(blocks[i]);
	}

	private clearDetailDepencies(block:Block) : void
	{
		block.DetailFilter.clear();

		let blocks:Block[] = this.blkcord$.getDetailBlocks(block,true);

		for (let i = 0; i < blocks.length; i++)
			this.clearDetailDepencies(blocks[i]);
	}

	private async enterQueryMode(block:Block) : Promise<void>
	{
		if (!await block.enterQuery())
			return;

		let blocks:Block[] = this.blkcord$.getDetailBlocks(block,false);

		for (let i = 0; i < blocks.length; i++)
		{
			if (this.blkcord$.allowMasterLess(block,blocks[i]))
				await this.enterQueryMode(blocks[i]);
		}
	}

	public cancelQueryMode(block:Block|string) : void
	{
		if (typeof block === "string")
			block = this.getBlock(block);

		block.view.cancel();

		let blocks:Block[] = this.blkcord$.getDetailBlocks(block,false);

		for (let i = 0; i < blocks.length; i++)
		{
			if (this.blkcord$.allowMasterLess(block,blocks[i]))
				this.cancelQueryMode(blocks[i]);
		}
	}

	public async queryFieldDetails(block:string,field:string) : Promise<boolean>
	{
		let blk:Block = this.getBlock(block);
		let newid:object = this.QueryManager.startNewChain();

		this.blkcord$.getDetailBlocksForField(blk,field).
		forEach((detail) => {detail.executeQuery(newid)})

		return(true)
	}

	public async executeQuery(block:Block|string, keep?:boolean) : Promise<boolean>
	{
		if (typeof block === "string")
			block = this.getBlock(block);

		if (block == null)
			return(false);

		if (block.ctrlblk)
			return(false);

		if (!block.queryallowed)
			return(false);

		if (!block.view.validated)
		{
			if (!await block.view.validate())
				return(false);
		}

		await this.flush();

		if (block.querymode)
		{
			block = this.blkcord$.getQueryMaster(block);
		}
		else
		{
			if (!keep)
			{
				this.clearQueryFilters(block);
				this.clearDetailDepencies(block);
			}
		}

		this.qrymgr$.QueryMaster = block;
		let blocks:Block[] = block.getAllDetailBlocks(true);

		for (let i = 0; i < blocks.length; i++)
		{
			blocks[i].view.clear(true,true,true);

			if (!await blocks[i].preQuery())
				return(false);

			if (!await blocks[i].setDetailDependencies())
				return(false);

			let filters:boolean = false;
			if (!blocks[i].QueryFilter.empty) filters = true;
			if (!blocks[i].DetailFilter.empty) filters = true;

			this.view.setFilterIndicator(blocks[i],filters);
		}

		return(block.executeQuery(this.qrymgr$.startNewChain()));
	}

	public async initControlBlocks() : Promise<void>
	{
		for(let block of this.blocks$.values())
		{
			if (block.datasource == null)
			{
				block.datasource = block.createMemorySource();

				block.ctrlblk = true;
				await block.executeQuery();
			}
		}
	}

	public clearEventTransactions() : void
	{
		this.eventTransaction.clear();
	}
}