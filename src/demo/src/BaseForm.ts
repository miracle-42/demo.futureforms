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

import { FormsModule } from './FormsModule';
import { Form, View, EventType } from 'forms42core';


export class BaseForm extends Form
{
	public id:string = null;
	private view:View = null;
	public title:string = null;
	private static forms:number = 0;

	constructor(content:string)
	{
		super(content);

		this.moveable = true;
		this.resizable = true;

		this.id = "f" + ++BaseForm.forms;
		this.addEventListener(this.oninit,{type: EventType.PostViewInit});
	}

	public async oninit() : Promise<boolean>
	{
		let px:number = 16;
		let off:number = BaseForm.forms % 8;

		let posX:number = off*px;
		let posY:number = off*px + 20;

		BaseForm.connectNeddle();
		this.getView().style.top = posY + "px";
		this.getView().style.left = posX + "px";

		this.setTitle(this.title);
		return(true);
	}

	public toggle() : void
	{

		let image:HTMLImageElement = document.createElement("img");
		let toggle:HTMLElement = this.getView().querySelector('div[name="toggle"]');

		toggle.innerHTML = "";

		image.width = 9;
		image.height = 9;

		if (this.view == null)
		{
			this.view = this.getViewPort();
			let avail:View = this.getParentViewPort();


			image.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgICAgPHBhdGggZmlsbD0iYmxhY2siIHN0cm9rZS13aWR0aD0iMCIgZD0iTSA1MCAxMAogICAgICB2NDBoNDBsLTE2LTE2bDIyLTIybC04LThsLTIyIDIyWiBtLTQwIDQwIGg0MHY0MGwtMTYtMTZsLTIyIDIybC04LThsMjItMjJaIi8+CiAgPC9zdmc+";
		

			avail.x = 0;
			avail.y = 0;
			avail.width = +avail.width - 2;
			avail.height = +avail.height - 2;

			this.setViewPort(avail);
		}
		else
		{
			image.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbD0iYmxhY2siIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMCIgZD0iTSAwIDYwCnY0MGg0MGwtMTYtMTZsMjItMjJsLTgtOGwtMjIgMjJaCm02MC02MGg0MHY0MGwtMTYtMTZsLTIyIDIybC04LThsMjItMjJaIi8+Cjwvc3ZnPgo=";
			this.setViewPort(this.view);
			this.view = null;
		}

		toggle.appendChild(image);
	}

	public async minimize() : Promise<void>
	{
		if (!await this.validate()) return;
		let forms:FormsModule = FormsModule.get() as FormsModule;
		forms.list.add(this);
		this.hide();
	}

	public setTitle(title:string) : void
	{
		let header:HTMLElement = this.getView().querySelector("[name='title']");
		header?.appendChild(document.createTextNode(title));
	}

	public static async connectNeddle() : Promise<boolean>
	{
		let connect:boolean = FormsModule.DATABASE.connected();
		let needle:NodeListOf<HTMLElement> = document.querySelectorAll(".needle");

		if(needle.length == 0)
			return(true);

		for (let i = 0; i < needle.length; i++)
		{
				if(connect)
				{
					needle[i].classList.add("green");
					needle[i].classList.remove("red");
				}
				else
				{
					needle[i].classList.add("red");
					needle[i].classList.remove("green");
				}
		}
		return(true);
	}

}