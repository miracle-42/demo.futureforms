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

import { Form } from "../public/Form.js";
import { Block } from "../public/Block.js";
import { FormBacking } from "./FormBacking.js";
import { Class, isClass } from '../public/Class.js';
import { DataSource } from '../model/interfaces/DataSource.js';
import { EventFilter } from '../control/events/EventFilter.js';


export class FormMetaData
{
	private static metadata:Map<string,FormMetaData> =
		new Map<string,FormMetaData>();

	private static lsnrevents$:Map<Function,BlockEvent[]> =
		new Map<Function,BlockEvent[]>();

	private static blockevents$:Map<Function,BlockEvent[]> =
		new Map<Function,BlockEvent[]>();

	public static cleanup(form:Form) : void
	{
		let meta:FormMetaData =
			FormMetaData.metadata.get(form.constructor.name);

		if (meta != null)
		{
			meta.blockattrs.forEach((_block,attr) =>
				{form[attr] = null;});

			FormBacking.getModelForm(form).getBlocks().forEach((blk) =>
				{blk.reset(meta.blocksources$.get(blk.name) != null);})
		}
	}

	public static setBlockEvent(block:Block, method:string, filter:EventFilter|EventFilter[]) : void
	{
		let events:BlockEvent[] = FormMetaData.blockevents$.get(block.constructor);

		if (events == null)
		{
			events = [];
			FormMetaData.blockevents$.set(block.constructor,events);
		}

		events.push(new BlockEvent(method,filter));
	}

	public static getBlockEvents(block:Block) : BlockEvent[]
	{
		let events:BlockEvent[] = FormMetaData.blockevents$.get(block.constructor);
		if (events == null) events = [];
		return(events);
	}

	public static setListenerEvent(lsnr:any, method:string, filter:EventFilter|EventFilter[]) : void
	{
		let events:BlockEvent[] = FormMetaData.lsnrevents$.get(lsnr.constructor);

		if (events == null)
		{
			events = [];
			FormMetaData.lsnrevents$.set(lsnr.constructor,events);
		}

		events.push(new BlockEvent(method,filter));
	}

	public static getListenerEvents(lsnr:any) : BlockEvent[]
	{
		let events:BlockEvent[] = FormMetaData.lsnrevents$.get(lsnr.constructor);
		if (events == null) events = [];
		return(events);
	}

	public static get(form:Class<Form>|Form, create?:boolean) : FormMetaData
	{
		let name:string = null;

		if (isClass(form)) name = form.name;
		else					 name = form.constructor.name;

		let meta:FormMetaData = FormMetaData.metadata.get(name);

		if (meta == null && create)
		{
			meta = new FormMetaData();
			FormMetaData.metadata.set(name,meta);
		}

		return(meta)
	}

	public blockattrs:Map<string,string> =
		new Map<string,string>();

	public formevents:Map<string,EventFilter|EventFilter[]> =
		new Map<string,EventFilter|EventFilter[]>();

	private blocksources$:Map<string,Class<DataSource>|DataSource> =
		new Map<string,Class<DataSource>|DataSource>();

	public getDataSources() : Map<string,DataSource>
	{
		let sources:Map<string,DataSource> =
			new Map<string,DataSource>();

		this.blocksources$.forEach((source,block) =>
		{
			if (!isClass(source)) sources.set(block,source);
			else						 sources.set(block, new source());
		})

		return(sources);
	}

	public addDataSource(block:string, source:Class<DataSource>|DataSource) : void
	{
		this.blocksources$.set(block?.toLowerCase(),source);
	}

	public getDataSource(block:string) : DataSource
	{
		block = block?.toLowerCase();
		let source:Class<DataSource>|DataSource = this.blocksources$.get(block);

		if (source && isClass(source))
		{
			source = new source();
			this.blocksources$.set(block,source);
		}

		return(source as DataSource);
	}
}

export class BlockEvent
{
	constructor(public method:string, public filter:EventFilter|EventFilter[]) {}
}