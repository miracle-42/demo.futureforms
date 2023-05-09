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

import { Block } from "../Block";

export class QueryManager
{
	qid$:number = 0;
	qmaster$:Block = null;
	running$:Map<Block,object> = new Map<Block,object>();

	public getQueryID() : object
	{
		return(this.qid$ as Number);
	}

	public startNewChain() : object
	{
		this.qid$ = this.qid$ + 1;
		return(this.qid$ as Number);
	}

	public stopAllQueries() : void
	{
		this.startNewChain();
	}

	public setRunning(block:Block, qid:object) : void
	{
		this.running$.set(block,qid);
	}

	public getRunning(block:Block) : object
	{
		return(this.running$.get(block));
	}

	public hasRunning() : boolean
	{
		let active:boolean = false;

		this.running$.forEach((qid) =>
		 {if (qid) active = true});

		return(active);
	}

	public get QueryMaster() : Block
	{
		return(this.qmaster$);
	}

	public set QueryMaster(qmaster:Block)
	{
		this.qmaster$ = qmaster;
	}

	public static sleep(ms:number) : Promise<void>
	{
		return(new Promise(resolve => setTimeout(resolve,ms)));
	}
}