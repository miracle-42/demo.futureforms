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

import { FormsModule, StaticMenu, StaticMenuEntry } from "forms42core";

export class FormList extends StaticMenu
{
	constructor()
	{
		super(FormList.data());
	}

	public async execute(path:string): Promise<boolean>
	{
		await FormsModule.get().showform(path);
		return(true);
	}

	private static data() : StaticMenuEntry
	{
		return(
		{
			id: "demo",
			display: "Demo",
			entries:
			[
				{
					id: "countries",
					display: "Countries",
					command: "/forms/countries"
				}
				,
				{
					id: "locations",
					display: "Locations",
					command: "/forms/locations"
				}
				,
				{
					id: "jobs",
					display: "Jobs",
					command: "/forms/jobs"
				}
				,
				{
					id: "departments",
					display: "Departments",
					command: "/forms/departments"
				}
				,
				{
					id: "employees",
					display: "Employees",
					command: "/forms/employees"
				}
				,
				{
					id: "masterdetail",
					display: "MasterDetail",
					command: "/forms/masterdetail"
				}
				,
				{
					id: "nobase",
					display: "Database less",
					entries:
					[
						{
							id: "phonebook",
							display: "1 Phone Book",
							command: "/forms/PhoneBook"
						}
						,
						{
							id: "fields",
							display: "2 Fieldtypes",
							command: "/forms/Fields"
						}
					]
				}
			]
		});
	}
}