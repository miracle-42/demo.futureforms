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

import { BaseForm } from './BaseForm';
import { Minimized } from './Minimized';

import { CanvasHeader } from './fragments/CanvasHeader';
import { PageHeader } from './fragments/PageHeader';
import { PageFooter } from './fragments/PageFooter';

import { Menu as TopMenu } from './menus/topmenu/Menu';
import { Menu as LeftMenu } from './menus/leftmenu/Menu';

import { Fields } from './fields/Fields';
import { Jobs } from './forms/jobs/Jobs';
import { Countries } from './forms/countries/Countries';
import { Locations } from './forms/locations/Locations';
import { Employees } from './forms/employees/Employees';
import { Departments } from './forms/departments/Departments';
import { MasterDetail } from './forms/masterdetail/MasterDetail';
import { PhoneBookMembased } from './forms/phonenook/PhoneBookMembased';

import { JobList } from './lists/JobList';
import { ManagerList } from './lists/ManagerList';
import { CountryList } from './lists/CountryList';
//import { CountryList2 } from './lists/CountryList2';
import { LocationList } from './lists/LocationList';
import { DepartmentsList } from './lists/DepartmentsList';

import { AppHeader } from './tags/AppHeader';
import { LinkMapper } from './fields/LinkMapper';
import { TrueFalseMapper } from './fields/TrueFalseMapper';

import { KeyMapPage, FormsPathMapping, FormsModule as FormsCoreModule, FlushStrategy, KeyMap, FormEvent, EventType, DatabaseConnection as Connection, FormProperties, UsernamePassword, Form, AlertForm, InternalFormsConfig, ConnectionScope } from 'forms42core';
import { Generated } from './forms/generated/Generated';

@FormsPathMapping(
	[
		{class: Fields, path: "/forms/fields"},

		{class: JobList, path: "/lovs/jobs"},
		{class: ManagerList, path: "/lovs/managers"},
		{class: CountryList, path: "/lovs/countries"},
		{class: LocationList, path: "/lovs/locations"},
		{class: DepartmentsList, path: "/lovs/departments"},

		{class: Jobs, path: "/forms/jobs"},
		{class: Countries, path: "/forms/countries"},
		{class: Locations, path: "/forms/locations"},
		{class: Employees, path: "/forms/employees"},
		{class: Generated, path: "/forms/generated"},
		{class: Departments, path: "/forms/departments"},
		{class: MasterDetail, path: "/forms/masterdetail"},

		{class: PhoneBookMembased, path: "/forms/phonebook"},

		{class: CanvasHeader, path: "/html/canvasheader"},
		{class: PageHeader, path: "/html/pageheader"},
		{class: PageFooter, path: "/html/pagefooter"},
		{class: LinkMapper, path: "/mappers/linkmapper"},
		{class: TrueFalseMapper, path: "/mappers/truefalse"},
	]
)

export class FormsModule extends FormsCoreModule
{
	public topmenu:TopMenu = null;
	public leftmenu:LeftMenu = null;

	public list:Minimized = null;
	public static DATABASE:Connection = null;

	private jobs:KeyMap = new KeyMap({key: 'J', ctrl: true});
	private fields:KeyMap = new KeyMap({key: 'F', ctrl: true});
	private countries:KeyMap = new KeyMap({key: 'C', ctrl: true});
	private locations:KeyMap = new KeyMap({key: 'L', ctrl: true});
	private phonebook:KeyMap = new KeyMap({key: 'P', ctrl: true});
	private employees:KeyMap = new KeyMap({key: 'E', ctrl: true});
	private departments:KeyMap = new KeyMap({key: 'D', ctrl: true});
	private masterdetail:KeyMap = new KeyMap({key: 'M', ctrl: true});

