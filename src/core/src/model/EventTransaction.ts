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

import { Block } from "./Block.js";
import { Record } from "./Record.js";
import { EventType } from "../control/events/EventType.js";

export class EventTransaction
{
	private transactions:Map<string,Transaction> =
		new Map<string,Transaction>();

	public start(event:EventType, block:Block, record:Record) : EventType
	{
		let running:EventType = this.getTrxSlot(block);
		if (running) return(running);

		this.transactions.set(block?.name,new Transaction(event,block,record));
		return(null);
	}

	public running() : number
	{
		return(this.transactions.size);
	}

	public clear() : void
	{
		this.transactions.clear();
	}

	public finish(block:Block) : void
	{
		this.transactions.delete(block?.name);
	}

	public getEvent(block:Block) : EventType
	{
		return(this.transactions.get(block?.name)?.event);
	}

	public getRecord(block:Block) : Record
	{
		return(this.transactions.get(block?.name)?.record);
	}

	public getTrxSlot(block:Block) : EventType
	{
		let trx:Transaction = this.transactions.get(block?.name);
		return(trx?.event);
	}
}

class Transaction
{
	block:Block = null;
	record?:Record = null;
	event:EventType = null;

	constructor(event:EventType, block:Block, record:Record)
	{
		this.event = event;
		this.block = block;
		this.record = record;
	}
}