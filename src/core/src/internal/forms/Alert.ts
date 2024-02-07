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
	public static MAXWORDLEN:number = 32;
	private closeButton:HTMLElement = null;

	public static BlurStyle:string =
	`
	`;

	constructor()
	{
		super(Alert.prepare());

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

		this.msg = this.parameters.get("message")+"";
		this.closeButton = view.querySelector('button[name="close"]');

		let split:boolean = false;
		let words:string[] = this.msg.split(" ");
		words.forEach((word) => {if (word.length > Alert.MAXWORDLEN) split = true});

		if (split)
		{
			this.msg = "";

			for (let i = 0; i < words.length; i++)
			{
				if (words[i].length <= Alert.MAXWORDLEN) this.msg += words[i];
				else this.msg += this.split(words[i]);
				if (i < words.length - 1) this.msg += " ";
			}
		}

		let severe:boolean = this.parameters.get("severe");
		let warning:boolean = this.parameters.get("warning");

		Internals.stylePopupWindow(view,title,Alert.HEIGHT,Alert.WIDTH);

		// Block everything else
		let block:HTMLElement = view.querySelector('div[id="block"]');

		block.style.top = "0";
		block.style.left = "0";
		block.style.position = "fixed";
		block.style.width = document.body.offsetWidth+"px";
		block.style.height = document.body.offsetHeight+"px";

		if (severe) block.classList.add("type","severe");
		if (warning) block.classList.add("type","warning");

		this.canvas.zindex = 2147483647;
		this.setValue("alert","msg",this.msg);

		let alerts:Alert[] = [];
		this.created = new Date().getTime();

		FormsModule.getRunningForms().forEach((form) =>
		{
			if (form instanceof Alert && form != this)
				alerts.push(form);
		})

		setTimeout(() => {this.closeRunning(alerts)},10000);

		this.focus();
		return(true);
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

	private split(word:string) : string
	{
		let pos:number = 0;
		let split:string = "";

		while(pos < word.length)
		{
			split += word.substring(pos,pos+Alert.MAXWORDLEN);

			pos += Alert.MAXWORDLEN;
			if (pos < word.length) split += " ";
		}

		return(split);
	}

	private static prepare() : string
	{
		let page:string = Alert.page;
		page = page.replace("{OK}",Internals.OKButtonText);
		return(page);
	}

	public static page:string =
		`<div id="block"></div>` +
			Internals.header +
		`
		<div name="popup-body">
			<div name="alert">
				<div name="msg" from="alert"></div>
			</div>

			<div name="lower-right">
				<div name="button-area">
					<button name="close" onClick="this.close()">{OK}</button>
				</div>
			</div>
		</div>
		`
	+ 	Internals.footer;
}