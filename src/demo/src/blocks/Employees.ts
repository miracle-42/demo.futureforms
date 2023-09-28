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

import { WorkDays } from '../dates/WorkDays';
import { Jobs as JobTable } from '../datasources/database/Jobs';
import { Employees as EmployeeTable } from "../datasources/database/Employees";
import { Departments as DepartmentTable } from '../datasources/database/Departments';
import { Block, DatabaseResponse, EventType, Form, formevent, FormEvent } from "forms42core";

export class Employees extends Block
{
	constructor(form:Form, name:string)
	{
		super(form,name);
		this.datasource = new EmployeeTable();
		this.setDateConstraint(new WorkDays(),"hire_date");
	}

	@formevent({type: EventType.OnCreateRecord})
	public async setDefaults() : Promise<boolean>
	{
		let today:Date = new Date();
		today.setHours(0,0,0,0);

		this.setValue("hire_date",today);
		return(true);
	}

	@formevent({type: EventType.OnFetch})
	public async getDerivedFields() : Promise<boolean>
	{
		let code:string = null;
		let title:string = null;
		let field:string = null;

		field = "job_title";

		if (this.hasField(field))
		{
			code = this.getValue("job_id");

			if (code != null)
				title = await JobTable.getTitle(code);

			this.setValue(field,title);
		}

		field = "department_name";

		if (this.hasField(field))
		{
			code = this.getValue("department_id");

			if (code != null)
				title = await DepartmentTable.getTitle(code);

			this.setValue(field,title);
		}

		return(true);
	}

	@formevent({type: EventType.WhenValidateField, field: "salary"})
	public async validateSalary() : Promise<boolean>
	{
		let code:string = this.getValue("job_id");
		let salary:number = this.getValue("salary");

		if (code == null || salary == null)
			return(true);

		let limit:number[] = await JobTable.getSalaryLimit(code);

		if (limit[0] != null)
		{
			this.setValid("salary",true);
			this.setValid("job_id",true);
		}

		if (salary < limit[0]*0.75 || salary > 1.25*limit[1])
		{
			this.warning("Salary is out of range ("+(limit[0]*0.75)+" - "+(1.25*limit[1])+" ) ","Validate Salary");
			return(false);
		}

		if (salary < limit[0] || salary > limit[1])
		{
			this.warning("Salary should be between "+limit[0]+" and "+limit[1],"Validate Salary");

			this.getRecord().setStyle("salary","color","deeppink");
			this.getRecord().setStyle("last_name","color","deeppink");
			this.getRecord().setStyle("first_name","color","deeppink");
		}
		else
		{
			this.getRecord().clearProperties("salary");
			this.getRecord().clearProperties("last_name");
			this.getRecord().clearProperties("first_name");
		}

		return(true);
	}

	@formevent({type: EventType.WhenValidateField, field: "job_id"})
	public async validateJob(event:FormEvent) : Promise<boolean>
	{
		let success:boolean = true;
		let field:string = "job_title";
		let code:string = this.getValue("job_id");

		if (code == null)
		{
			if (this.hasField(field))
				this.setValue(field,null);

			return(true);
		}

		let title:string = await JobTable.getTitle(code);

		if (this.hasField(field))
			this.setValue(field,title);

		if (event.type == EventType.WhenValidateField && !this.queryMode())
		{
			if (title == null)
			{
				this.form.warning("Invalid job code","Employees");
				return(false);
			}

			success = await this.validateSalary();
		}

		return(success);
	}

	@formevent({type: EventType.WhenValidateField, field: "department_id"})
	public async validateDepartment(event:FormEvent) : Promise<boolean>
	{
		let field:string = "department_name";
		let code:string = this.getValue("department_id");

		if (code == null)
		{
			if (this.hasField(field))
				this.setValue(field,null);

			return(true);
		}

		let title:string = await DepartmentTable.getTitle(code);

		if (this.hasField(field))
			this.setValue(field,title);

		if (event.type == EventType.WhenValidateField && !this.queryMode())
		{
			if (title == null)
			{
				this.form.warning("Invalid Department Id","Employees");
				return(false);
			}
		}

		return(true);
	}

	@formevent({type: EventType.PostInsert})
	public async setPrimaryKey() : Promise<boolean>
	{
		let response:DatabaseResponse = this.getRecord().response;
		this.setValue("employee_id",response.getValue("employee_id"));
		return(true);
	}
}