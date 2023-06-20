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
import { Internals } from "../../application/properties/Internals.js";

export class Alert extends Form
{
	private grap:number = 10;
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

	private async initialize() : Promise<boolean>
	{
		let view:HTMLElement = this.getView();
		let msg:string = this.parameters.get("message");
		let title:string = this.parameters.get("title");
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
		this.setValue("alert","msg",msg);

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
			<div name="msg" from="alert"></div>
		</div>
		
		<div name="lowerright">
			<div name="buttonarea">
				<button name="close" onClick="this.close()">Ok</button>
			</div>
		</div>
		`
	+ 	Internals.footer;
}