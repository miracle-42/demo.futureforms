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

		this.getView().style.top = posY + "px";
		this.getView().style.left = posX + "px";

		this.setTitle(this.title);
		return(true);
	}

	public toggle() : void
	{
		if (this.view == null)
		{
			this.view = this.getViewPort();
			let avail:View = this.getParentViewPort();

			avail.x = 0;
			avail.y = 0;
			avail.width = +avail.width - 2;
			avail.height = +avail.height - 2;

			this.setViewPort(avail);
		}
		else
		{
			this.setViewPort(this.view);
			this.view = null;
		}
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
}