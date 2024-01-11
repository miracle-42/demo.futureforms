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

import { Form } from "../Form.js";
import { Block } from "../Block.js";
import { Relation } from "./Relation.js";
import { MSGGRP } from "../../messages/Internal.js";
import { Messages } from "../../messages/Messages.js";


export class BlockCoordinator
{
	constructor(private form:Form) {}
	private blocks$:Map<string,Dependency> = new Map<string,Dependency>();

	public getQueryMaster(block?:Block) : Block
	{
		let master:Block = block;
		let masters:Block[] = this.getMasterBlocks(block);

		for (let i = 0; i < masters.length; i++)
		{
			if (masters[i].querymode)
				master = this.getQueryMaster(masters[i]);
		}

		return(master);
	}

	public allowQueryMode(block:Block) : boolean
	{
		let masters:Block[] = this.getMasterBlocks(block);

		for (let i = 0; i < masters.length; i++)
		{
			if (masters[i].querymode)
			{
				let rel:Relation = this.findRelation(masters[i].name,block.name);

				let master:Block = this.getBlock(rel.master.block);

				if (master?.querymode && !rel.orphanQueries)
					return(false);
			}
			else if (masters[i].empty)
			{
				return(false);
			}
		}

		return(true);
	}

	public getMasterBlock(link:Relation) : Block
	{
		return(this.getBlock(link.master.block));
	}

	public getDetailBlock(link:Relation) : Block
	{
		return(this.getBlock(link.detail.block));
	}

	public getDetailBlocks(block:Block,all:boolean) : Block[]
	{
		let blocks:Block[] = [];

		this.blocks$.get(block.name)?.details.forEach((link) =>
		{
			let block:Block = this.getBlock(link.detail.block);

			if (block == null)
				return([]);

			if (all || link.orphanQueries)
				blocks.push(block);
		})

		return(blocks);
	}

	public getMasterBlocks(block?:Block) : Block[]
	{
		let blocks:Block[] = [];

		if (block == null)
		{
			this.blocks$.forEach((dep,blk) =>
			{
				if (dep.masters.length == 0)
				{
					let master:Block = this.getBlock(blk);
					if (master != null) blocks.push(master);
				}
			})
		}
		else
		{
			this.blocks$.get(block.name)?.masters.forEach((link) =>
			{
				let master:Block = this.getBlock(link.master.block);
				if (master != null) blocks.push(master);
			})
		}

		return(blocks);
	}

	public getDetailBlocksForField(block:Block,field:string) : Block[]
	{
		let blocks:Block[] = [];

		this.blocks$.get(block.name)?.getFieldRelations(field)?.
		forEach((rel) => blocks.push(this.getBlock(rel.detail.block)))

		return(blocks);
	}

	public getMasterLinks(block:Block) : Relation[]
	{
		let blocks:Relation[] = [];

		this.blocks$.get(block.name)?.masters.forEach((link) =>
		{
			let block:Block = this.getBlock(link.master.block);

			if (block == null)
				return([]);

			blocks.push(link);
		})

		return(blocks);
	}

	public getDetailLinks(block:Block) : Relation[]
	{
		let blocks:Relation[] = [];

		this.blocks$.get(block.name)?.details.forEach((link) =>
		{
			let block:Block = this.getBlock(link.master.block);

			if (block == null)
				return([]);

			blocks.push(link);
		})

		return(blocks);
	}

	public allowMasterLess(master:Block, detail:Block) : boolean
	{
		if (master == detail) return(true);
		return(this.findRelation(master.name, detail.name)?.orphanQueries);
	}

	public findRelation(master:Block|string, detail:Block|string) : Relation
	{
		if (master instanceof Block) master = master.name;
		if (detail instanceof Block) detail = detail.name;

		let details:Relation[] = this.blocks$.get(master).details;

		for (let i = 0; i < details.length; i++)
		{
			if (details[i].detail.block == detail)
				return(details[i]);
		}

		return(null);
	}

	public link(link:Relation) : void
	{
		if (link.detail.block == link.master.block)
		{
			// Self referencing
			Messages.severe(MSGGRP.FRAMEWORK,13,link.master.name,link.detail.name);
			return;
		}

		let dependency:Dependency = null;
		dependency = this.blocks$.get(link.master.block);

		if (dependency == null)
		{
			dependency = new Dependency(link.master.block);
			this.blocks$.set(dependency.block,dependency);
		}

		dependency.link(link);

		dependency = this.blocks$.get(link.detail.block);

		if (dependency == null)
		{
			dependency = new Dependency(link.detail.block);
			this.blocks$.set(dependency.block,dependency);
		}

		dependency.link(link);
	}

	public getBlock(name:string) : Block
	{
		let block:Block = this.form.getBlock(name);

		if (block == null)
		{
			// Block does not exist
			Messages.severe(MSGGRP.FORM,1,name);
			return(null);
		}

		return(block);
	}

	public getLinkedColumns(block:Block) : string[]
	{
		let fields:Set<string> = new Set<string>();

		this.getDetailLinks(block)?.forEach((rel) =>
		{
			rel.master.fields.forEach((fld) =>
				{fields.add(fld);})
		})

		this.getMasterLinks(block)?.forEach((rel) =>
		{
			rel.detail.fields.forEach((fld) =>
				{fields.add(fld);})
		})

		return(Array.from(fields));
	}
}

class Dependency
{
	constructor(public block:string) {}
	private masters$:Map<string,Relation> = new Map<string,Relation>();
	private details$:Map<string,Relation> = new Map<string,Relation>();
	private fldmap$:Map<string,Relation[]> = new Map<string,Relation[]>();

	public get details() : Relation[]
	{
		let links:Relation[] = Array.from(this.details$.values());
		return(links != null ? links : []);
	}

	public get masters() : Relation[]
	{
		let links:Relation[] = Array.from(this.masters$.values());
		return(links != null ? links : []);
	}

	public getFieldRelations(field:string) : Relation[]
	{
		return(this.fldmap$.get(field));
	}

	public link(link:Relation) : void
	{
		if (link.detail.block == this.block)
		{
			this.masters$.set(link.master.block,link);
		}
		else
		{
			let links:Relation[] = null;
			this.details$.set(link.detail.block,link);

			link.master.fields.forEach((fld) =>
			{
				links = this.fldmap$.get(fld);

				if (links == null)
				{
					links = [];
					this.fldmap$.set(fld,links);
				}

				links.push(link);
			})
		}
	}
}