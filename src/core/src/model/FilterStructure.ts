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

import { Record } from "./Record.js";
import { Filter } from "./interfaces/Filter.js";
import { BindValue } from "../database/BindValue.js";

/**
 * Filters is a key component when communicating with a backend.
 *
 * A FilterStructure is a tree like collection of filters. It embraces
 * the where-clause in sql.
 */
export class FilterStructure
{
	public name:string = null;

	private entries$:Constraint[] = [];

	private fieldidx$:Map<string,Constraint> =
		new Map<string,Constraint>();

	private filteridx$:Map<Filter|FilterStructure,Constraint> =
		new Map<Filter|FilterStructure,Constraint>();

	public constructor(name?:string)
	{
		this.name = name;
	}

	public get empty() : boolean
	{
		return(this.getFilters().length == 0);
	}

	public size() : number
	{
		return(this.entries$.length);
	}

	public getName(filter:Filter) : string
	{
		let cstr:Constraint = this.filteridx$.get(filter);
		return(cstr.name);
	}

	public clone() : FilterStructure
	{
		let clone = new FilterStructure();

		for (let i = 0; i < this.entries$.length; i++)
		{
			let cstr:Constraint = this.entries$[i];

			if (cstr.isFilter())
			{
				if (cstr.and) 	clone.and(cstr.filter.clone(),cstr.name);
				else 				clone.or(cstr.filter.clone(),cstr.name)
			}
			else
			{
				if (cstr.and) 	clone.and(cstr.getFilterStructure().clone(),cstr.name);
				else 				clone.or(cstr.getFilterStructure().clone(),cstr.name)
			}
		}

		return(clone);
	}

	public hasChildFilters() : boolean
	{
		for (let i = 0; i < this.entries$.length; i++)
		{
			if (this.entries$[i].isFilter())
				return(true);
		}
		return(false);
	}

	public clear(name?:string) : void
	{
		if (name == null)
		{
			this.entries$ = [];
			this.fieldidx$.clear();
			this.filteridx$.clear();
		}
		else
		{
			this.delete(name);
		}
	}

	public or(filter:Filter|FilterStructure, name?:string) : FilterStructure
	{
		if (filter == this)
			return;

		if (!(filter instanceof FilterStructure) && name == null)
			name = filter.getBindValueName();

		this.delete(name);

		if (!this.filteridx$.has(filter))
		{
			let cstr:Constraint = new Constraint(false,filter,name);
			if (name) this.fieldidx$.set(name.toLowerCase(),cstr);
			this.filteridx$.set(filter,cstr);
			this.entries$.push(cstr);
		}

		return(this);
	}

	public and(filter:Filter|FilterStructure, name?:string) : FilterStructure
	{
		if (filter == this)
			return;

		if (!(filter instanceof FilterStructure) && name == null)
			name = filter.getBindValueName();

		this.delete(name);

		if (!this.filteridx$.has(filter))
		{
			let cstr:Constraint = new Constraint(true,filter,name);
			if (name) this.fieldidx$.set(name.toLowerCase(),cstr);
			this.filteridx$.set(filter,cstr);
			this.entries$.push(cstr);
		}

		return(this);
	}

	public get(field:string) : Filter|FilterStructure
	{
		return(this.fieldidx$.get(field?.toLowerCase())?.filter);
	}

	public getFilter(field:string) : Filter
	{
		let constr:Constraint = this.fieldidx$.get(field?.toLowerCase());
		if (!constr || !constr.isFilter()) return(null);
		return(constr.filter as Filter);
	}

	public getFilterStructure(field:string) : FilterStructure
	{
		let constr:Constraint = this.fieldidx$.get(field?.toLowerCase());
		if (!constr || constr.isFilter()) return(null);
		return(constr.filter as FilterStructure);
	}

