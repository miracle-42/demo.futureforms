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

import content from './PhoneBookMembased.html';

import { BaseForm } from '../../BaseForm';
import { Employees } from "../../datasources/memory/Employees";
import { EventType, Filters, Filter, Block, block, datasource, formevent, DatePicker } from 'forms42core';

@datasource("Employees",Employees)

export class PhoneBookMembased extends BaseForm
{
	@block("employees")
	public emp:Block = null;
	private filter:Filter = null;
	private sorting:{column?:string, asc?:boolean} = {}

	constructor()
	{
		super(content);
		this.title = "PhoneBook";
		this.filter = Filters.Contains("first_name, last_name");
	}

	public async sort(column:string) : Promise<void>
	{
		let asc:boolean = this.sorting.asc;
		let toogle:boolean = column == this.sorting.column;

		if (!toogle) asc = true;
		else asc = !this.sorting.asc;

		this.sorting.asc = asc;
		this.sorting.column = column;

		this.emp.datasource.sorting =
			column+" "+(this.sorting.asc ? "asc" : "desc");

		this.sorting.column = column;
		this.emp.reQuery();
	}

	@formevent({type: EventType.PostViewInit})
	public async start() : Promise<boolean>
	{
		await this.emp.executeQuery();
		return(true);
	}

	@formevent({type: EventType.PreQuery, block: "employees"})
	public async setFilter() : Promise<boolean>
	{
		let value:any = this.getValue("search","filter");
		if (value) this.emp.filter.and(this.filter);
		else this.emp.filter.delete(this.filter);
		return(true);
	}

	@formevent({type: EventType.OnEdit, block: "search", field: "filter"})
	public async search() : Promise<boolean>
	{
		this.filter.constraint = this.getValue("search","filter");
		await this.emp.reQuery();
		return(true);
	}
}