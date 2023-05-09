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

import { FormList } from './FormList';
import { MenuComponent } from 'forms42core';

export class Menu extends MenuComponent
{
	private displayed:boolean = false;
	private menuelem:HTMLElement = null;
	private container:HTMLElement = null;

	constructor()
	{
		super(new FormList());

		this.menuelem = document.createElement("div");
		this.menuelem.classList.value = "left-menu-container";

		this.container = document.getElementById("main-menu");

		this.menuelem = this.container.appendChild(this.menuelem);
		this.target = this.menuelem;
		super.show();
	}

	public async hide() : Promise<void>
	{
		super.hide();
		this.displayed = false;
		this.container.style.minWidth = "0px";
		this.container.classList.remove("menu-left-open");
	}

	public display() : void
	{
		this.container.style.minWidth = "150px";
		this.container.classList.add("menu-left-open");
	}

	public togglemenu() : void
	{
		if (this.displayed)
		{
			this.container.style.minWidth = "0px";
			this.container.classList.remove("menu-left-open");
		}
		else
		{
			this.container.style.minWidth = "150px";
			this.container.classList.add("menu-left-open");
		}

		this.displayed = !this.displayed;
	}
}