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

import { Block, EventType, Form, Level, formevent } from "forms42core";
import { Employees as EmployeeTable} from "../datasources/database/Employees";
import { Locations as LocationTable } from "../datasources/database/Locations";
import { Departments as DepartmentTable } from "../datasources/database/Departments";

export class Departments extends Block
{
	constructor(form:Form, name:string)
	{
		super(form,name);
		this.datasource = new DepartmentTable();
	}

	@formevent({type: EventType.OnFetch})
	public async getDerivedFields() : Promise<boolean>
	{
		let id:number = null;
		let field:string = null;
		let manager:string = null;
		let location:string = null;

		field = "manager";
		if (this.hasField(field))
		{
			id = this.getValue("manager_id");

			if (id != null)
				manager = await EmployeeTable.getName(id);

			this.setValue(field,manager);
		}

		field = "location";
		if (this.hasField(field))
		{
			id = this.getValue("loc_id");

			if (id != null)
				location = await LocationTable.getLocation(id);

			this.setValue(field,location);
		}

		return(true);
	}

	@formevent({type: EventType.WhenValidateField, field: "manager_id"})
	public async validateManager() : Promise<boolean>
	{
		let id:number = null;
		let manager:string = null;
		let field:string = "manager";

		id = this.getValue("manager_id");

		if (id != null)
		{
			manager = await EmployeeTable.getName(id);

			if (this.hasField(field))
				this.setValue(field,manager);

			if (manager == null && !this.queryMode())
			{
				this.form.alert("Invalid manager id","Departments",Level.warn);
				return(false);
			}
		}
		else
		{
			if (this.hasField(field))
				this.setValue(field,manager);
		}

		return(true);
	}

	@formevent({type: EventType.WhenValidateField, field: "loc_id"})
	public async validateLocation() : Promise<boolean>
	{
		let id:number = null;
		let location:string = null;
		let field:string = "location";

		id = this.getValue("loc_id");

		if (id != null)
		{
			location = await LocationTable.getLocation(id);

			if (this.hasField(field))
				this.setValue(field,location);

			if (location == null && !this.queryMode())
			{
				this.form.alert("Invalid location id","Departments",Level.warn);
				return(false);
			}
		}
		else
		{
			if (this.hasField(field))
				this.setValue(field,location);
		}

		return(true);
	}
}