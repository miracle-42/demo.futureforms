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

import { Locations as LocationTable } from "../datasources/database/Locations";
import { BindValue, Block, Filter, Filters, FilterStructure, Form, ListOfValues } from "forms42core";

export class Locations extends Block
{
	constructor(form:Form, name:string)
	{
		super(form,name);
		this.datasource = new LocationTable();
	}

	public static getLocationLov() : ListOfValues
	{
		let source:LocationTable = null;
		let bindvalues:BindValue[] = [];
		let filter:FilterStructure = null;

		let cityflt:Filter = Filters.ILike("city");

		filter = new FilterStructure().and(cityflt);
		source = new LocationTable().addFilter(filter);

		bindvalues.push(cityflt.getBindValue());

		let lov:ListOfValues =
		{
			title: "Locations",
			filterPostfix: "%",
			datasource: source,

			inQueryMode: true,
			inReadOnlyMode: true,
			
			bindvalue: bindvalues,
			displayfields: ["city","street_address"],
			sourcefields: "loc_id",
			targetfields: "loc_id",
		}

		return(lov);
	}
}