	public delete(filter:string|Filter|FilterStructure) : boolean
	{
		let found:boolean = false;

		for (let i = 0; i < this.entries$.length; i++)
		{
			if (!this.entries$[i].isFilter())
			{
				if ((this.entries$[i].getFilterStructure()).delete(filter))
					found = true;
			}
		}

		if (typeof filter === "string")
			filter = this.get(filter);

		let cstr:Constraint = this.filteridx$.get(filter);

		if (cstr != null)
		{
			let pos:number = this.entries$.indexOf(cstr);

			if (pos >= 0)
			{
				found = true;
				this.entries$.splice(pos,1);
				this.filteridx$.delete(filter);
				this.fieldidx$.delete(cstr.name);
			}
		}

		return(found);
	}

	public async evaluate(record:Record) : Promise<boolean>
	{
		let match:boolean = true;

		for (let i = 0; i < this.entries$.length; i++)
		{
			if (match && this.entries$[i].or)
				continue;

			if (!match && this.entries$[i].and)
				continue;

			match = await this.entries$[i].matches(record);
		}

		return(match);
	}

	public asSQL() : string
	{
		return(this.build(0));
	}

	public getBindValues() : BindValue[]
	{
		let bindvalues:BindValue[] = [];

		let filters:Filter[] = this.getFilters();
		filters.forEach((filter) => bindvalues.push(...filter.getBindValues()));

		return(bindvalues);
	}

	private build(clauses:number) : string
	{
		let stmt:string = "";
		let first:boolean = true;

		for (let i = 0; i < this.entries$.length; i++)
		{
			let constr:Constraint = this.entries$[i];

			if (constr.filter instanceof FilterStructure)
			{
				if (constr.filter.hasChildFilters())
				{
					let clause:string = constr.filter.build(clauses);

					if (clause != null && clause.length > 0)
					{
						if (clauses > 0) stmt += " " + constr.opr + " ";
						stmt += "(" + clause + ")";
						first = false;
						clauses++;
					}
				}
				else
				{
					let clause:string = constr.filter.build(clauses);

					if (clause != null && clause.length > 0)
					{
						clauses++;
						stmt += clause;
					}
				}
			}
			else
			{
				let clause:string = constr.filter.asSQL();

				if (clause != null && clause.length > 0)
				{
					if (!first)
						stmt += " " + constr.opr + " ";

					stmt += clause;
					first = false;
					clauses++;
				}
			}
		}

		return(stmt);
	}

	public getFilters(start?:FilterStructure) : Filter[]
	{
		let filters:Filter[] = [];
		if (start == null) start = this;

		for (let i = 0; i < start.entries$.length; i++)
		{
			if (start.entries$[i].isFilter())
			{
				filters.push(start.entries$[i].filter as Filter);
			}
			else
			{
				filters.push(...this.getFilters(start.entries$[i].filter as FilterStructure))
			}
		}

		return(filters);
	}

	public printable() : Printable
	{
		let name:string = null;
		let p:Printable = new Printable();

		for (let i = 0; i < this.entries$.length; i++)
		{
			name = this.entries$[i].name;
			if (name == null) name = this.name;

			if (this.entries$[i].isFilter())
			{
				p.entries.push({name: name, filter: this.entries$[i].filter.toString()})
			}
			else
			{
				let sub:FilterStructure = this.entries$[i].getFilterStructure();
				p.entries.push({name: name, sub: sub.printable()})
			}
		}

		return(p);
	}

	public toString() : string
	{
		return(this.asSQL());
	}
}

class Constraint
{
	constructor(public and$:boolean, public filter:Filter|FilterStructure, public name:string) {}

	get or() : boolean
	{
		return(!this.and$);
	}

	get and() : boolean
	{
		return(this.and$);
	}

	get opr() : string
	{
		if (this.and) return("and");
		return("or");
	}

	isFilter() : boolean
	{
		return(!(this.filter instanceof FilterStructure));
	}

	getFilter() : Filter
	{
		return(this.filter as Filter);
	}

	getFilterStructure() : FilterStructure
	{
		return(this.filter as FilterStructure);
	}

	async matches(record:Record) : Promise<boolean>
	{
		return(this.filter.evaluate(record));
	}
}

export class Printable
{
	entries:any[] = [];
}