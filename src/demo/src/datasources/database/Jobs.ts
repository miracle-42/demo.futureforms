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

import { FormsModule } from "../../FormsModule";
import { BindValue, DatabaseTable, DataType, ParameterType, SQLStatement, StoredProcedure } from "forms42core";

export class Jobs extends DatabaseTable
{
	constructor()
	{
		super(FormsModule.DATABASE,"jobs");

		this.sorting = "job_id";
		this.primaryKey = "job_id";
	}

	public static async getTitle(id:string) : Promise<string>
	{
		let row:any[] = null;
		let stmt:SQLStatement = new SQLStatement(FormsModule.DATABASE);

		stmt.sql =
		`
			select job_title
			from jobs
			where job_id = :id
		`;

		stmt.addBindValue(new BindValue("id",id,DataType.string));

		let success:boolean = await stmt.execute();
		if (success) row = await stmt.fetch();

		if (row)	return(row[0]);
		return(null);
	}

	public static async getSalaryLimit(job:string) : Promise<number[]>
	{
		let limit:number[] = [0,0];
		let func:StoredProcedure = new StoredProcedure(FormsModule.DATABASE);

		func.setName("getSalaryLimit");

		func.addParameter("job",job,DataType.varchar);
		func.addParameter("min",0,DataType.integer,ParameterType.inout);
		func.addParameter("max",0,DataType.integer,ParameterType.inout);

		let success:boolean = await func.execute();
		if (!success) console.log(func.error());

		if (success)
		{
			limit[0] = func.getOutParameter("min");
			limit[1] = func.getOutParameter("max");
		}

		return(limit);
	}
}