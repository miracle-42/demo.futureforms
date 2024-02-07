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

import { Form } from "../Form.js";
import { Classes } from "../Classes.js";
import { KeyMap } from "../../control/events/KeyMap.js";
import { EventType } from "../../control/events/EventType.js";
import { Internals } from "../../application/properties/Internals.js";

/**
 * A simple utillity form for prompting
 * for username / password
 */
export class UsernamePassword extends Form
{
	public title:string = null;
	public username:string = null;
	public password:string = null;
	public accepted:boolean = false;
	public static scope:boolean = false;
	public static database:boolean = false;

	public static LoginButtonText:string = "Login";
	public static CancelButtonText:string = Internals.CancelButtonText;


	constructor()
	{
		super(UsernamePassword.prepare());

		this.moveable = true;
		this.resizable = true;

		this.addEventListener(this.initialize,{type: EventType.PostViewInit});
		this.addEventListener(this.cancel,{type: EventType.Key, key: KeyMap.escape});

		this.addEventListener(this.accept,
		[
			{type: EventType.Key, key:KeyMap.enter}
		]);
   }

   public async cancel(): Promise<boolean>
	{
		this.username = null;
		this.password = null;
		await this.close();
		return(false);
	}

	private async accept():Promise<boolean>
	{
		this.accepted = true;
		this.username = this.getValue("login","username");
		this.password = this.getValue("login","password");
		await this.close();
		return(false);
	}

	private async initialize() : Promise<boolean>
	{
		this.canvas.zindex = Classes.zindex;
		let view:HTMLElement = this.getView();

		this.setValue("login","username",this.username);
		this.setValue("login","password",this.password);

		if (this.title == null)
			this.title = "Login";

		Internals.stylePopupWindow(view,this.title);

		this.focus();
		return(true);
	}

	private static prepare() : string
	{
		let page:string = UsernamePassword.page;
		page = page.replace("{OK}",Internals.OKButtonText);
		page = page.replace("{CANCEL}",Internals.CancelButtonText);
		return(page);
	}

	public static page: string =
	Internals.header +
	`
	<form onSubmit="return(false)">
		<div name="popup-body">
			<div name="loginimage"></div>
			<div name="login">
				<label for="username">Username</label>
				<input from="login" tabindex="0" name="username"/>
				<label for="password">Password</label>
				<input type="password" tabindex="1" from="login" name="password"/>
				<div name="indexing">
					<div name="scope" `+ UsernamePassword.scope +`>
						<label for="scope" false>Scope</label>
						<select tabindex="2" from="login" name="scope"></select>
					</div>
					<div name="database" `+ UsernamePassword.database +`>
						<label for="database">Database</label>
						<select  tabindex="3" from="login" name="database"></select>
					</div>
				</div>
			</div>
		</div>
		<div name="lowerright">
			<div name="buttonarea">
				<button name="{LOGIN}}" onclick="this.accept()" tabindex="2">Login</button>
				<button name="{CANCEL}" onclick="this.cancel()" tabindex="3">Cancel</button>
			</div>
		</div>
	</form>
   ` + Internals.footer
}