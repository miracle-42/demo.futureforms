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

import { Minimized } from './Minimized';

import { FormHeader } from './fragments/FormHeader';
import { PageHeader } from './fragments/PageHeader';
import { PageFooter } from './fragments/PageFooter';

import { Menu as TopMenu } from './menus/topmenu/Menu';
import { Menu as LeftMenu } from './menus/leftmenu/Menu';
import { Menu as RightClick } from './menus/rightclick/Menu';

import { Countries } from './forms/countries/Countries';

import { AppHeader } from './tags/AppHeader';

import { KeyMapPage, FormsPathMapping, FormsModule as FormsCoreModule, KeyMap, FormEvent, EventType, DatabaseConnection as Connection, FormProperties, UsernamePassword, Form, AlertForm, MouseMap } from 'forms42core';

@FormsPathMapping(
	[
		{class: Countries, path: "/forms/countries"},
		{class: FormHeader, path: "/html/formheader"},
		{class: PageHeader, path: "/html/pageheader"},
		{class: PageFooter, path: "/html/pagefooter"},
	]
)

export class FormsModule extends FormsCoreModule
{
	public topmenu:TopMenu = null;
	public leftmenu:LeftMenu = null;
	public list:Minimized = null;
	public static DATABASE:Connection = null;
	private countries:KeyMap = new KeyMap({key: 'C', ctrl: true});

	constructor()
	{
		super();

		// Demo cutom tag
		FormProperties.TagLibrary.set("AppHeader",AppHeader);

		this.parse();
		this.list = new Minimized();

		// Menues
		this.topmenu = new TopMenu();
		this.leftmenu = new LeftMenu();

		this.updateKeyMap(keymap);

		Connection.TRXTIMEOUT = 240;
		Connection.CONNTIMEOUT = 120;

		// Match URI without 'index.html' in the end.
		// Use first element [0] from match.
		FormsModule.DATABASE = new Connection(document.documentURI.match(/^.*\//)[0]);

                // If the the database connection should be connected on load,
                // with a default public password, uncomment following line:
                //FormsModule.DATABASE.connect("hr","hr");

		let infomation:HTMLElement = document.querySelector(".infomation");

		infomation.appendChild(KeyMapPage.show());

		this.addEventListener(this.close,{type: EventType.Key, key: keymap.close});
		this.addEventListener(this.login,{type: EventType.Key, key: keymap.login});

		this.addEventListener(this.showTopMenu,{type: EventType.Key, key: keymap.topmenu});
		this.addEventListener(this.showLeftMenu,{type: EventType.Key, key: keymap.leftmenu});

		// this.addEventListener(this.rightmenu,{type: EventType.Mouse, mouse: MouseMap.contextmenu});

		this.addEventListener(this.open,
		[
			{type:EventType.Key,key:this.countries},
		]);

		// Open a form on load. Add the form in the URL:
		// http://localhost:9002/?form=/forms/countries
		// This functionality is handled by following method:
		this.OpenURLForm();

		// If a specific form should be opened on load,
		// uncomment following line:
		//this.showform(Countries);

	}

	private async open(event:FormEvent) : Promise<boolean>
	{

		if (event.key == this.countries)
			this.showform(Countries);

		return(true);
	}

	private logontrg:object = null;
	public async login() : Promise<boolean>
	{
		let usrpwd:Form = await this.showform(UsernamePassword);
		this.logontrg = this.addFormEventListener(usrpwd,this.connect,{type: EventType.OnCloseForm});
		return(true);
	}

	public async logout() : Promise<boolean>
	{
		if (!FormsModule.DATABASE.connected())
			return(true);

		let forms:Form[] = this.getRunningForms();

		for (let i = 0; i < forms.length; i++)
		{
			if (!await forms[i].clear())
				return(false);
		}

		return(FormsModule.DATABASE.disconnect());
	}

	public async close() : Promise<boolean>
	{
		let form:Form = this.getCurrentForm();
		if (form != null) return(form.close());
		return(true);
	}

	private async connect(event:FormEvent) : Promise<boolean>
	{
		let form:UsernamePassword = event.form as UsernamePassword;
		this.removeEventListener(this.logontrg);

		if (form.accepted && form.username && form.password)
		{
			if (!await FormsModule.DATABASE.connect(form.username,form.password))
			{
				//await FormsModule.DATABASE.sleep(2000);

				let forms:Form[] = this.getRunningForms();

				for (let i = 0; i < forms.length; i++)
				{
					if (forms[i] instanceof AlertForm)
						await forms[i].close(true);
				}

				await this.login();
			}
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
		this.leftmenu.display();
		this.leftmenu.focus();
		return(true);
	}

	private async rightmenu() : Promise<boolean>
	{
		let mouseevent: MouseEvent = this.getJSEvent() as MouseEvent;
		new RightClick(mouseevent);
		return(true);
	}
}

export class keymap extends KeyMap
{
	public static close:KeyMap = new KeyMap({key: 'w', ctrl: true});
	public static login:KeyMap = new KeyMap({key: 'l', ctrl: true});
	public static topmenu:KeyMap = new KeyMap({key: 'm', ctrl: true});
	public static leftmenu:KeyMap = new KeyMap({key: 'f', ctrl: true});
}
