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
import { Field } from "./fields/Field.js";
import { Properties } from "../application/Properties.js";
import { FieldInstance } from "./fields/FieldInstance.js";
import { RowIndicator } from "../application/tags/RowIndicator.js";
import { FieldState } from "./fields/interfaces/FieldImplementation.js";

export enum Status
{
	na,
	qbe,
	new,
	update,
	insert,
	delete
}


export class Row
{
	private block$:Block = null;
	private rownum$:number = null;
	private validated$:boolean = true;
	private indicator$:boolean = false;
	private status$:Status = Status.na;
	private indicators:RowIndicator[] = [];
	private instances:FieldInstance[] = [];
	private state$:FieldState = FieldState.DISABLED;
	private fields:Map<string,Field> = new Map<string,Field>();

	constructor(block:Block, rownum:number)
	{
		this.block$ = block;
		this.rownum$ = rownum;
	}

	public get block() : Block
	{
		return(this.block$);
	}

	public get exist() : boolean
	{
		return(this.status != Status.na);
	}

	public get status() : Status
	{
		if (this.rownum >= 0) return(this.status$);
		else return(this.block.getCurrentRow().status$);
	}

	public set status(status:Status)
	{
		if (this.rownum >= 0) this.status$ = status;
		else this.block.getCurrentRow().status$ = status;
	}

	public get rownum() : number
	{
		return(this.rownum$);
	}

	public set rownum(rownum:number)
	{
		if (rownum == this.rownum$)
			return;

		this.rownum$ = rownum;

		this.indicators.forEach((ind) =>
		{ind.element.setAttribute("row",rownum+"")})

		this.getFields().forEach((fld) =>
		{
			fld.getInstances().forEach((inst) =>
			{inst.properties.row = rownum;})
		});
	}

	public setSingleRow() : void
	{
		this.rownum$ = 0;

		this.indicators.forEach((ind) =>
		{ind.element.setAttribute("row","0")})

		this.getFields().forEach((fld) =>
		{
			fld.getInstances().forEach((inst) =>
			{inst.properties.row = 0;})
		});
	}

	public setIndicator(ind:RowIndicator) : void
	{
		this.indicators.push(ind);
	}

	public setIndicatorState(state:string,failed:boolean) : void
	{
		let mode:string = "";
		if (this.rownum < 0) return;

		this.indicators.forEach((ind) =>
		{
			switch(this.status)
			{
				case Status.na : mode = "na"; break;
				case Status.qbe : mode = "query"; break;
				case Status.new : mode = "insert"; break;
				case Status.insert : mode = "insert"; break;
				case Status.update : mode = "update"; break;
				case Status.delete : mode = "deleted"; break;
			}

			ind.element.setAttribute("mode",mode);
			ind.element.setAttribute("state",state);

			if (failed) ind.element.classList.add("failed");
			else ind.element.classList.remove("failed");
		})
	}

	public activateIndicators(flag:boolean) : void
	{
		if (flag && this.indicator$) return;
		if (!flag && !this.indicator$) return;

		this.indicator$ = flag;

		this.indicators.forEach((ind) =>
		{
			if (flag) ind.element.classList.add(Properties.Classes.RowIndicator);
			else      ind.element.classList.remove(Properties.Classes.RowIndicator);
		})
	}

	public finalize() : void
	{
		this.getFields().forEach((fld) =>
		{
			fld.getInstances().forEach((inst) =>
			{inst.finalize();})
		});
	}

	public getFieldState() : FieldState
	{
		return(this.state$);
	}

	public setFieldState(state:FieldState) : void
	{
		this.state$ = state;
		if (state == FieldState.DISABLED) this.status$ = Status.na;
		this.getFieldInstances().forEach((inst) => {inst.setFieldState(state)});
	}

	public get validated() : boolean
	{
		if (this.status == Status.new) return(false);
		if (this.rownum >= 0) return(this.validated$);
		else return(this.block.getCurrentRow().validated$);
	}

	public set validated(flag:boolean)
	{
		this.validated$ = flag;

		if (flag)
		{
			this.getFieldInstances().forEach((inst) =>
				{inst.valid = true;})

			if (this.rownum == this.block.row)
			{
				this.block.getRow(-1)?.getFieldInstances().forEach((inst) =>
					{inst.valid = true;})
			}
		}
	}

	public invalidate() : void
	{
		if (this.rownum >= 0) this.validated = false;
		else this.block.getCurrentRow().validated = false;
		if (this.status == Status.new) this.status = Status.insert;
	}

	public async validate() : Promise<boolean>
	{
		if (this.validated)
			return(true);

		let valid:boolean = true;
		let fields:Field[] = this.getFields();

		for (let i = 0; i < fields.length; i++)
			if (!fields[i].valid) valid = false;

		if (this.rownum >= 0)
		{
			let curr:Row = this.block.getRow(-1);

			if (curr != null)
			{
				fields = curr.getFields();

				for (let i = 0; i < fields.length; i++)
					if (!fields[i].valid) valid = false;
			}
		}
		else
		{
			fields = this.block.getCurrentRow().getFields();

			for (let i = 0; i < fields.length; i++)
				if (!fields[i].valid) valid = false;
		}

		if (!valid) return(false);
		this.validated = await this.block.model.validateRecord();

		return(this.validated);
	}

