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
import { KeyMap } from "../../control/events/KeyMap.js";
import { MouseMap } from "../../control/events/MouseMap.js";
import { EventType } from "../../control/events/EventType.js";
import { FormsModule } from "../../application/FormsModule.js";
import { Internals } from "../../application/properties/Internals.js";

export class Alert extends Form
{
	private grap:number = 10;
	private msg:string = null;
	private created:number = 0;
	public static WIDTH:number = 300;
	public static HEIGHT:number = null;
	private closeButton:HTMLElement = null;

	public static BlurStyle:string =
	`
	`;

	constructor()
	{
		super(Alert.page);

		this.moveable = true;
		this.resizable = true;

		this.addEventListener(this.initialize,{type: EventType.PostViewInit});
		this.addEventListener(this.focus,{type:EventType.Mouse, mouse: MouseMap.click});

		this.addEventListener(this.done,
		[
			{type: EventType.Key, key: KeyMap.enter},
			{type: EventType.Key, key: KeyMap.escape},
			{type: EventType.Key, key: KeyMap.space},
		]);
	}

	private async done() : Promise<boolean>
	{
		this.grap = -1;
		return(this.close());
	}

	private async closeRunning(alerts:Alert[]) : Promise<void>
	{
		for (let i = 0; i < alerts.length; i++)
		{
			if (alerts[i].created < this.created)
			{
				console.log("closing former alert '"+alerts[i].msg+"'");
				await alerts[i].close(true);
				this.focus();
			}
		}
	}

	private async initialize() : Promise<boolean>
	{
		let view:HTMLElement = this.getView();
		let title:string = this.parameters.get("title");

		this.msg = this.parameters.get("message");
		this.closeButton = view.querySelector('button[name="close"]');

		let fatal:boolean = this.parameters.get("fatal");
		let warning:boolean = this.parameters.get("warning");

		Internals.stylePopupWindow(view,title,Alert.HEIGHT,Alert.WIDTH);

		// Block everything else
		let block:HTMLElement = view.querySelector('div[id="block"]');

		block.style.top = "0";
		block.style.left = "0";
		block.style.position = "fixed";
		block.style.width = document.body.offsetWidth+"px";
		block.style.height = document.body.offsetHeight+"px";

		if (fatal) block.classList.add("type","fatal");
		if (warning) block.classList.add("type","warning");

		this.canvas.zindex = 2147483647;
		this.setValue("alert","msg",this.msg);

		let alerts:Alert[] = [];
		this.created = new Date().getTime();

		FormsModule.get().getRunningForms().forEach((form) =>
		{
			if (form instanceof Alert && form != this)
				alerts.push(form);
		})

		setTimeout(() => {this.closeRunning(alerts)},10000);

		this.focus();
		return(false);
	}

	// Make sure we get focus
	public override async focus(): Promise<boolean>
	{
		this.grap--;
		this.closeButton.focus();

		if (this.grap > 0) setTimeout(() =>
			{this.focus()}, 5);

		return(true);
	}

	public static page:string =
		`<div id="block"></div>` +

		Internals.header +
		`

		<div name="popup-body">
			<div name="popup-alert">
				<div name="alertlogo"></div>
				<div name="msg" from="alert"></div>
			</div>
		</div>

		<div name="lowerright">
			<div name="buttonarea">
				<button name="close" onClick="this.close()">Ok</button>
			</div>
		</div>
		`
	+ 	Internals.footer;
}