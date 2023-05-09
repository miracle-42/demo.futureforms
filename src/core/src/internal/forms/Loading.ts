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

import { Internals } from "../../application/properties/Internals.js";

export class Loading
{
	public static SHORTWHILE = 1;
	private static loader = new Loading();

	private threads:number = 0;
	private displayed:boolean = false;
	private view:HTMLDivElement = null;
	private element:HTMLElement = null;
	private jobs:Map<number,Running> = new Map<number,Running>();

	public static show(message:string) : number
	{
		let thread:number = Loading.loader.start(message);
		return(thread);
	}

	public static hide(thread:number) : void
	{
		Loading.loader.remove(thread);
	}

	private start(message:string) : number
	{
		this.threads++;
		this.jobs.set(this.threads,new Running(message));
		setTimeout(() => {Loading.loader.display()},Loading.SHORTWHILE*1000);
		return(this.threads);
	}

	private display() : void
	{
		if (this.threads == 0)
			return;
			
		if (!this.displayed)
			this.element = document.activeElement as HTMLElement;

		if (this.getOldest() < Loading.SHORTWHILE * 1000)
		{
			setTimeout(() => {Loading.loader.display()},Loading.SHORTWHILE*1000);
			return;
		}

		if (!this.displayed)
		{
			this.displayed = true;

			this.watch();
			this.prepare();

			document.body.appendChild(this.view);
			this.view.focus();
		}
	}

	private remove(thread:number) : void
	{
		this.threads--;
		this.jobs.delete(thread);

		if (this.displayed && this.threads == 0)
		{
			this.view.remove();
			this.element?.focus();
			this.displayed = false;
		}
	}

	private prepare() : void
	{
		if (this.view == null)
		{
			this.view = document.createElement("div") as HTMLDivElement;

			this.view.innerHTML = Loading.page;
			Internals.stylePopupWindow(this.view);

			this.view = this.view.childNodes.item(1) as HTMLDivElement;
			this.view.style.zIndex = "2147483647";
		}
	}

	private getOldest() : number
	{
		let oldest:number = 0;
		let now:Date = new Date();

		this.jobs.forEach((job) =>
		{
			let spend:number = now.getTime() - job.start.getTime();
			if (spend > oldest) oldest = spend;
		});

		return(oldest);
	}

	private watch() : void
	{
		this.jobs.forEach((job) =>
		{
			let now:Date = new Date();

			if (now.getTime() - job.start.getTime() > Loading.SHORTWHILE * 5000)
				console.log("running "+job.message);
		})

		if (this.jobs.size > 0)
			setTimeout(() => {this.watch()}, Loading.SHORTWHILE * 10000);
	}

	public static page:string =
	`
		<div tabindex="-1" style="position:absolute; top:0; left:0; width: 100%; height: 100%; z-index: 2147483647">
			<div name="loading"></div>
		</div>
	`
}

class Running
{
	public start:Date = new Date();
	constructor(public message:string) {}
}