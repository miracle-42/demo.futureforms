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

import { Block } from "../public/Block";
import { Form } from "../public/Form";

export class Sorter
{
	private form:Form;
	private sections:Map<string,Section>;

	public constructor(form:Form)
	{
		this.form = form;
		this.sections = new Map<string,Section>();
	}

	/** toggle column asc/desc */
	public toggle(block:string, column:string) : Sorter
	{
		this.getSection(block).toggle(column);
		return(this);
	}

	/** clause: col1, col2 desc, ..." */
	public setFixed(block:string, clause:string) : Sorter
	{
		this.getSection(block).setFixed(clause);
		return(this);
	}

	/** clause: col1, col2 desc, ..." */
	public setOrder(block:string, clause:string) : Sorter
	{
		this.getSection(block).setOrder(clause);
		return(this);
	}

	/** sort the block */
	public async sort(block:string) : Promise<boolean>
	{
		let blk:Block = this.form.getBlock(block);
		if (!blk || !blk.datasource) return(false);

		let clause:string = this.getSection(block).toString();
		blk.datasource.sorting = clause;

		return(blk.reQuery());
	}

	private getSection(name:string) : Section
	{
		name = name.toLowerCase();
		let sec:Section = this.sections.get(name);

		if (sec == null)
		{
			sec = new Section();
			this.sections.set(name,sec);
		}

		return(sec);
	}
}

class Section
{
	fixed:Column[] = [];
	order:Column[] = [];

	setFixed(clause:string) : void
	{
		clause = clause.toLowerCase();
		let clauses = clause.split(",");
		clauses.forEach((clause) => {this.fixed.push(new Column(clause));})
	}

	setOrder(clause:string) : void
	{
		this.order = [];
		clause = clause.toLowerCase();

		clause = clause.toLowerCase();
		let clauses = clause.split(",");

		clauses.forEach((clause) => {this.order.push(new Column(clause));})
	}

	toggle(column:string) : void
	{
		let entry:Column = null;
		column = column.toLowerCase();

		for (let i = 0; i < this.order.length; i++)
		{
			if (this.order[i].name == column)
			{
				entry = this.order[i];
				entry.toggle();
			}
		}

		if (!entry) entry = new Column(column);
		this.order = [entry];
	}

	toString() : string
	{
		let order:string = "";
		this.fixed.forEach((clause) => {order += " "+clause});
		this.order.forEach((clause) => {order += " "+clause});
		return(order.substring(1));
	}
}

class Column
{
	name:string;
	asc:boolean = true;

	constructor(clause:string)
	{
		let words:string[] = clause.split(" ");

		this.name = words[0];
		if (words.length > 1) this.asc = words[1] != "desc";
	}

	toggle() : void
	{
		this.asc = !this.asc;
	}

	toString() : string
	{
		let clause = this.name;
		if (!this.asc) clause += " desc";
		return(clause);
	}
}