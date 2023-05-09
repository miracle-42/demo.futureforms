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

import { Block as ModelBlock } from "../model/Block.js";
import { DataSource } from "./interfaces/DataSource.js";
import { DataSourceWrapper } from "./DataSourceWrapper.js";

export class DataModel
{
	private defined$:Map<string,DataSource> =
		new Map<string,DataSource>();

	private sources$:Map<ModelBlock,DataSourceWrapper> =
		new Map<ModelBlock,DataSourceWrapper>();

	public clear(block:ModelBlock, flush:boolean) : void
	{
		this.getWrapper(block)?.clear(flush);
	}

	public getWrapper(block:ModelBlock) : DataSourceWrapper
	{
		return(this.sources$.get(block));
	}

	public setWrapper(block:ModelBlock) : DataSourceWrapper
	{
		let wrapper:DataSourceWrapper = new DataSourceWrapper(block);
		this.sources$.set(block,wrapper);
		return(wrapper);
	}

	public getDataSource(block:string) : DataSource
	{
		let src:DataSource = this.defined$.get(block);
		if (src != null) this.defined$.delete(block);
		return(src);
	}

	public setDataSource(block:string, source:DataSource) : void
	{
		this.defined$.set(block,source);
	}
}