	public addField(field:Field) : void
	{
		this.fields.set(field.name,field);
	}

	public addInstance(instance:FieldInstance) : void
	{
		this.instances.push(instance);
	}

	public setInstances(instances:FieldInstance[]) : void
	{
		this.instances = instances;
	}

	public focusable() : boolean
	{
		for (let i = 0; i < this.instances.length; i++)
		{
			if (this.instances[i].focusable())
				return(true);
		}

		return(false);
	}

	public getFieldIndex(inst:FieldInstance) : number
	{
		return(this.getFieldInstances().indexOf(inst));
	}

	public getFieldByIndex(idx:number) : FieldInstance
	{
		return(this.getFieldInstances()[idx]);
	}

	public prevField(inst:FieldInstance) : FieldInstance
	{
		let prev:number = -1;
		let pos:number = this.instances.length - 1;

		if (inst != null)
			pos = this.instances.indexOf(inst) - 1;

		for (let i = pos; i >= 0; i--)
		{
			if (this.instances[i].focusable())
			{
				prev = i;
				break;
			}
		}

		if (prev < 0)
		{
			if (this.rownum >= 0)
			{
				let current:Row = this.block.getRow(-1);

				if (current != null && current.focusable())
					return(current.prevField(null));
			}
			else
			{
				let mrow:Row = this.block.getCurrentRow();

				if (mrow != null && mrow.focusable())
					return(mrow.prevField(null));
			}
		}

		if (prev < 0)
		{
			for (let i = this.instances.length - 1; i >= 0; i--)
			{
				if (this.instances[i].focusable())
					return(this.instances[i]);
			}
		}

		return(this.instances[prev]);
	}


	public nextField(inst:FieldInstance) : FieldInstance
	{
		let pos:number = 0;
		let next:number = -1;

		if (inst != null)
			pos = this.instances.indexOf(inst) + 1;

		for (let i = pos; i < this.instances.length; i++)
		{
			if (this.instances[i].focusable())
			{
				next = i;
				break;
			}
		}

		if (next < 0)
		{
			if (this.rownum >= 0)
			{
				let current:Row = this.block.getRow(-1);

				if (current != null && current.focusable())
					return(current.nextField(null));
			}
			else
			{
				let mrow:Row = this.block.getCurrentRow();

				if (mrow != null && mrow.focusable())
					return(mrow.nextField(null));
			}
		}

		if (next < 0)
		{
			for (let i = 0; i < this.instances.length; i++)
			{
				if (this.instances[i].focusable())
					return(this.instances[i]);
			}
		}

		return(this.instances[next]);
	}

	public getField(name:string) : Field
	{
		return(this.fields.get(name));
	}

	public getFields() : Field[]
	{
		let fields:Field[] = [];

		this.fields.forEach((fld) =>
		{fields.push(fld)});

		return(fields);
	}

	public clear() : void
	{
		this.activateIndicators(false);
		this.setIndicatorState("na",false);
		this.getFields().forEach((fld) => {fld.clear()});
	}

	public setState(state:Status) : void
	{
		this.status = state;

		this.instances.forEach((inst) =>
			{inst.resetProperties()})
	}

	public distribute(field:string, value:any, dirty:boolean) : void
	{
		this.fields.get(field)?.distribute(null,value,dirty);
	}

	public swapInstances(inst1:FieldInstance, inst2:FieldInstance) : void
	{
		let instances:FieldInstance[] = [];

		for (let i = 0; i < this.instances.length; i++)
		{
			switch(this.instances[i])
			{
				case inst1: instances.push(inst2); break;
				case inst2: instances.push(inst1); break;
				default: instances.push(this.instances[i]);
			}
		}

		this.instances = instances;
	}

	public getFieldInstances() : FieldInstance[]
	{
		let instances:FieldInstance[] = [];

		this.getFields().forEach((field) =>
		{instances.push(...field.getInstances());});

		return(instances);
	}

	public getFirstInstance(status:Status) : FieldInstance
	{
		let flds:Field[] = this.getFields();

		for (let f = 0; f < flds.length; f++)
		{
			for (let i = 0; i < flds[f].getInstances().length; i++)
			{
				let inst:FieldInstance = flds[f].getInstance(i);
				if (inst.focusable(status)) return(inst);
			}
		}

		return(null);
	}

	public getFirstEditableInstance(status:Status) : FieldInstance
	{
		let flds:Field[] = this.getFields();

		for (let f = 0; f < flds.length; f++)
		{
			for (let i = 0; i < flds[f].getInstances().length; i++)
			{
				let inst:FieldInstance = flds[f].getInstance(i);
				if (inst.editable(status)) return(inst);
			}
		}

		return(null);
	}
}