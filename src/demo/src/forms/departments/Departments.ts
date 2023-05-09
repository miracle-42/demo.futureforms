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

import content from './Departments.html';

import { BaseForm } from "../../BaseForm";
import { Sorter } from '../../utils/Sorter';
import { Departments as DepartmentBlock } from "../../blocks/Departments";


export class Departments extends BaseForm
{
	private sorter:Sorter = null;
	private dept:DepartmentBlock = new DepartmentBlock(this,"Departments");

	constructor()
	{
		super(content);
		this.title = "Departments";

		this.dept.setManagerLov("manager");
		this.dept.setLocationLov("location");

		this.sorter = new Sorter(this.dept,"department_id");
	}

	public sort(field:string) : void
	{
		this.sorter.column = field;
	}
}