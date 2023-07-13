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

import { Jobs as JobBlock} from "./Jobs";
import { WorkDays } from '../dates/WorkDays';
import { Departments as DepartmentBlock} from "./Departments";
import { Jobs as JobTable } from '../datasources/database/Jobs';
import { Employees as EmployeeTable } from "../datasources/database/Employees";
import { Departments as DepartmentTable } from '../datasources/database/Departments';
import { BindValue, Block, DatabaseResponse, EventType, FieldProperties, Filter, Filters, FilterStructure, Form, formevent, FormEvent, ListOfValues } from "forms42core";

export class Employees extends Block
{
	constructor(form:Form, name:string)
	{
		super(form,name);
		this.datasource = new EmployeeTable();
		this.setDateConstraint(new WorkDays(),"hire_date");
	}

	@formevent({type: EventType.OnNewRecord})
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
			let props:FieldProperties = null;
			this.form.warning("Salary should be between "+limit[0]+" and "+limit[1],"Validation");

			props = this.getRecord().getProperties("last_name");
			this.getRecord().setProperties(props.setStyle("color","deeppink"),"last_name");

			props = this.getRecord().getProperties("first_name");
			this.getRecord().setProperties(props.setStyle("color","deeppink"),"first_name");

			props = this.getRecord().getProperties("salary");
			this.getRecord().setProperties(props.setStyle("color","deeppink"),"salary");
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

	public setJobLov(fields:string|string[]) : void
	{
		this.setListOfValues(JobBlock.getJobLov(),fields);
	}

	public setDepartmentLov(fields:string|string[]) : void
	{
		this.setListOfValues(DepartmentBlock.getDepartmentLov(),fields);
	}

	public static getManagerLov() : ListOfValues
	{
		let source:JobTable = null;
		let bindvalues:BindValue[] = [];
		let filter:FilterStructure = null;

		let fnameflt:Filter = Filters.ILike("first_name");
		let lnameflt:Filter = Filters.ILike("last_name");

		filter = new FilterStructure().and(fnameflt).or(lnameflt);
		source = new EmployeeTable().addFilter(filter);

		bindvalues.push(fnameflt.getBindValue());
		bindvalues.push(lnameflt.getBindValue());

		let lov:ListOfValues =
		{
			title: "Employees",
			filterPostfix: "%",
			datasource: source,
			inReadOnlyMode: true,
			bindvalue: bindvalues,
			displayfields: ["first_name","last_name"],
			sourcefields: "employee_id",
			targetfields: "manager_id",
		}

		return(lov);
	}
}