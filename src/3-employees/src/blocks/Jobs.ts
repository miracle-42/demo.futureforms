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

import { Jobs as JobTable } from "../datasources/database/Jobs";
import { BindValue, Block, Filter, Filters, FilterStructure, Form, ListOfValues } from "forms42core";

export class Jobs extends Block
{
	constructor(form:Form, name:string)
	{
		super(form,name);
		this.datasource = new JobTable();
	}

	public static getJobLov() : ListOfValues
	{
		let source:JobTable = null;
		let bindvalues:BindValue[] = [];
		let filter:FilterStructure = null;

		let idflt:Filter = Filters.ILike("job_id");
		let titleflt:Filter = Filters.ILike("job_title");

		filter = new FilterStructure().and(idflt).or(titleflt);
		source = new JobTable().addFilter(filter);

		bindvalues.push(idflt.getBindValue());
		bindvalues.push(titleflt.getBindValue());

		let lov:ListOfValues =
		{
			title: "Jobs",
			inQueryMode: true,
			filterPostfix: "%",
			datasource: source,
			bindvalue: bindvalues,
			displayfields: "job_title",
			filterInitialValueFrom: "job_id",
			sourcefields: ["job_id","job_title"],
			targetfields: ["job_id","job_title"],
		}

		return(lov);
	}
}