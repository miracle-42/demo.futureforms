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

import { BindValue, Block, Filter, Filters, FilterStructure, Form, ListOfValues } from "forms42core";
import { Countries as CountryTable } from "../datasources/database/Countries";

export class Countries extends Block
{
	constructor(form:Form, name:string)
	{
		super(form,name);
		this.datasource = new CountryTable();
	}

	public static async getCountryName(id:string) : Promise<string>
	{
		return(CountryTable.getName(id));
	}

	public static getCountryLov() : ListOfValues
	{
		let source:CountryTable = null;
		let bindvalues:BindValue[] = [];
		let filter:FilterStructure = null;

		let idflt:Filter = Filters.ILike("country_id");
		let nameflt:Filter = Filters.ILike("country_name");

		filter = new FilterStructure().and(idflt).or(nameflt);
		source = new CountryTable().addFilter(filter);

		bindvalues.push(idflt.getBindValue());
		bindvalues.push(nameflt.getBindValue());

		let lov:ListOfValues =
		{
			filterPostfix: "%",
			datasource: source,
			title: "Countries",
			bindvalue: bindvalues,
			displayfields: "country_name",
			filterInitialValueFrom: "country_name",
			sourcefields: ["country_id","country_name"],
			targetfields: ["country_id","country_name"],
		}

		return(lov);
	}
}