	constructor()
	{
		super();

		// Be aware of FormProperties
		FormProperties.DateFormat = "DD-MM-YYYY";

		// Be aware of InternalFormsConfig
		InternalFormsConfig.CloseButtonText = "&#215;";

		// Demo custom tag
		FormProperties.TagLibrary.set("AppHeader",AppHeader);
		FormsModule.setRootElement(document.body.querySelector("#forms"));

		this.parse();
		this.list = new Minimized();

		// Menues
		this.topmenu = new TopMenu();
		this.leftmenu = new LeftMenu();
		FormsModule.updateKeyMap(keymap);

		Connection.TRXTIMEOUT = 240;
		Connection.CONNTIMEOUT = 120;

		let port:number = +window.location.port;
		// Hack. If page origins from live-server, then assume OpenRestDB is on localhost
		let backend:string = (port >= 5500 && port < 5600) ? "http://localhost:9002" : null;

		// In case loadbalancer/multi-site, get up to last /
		if (!backend) backend = document.documentURI.match(/^.*\//)[0];

		FormsModule.DATABASE = new Connection(backend);
		FormsModule.DATABASE.scope = ConnectionScope.transactional;

		FormsModule.defaultFlushStrategy = FlushStrategy.Block;

		let infomation:HTMLElement = document.querySelector(".infomation");
		infomation.appendChild(KeyMapPage.show(keymap));

		this.addEventListener(this.close,{type: EventType.Key, key: keymap.close});
		this.addEventListener(this.login,{type: EventType.Key, key: keymap.login});

		this.addEventListener(this.showTopMenu,{type: EventType.Key, key: keymap.topmenu});
		this.addEventListener(this.showLeftMenu,{type: EventType.Key, key: keymap.leftmenu});

		this.addEventListener(this.open,
		[
			{type:EventType.Key,key:this.jobs},
			{type:EventType.Key,key:this.fields},
			{type:EventType.Key,key:this.countries},
			{type:EventType.Key,key:this.locations},
			{type:EventType.Key,key:this.phonebook},
			{type:EventType.Key,key:this.employees},
			{type:EventType.Key,key:this.departments},
			{type:EventType.Key,key:this.masterdetail}
		]);

		FormsModule.OpenURLForm();
	}

	private async open(event:FormEvent) : Promise<boolean>
	{
		if (event.key == this.jobs)
			FormsModule.showform(Jobs);

		if (event.key == this.fields)
			FormsModule.showform(Fields);

		if (event.key == this.employees)
			FormsModule.showform(Employees);

		if (event.key == this.departments)
			FormsModule.showform(Departments);

		if (event.key == this.countries)
			FormsModule.showform(Countries);

		if (event.key == this.locations)
			FormsModule.showform(Locations);

		if (event.key == this.phonebook)
			FormsModule.showform(PhoneBookMembased);

		if (event.key == this.masterdetail)
			FormsModule.showform(MasterDetail);

		return(true);
	}

	private logontrg:object = null;
	public async login() : Promise<boolean>
	{
		let usrpwd:Form = await FormsModule.showform(UsernamePassword);
		this.logontrg = this.addFormEventListener(usrpwd,this.connect,{type: EventType.OnCloseForm});
		return(true);
	}

	public async logout() : Promise<boolean>
	{
		if (!FormsModule.DATABASE.connected())
			return(true);

		let forms:Form[] = FormsModule.getRunningForms();

		for (let i = 0; i < forms.length; i++)
		{
			if (!await forms[i].clear())
				return(false);
		}

		return(FormsModule.DATABASE.disconnect());
	}

	public async close() : Promise<boolean>
	{
		let form:Form = FormsModule.getCurrentForm();
		if (form != null) return(form.close());
		return(true);
	}

	private async connect(event:FormEvent) : Promise<boolean>
	{
		let form:UsernamePassword = event.form as UsernamePassword;
		FormsModule.removeEventListener(this.logontrg);

		if (form.accepted && form.username && form.password)
		{
			if (!await FormsModule.DATABASE.connect(form.username,form.password))
			{
				await FormsModule.sleep(2000);

				let forms:Form[] = FormsModule.getRunningForms();

				for (let i = 0; i < forms.length; i++)
				{
					if (forms[i] instanceof AlertForm)
						await forms[i].close(true);
				}

				this.login();
				return(true);
			}

			BaseForm.connectNeddle();
		}

		return(true);
	}

	public async showTopMenu() : Promise<boolean>
	{
		this.topmenu.focus();
		return(true);
	}

	public async showLeftMenu() : Promise<boolean>
	{
		this.leftmenu.focus();
		return(true);
	}
}

export class keymap extends KeyMap
{
	public static close:KeyMap = new KeyMap({key: 'w', ctrl: true},"close","close window");
	public static login:KeyMap = new KeyMap({key: 'l', ctrl: true},"login","show login form");
	public static topmenu:KeyMap = new KeyMap({key: 'm', ctrl: true},"top-menu","go to top menu");
	public static leftmenu:KeyMap = new KeyMap({key: 'f', ctrl: true},"left-menu","go to left menu");
}