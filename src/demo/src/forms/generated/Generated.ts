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

import content from './Generated.html';

import { Alert, Block, EventType, FormEvent, datasource, formevent } from 'forms42core';
import { BaseForm } from '../../BaseForm';
import { GeneratedDS } from './GeneratedDS';


@datasource("employees",GeneratedDS)

export class Generated extends BaseForm
{
	constructor()
	{
		super(content);
		this.title = "Generated";
	}

	@formevent({type: EventType.OnFetch})
	public async jonas(event:FormEvent) : Promise<boolean>
	{
		let emp:Block = this.getBlock(event.block);
		emp.setValue("name",emp.getValue("first_name")+" "+emp.getValue("last_name"))
		return(true);
	}

	@formevent({type: EventType.WhenValidateField, field: "salary"})
	public async salary(event:FormEvent) : Promise<boolean>
	{
		let emp:Block = this.getBlock(event.block);
		let salary:number = emp.getValue("salary");

		if (salary > 10000)
		{
			Alert.warning("Not allowed in this company","Salary");
			return(false);
		}

		return(true);
	}

}