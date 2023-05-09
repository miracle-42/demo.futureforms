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

import content from './Locations.html';

import { BaseForm } from "../../BaseForm";
import { Countries } from '../../blocks/Countries';
import { Block, datasource, EventType, formevent, FormEvent, ListOfValues } from "forms42core";
import { Locations as Locationdata, CountryNameFilter } from "../../datasources/database/Locations";

@datasource("Locations",Locationdata)

export class Locations extends BaseForm
{
	constructor()
	{
		super(content);
		this.title = "Locations";

		let lov:ListOfValues = Countries.getCountryLov();
		this.setListOfValues(lov,"Locations",["country_id","country_name"]);

		this.addEventListener(this.preQuery,{type: EventType.PreQuery})
	}

	public async preQuery() : Promise<boolean>
	{
		let loc:Block = this.getBlock("Locations")
		let country:string = loc.getValue("country_name");

		if (country != null)
		{
			loc.filter.delete("country_name");
			loc.filter.and(new CountryNameFilter("country_name").setConstraint(country));
		}

		return(true);
	}

	@formevent
	([
		{type: EventType.OnFetch},
		{type: EventType.WhenValidateField, field: "country_id"}
	])

	public async setCountryName(event:FormEvent) : Promise<boolean>
	{
		let code:string = this.getValue("Locations","country_id");
		let country:string = await Countries.getCountryName(code);

		this.setValue("Locations","country_name",country);

		if (event.type == EventType.WhenValidateField)
		{
			if (country == null)
			{
				this.warning("Invalid country code","Countries");
				return(false);
			}
		}

		return(true);
	}
}