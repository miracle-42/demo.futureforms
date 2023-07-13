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

import content from './MasterDetail.html';

import { Key } from 'forms42core';
import { BaseForm } from "../../BaseForm";
import { Sorter } from '../../utils/Sorter';
import { Employees } from "../../blocks/Employees";
import { Departments } from '../../blocks/Departments';


export class MasterDetail extends BaseForm
{
	private emp:Employees = new Employees(this,"Employees");
	private dept:Departments = new Departments(this,"Departments");

	private empsort:Sorter = new Sorter(this.emp,"last_name");
	private deptsort:Sorter = new Sorter(this.dept,"department_id");

	constructor()
	{
		super(content);
		this.title = "Departments/Employees";

		this.dept.setManagerLov("manager");
		this.dept.setLocationLov("location");

		this.emp.setJobLov(["job_id","job_title"]);
		this.emp.setDepartmentLov(["department_id","department_name"]);

		let empkey:Key = new Key("employees","department_id");
		let deptkey:Key = new Key("departments","department_id");

		this.link(deptkey,empkey);
	}

	public sort(block:string, field:string) : void
	{
		if (block == "emp") this.empsort.column = field;
		if (block == "dept") this.deptsort.column = field;
	}
}