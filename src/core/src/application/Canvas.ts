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

import { Framework } from './Framework.js';
import { CanvasComponent } from './CanvasComponent.js';
import { Canvas as CanvasProperties } from './properties/Canvas.js';
import { Canvas as CanvasDefinition, View } from './interfaces/Canvas.js';


export class Canvas implements CanvasDefinition, EventListenerObject
{
	private moveable$:boolean;
	private resizable$:boolean;
	private parent:HTMLElement;
	private zindex$:number = 0;
	private active:Element = null;
	private content:HTMLElement = null;
	private modal:HTMLDivElement = null;
	private canvas:HTMLDivElement = null;
	private container:HTMLDivElement = null;
	private component:CanvasComponent = null;

	public get moveable() : boolean
	{
		return(this.moveable$);
	}

	public get resizable() : boolean
	{
		return(this.resizable$);
	}

	public set moveable(flag:boolean)
	{
		this.moveable$ = flag;
		this.canvas.style.position = flag ? "absolute" : "relative";
	}

	public set resizable(flag:boolean)
	{
		this.resizable$ = flag;
		this.canvas.style.resize = flag ? "both" : "none";
		this.canvas.style.overflow = flag ? "hidden" : "auto";
	}

	public get zindex() : number
	{
		return(this.zindex$);
	}

	public set zindex(zindex:number)
	{
		if (zindex < this.zindex$)
			return;

		this.zindex$ = zindex;
		this.canvas.style.zIndex = (2*this.zindex$)+"";
		this.modal.style.zIndex = (2*this.zindex$ + 1)+"";
	}

	public close() : void
	{
		this.canvas.remove();
	}

	public remove() : void
	{
		if (this.parent != null) return;
		this.parent = this.canvas.parentElement;
		this.canvas.remove();
	}

	public restore() : void
	{
		if (this.parent == null) return;
		this.parent.appendChild(this.canvas);
		this.parent = null;
		this.activate();
	}

	public attach(parent:HTMLElement) : void
	{
		this.canvas.remove();
		parent.appendChild(this.canvas);
	}

	public getView() : HTMLElement
	{
		return(this.canvas);
	}

	public getContent() : HTMLElement
	{
		return(this.content);
	}

	public getComponent(): CanvasComponent
	{
		return(this.component);
	}

	public getElementById(id:string) : HTMLElement
	{
		return(this.content.querySelector("#"+id));
	}

	public getElementByName(name:string) : HTMLElement[]
	{
		let elements:HTMLElement[] = [];
		let list:NodeListOf<HTMLElement> = this.content.querySelectorAll("[name='"+name+"']");

		list.forEach((element) => {elements.push(element)});
		return(elements);
	}

	public replace(page:HTMLElement) : void
	{
		this.container.firstChild.remove();

		this.container.appendChild(page);
		this.content = this.container.firstChild as HTMLElement;

		this.content.tabIndex = -1;
		this.content.style.width = "100%";
		this.content.style.height = "100%";
	}

	public setComponent(component:CanvasComponent) : void
	{
		this.component = component;
		let page:HTMLElement|string = component.getView();

		let layout:string = CanvasProperties.page;
		let template:HTMLTemplateElement = document.createElement("template");

		template.innerHTML = layout;

		this.modal = template.content.querySelector("[name=modal]");
		this.canvas = template.content.querySelector("[name=canvas]");
		this.container = template.content.querySelector("[name=content]");

		this.modal.classList.value = CanvasProperties.ModalClasses;
		this.canvas.classList.value = CanvasProperties.CanvasClasses;
		this.container.classList.value = CanvasProperties.ContentClasses;

		this.modal.style.cssText = CanvasProperties.ModalStyle;
		this.canvas.style.cssText = CanvasProperties.CanvasStyle;
		this.container.style.cssText = CanvasProperties.ContentStyle;

		if (page == null)
			page = "";

		if (typeof page === 'string')
		{
			let root:HTMLDivElement = document.createElement("div");
			root.innerHTML = page;
			page = Framework.prepare(root);
		}

		if (page.parentElement)
			page.replaceWith(this.canvas);

		this.container.appendChild(page);
		this.content = this.container.firstChild as HTMLElement;
		this.canvas.addEventListener("mousedown",(event) => {this.dragstart(event)});

		this.content.tabIndex = -1;
		this.zindex = Canvas.newLayer;

		if (this.content.style)
		{
			this.content.style.width = "100%";
			this.content.style.height = "100%";
		}

		this.moveable = component.moveable;
		this.resizable = component.resizable;
	}

	public block() : void
	{
		this.canvas.style.resize = "none";
		this.active = document.activeElement as Element;
		this.modal.style.width = this.canvas.offsetWidth+"px";
		this.modal.style.height = this.canvas.offsetHeight+"px";
		if (this.active instanceof HTMLElement) this.active.blur();
	}

	public unblock() : void
	{
		this.modal.style.width = "0";
		this.modal.style.height = "0";
		if (this.resizable) this.canvas.style.resize = "both";
		if (this.active instanceof HTMLElement) this.active.focus();
	}

	public getViewPort() : View
	{
		return({
			y: this.canvas.offsetTop,
			x: this.canvas.offsetLeft,
			width: this.canvas.offsetWidth,
			height: this.canvas.offsetHeight
		});
	}

	public getParentViewPort() : View
	{
		return({
			y: this.canvas.parentElement.offsetTop,
			x: this.canvas.parentElement.offsetLeft,
			width: this.canvas.parentElement.offsetWidth,
			height: this.canvas.parentElement.offsetHeight
		});
	}

	public setViewPort(frame:View) : void
	{
		let x:string|number = frame.x;
		let y:string|number = frame.y;
		let width:string|number = frame.width;
		let height:string|number = frame.height;

		if (typeof x === "number") x = x + "px";
		if (typeof y === "number") y = y + "px";
		if (typeof width === "number") width = width + "px";
		if (typeof height === "number") height = height + "px";

		this.canvas.style.top = y;
		this.canvas.style.left = x;
		this.canvas.style.width = width;
		this.canvas.style.height = height;
	}

	/*
	 * Drag code
	 */

	private moving = false;
	private mouse = {x: 0, y: 0};
	private boundary = {x: 0, y: 0, w: 0, h: 0};


	private dragstart(event:any) : void
	{
		if (!this.moveable) return;

		if (!event.target.classList.contains(CanvasProperties.CanvasHandleClass))
			return;

		let corner =
		{
			x: +this.canvas.offsetLeft + +this.canvas.offsetWidth,
			y: +this.canvas.offsetTop + +this.canvas.offsetHeight
		}

		let parent:HTMLElement = this.canvas.parentElement;
		this.boundary = {x: parent.offsetLeft, y: parent.offsetTop, w: parent.offsetWidth, h: parent.offsetHeight};

		let type:string = window.getComputedStyle(this.canvas.parentElement).position;

		if (type == "static") type = "";
		if (type == "fixed")	type = "absolute";
		if (type == "sticky") type = "relative";

		if (type == "")
		{
			corner.y -= this.canvas.offsetTop;
			corner.x -= this.canvas.offsetLeft;

			this.boundary.w += this.boundary.x;
			this.boundary.h += this.boundary.y;
		}

		if (type == "relative")
		{
			this.boundary.x = 0;
			this.boundary.y = 0;
		}

		if (type == "absolute")
		{
			this.boundary.x = 0;
			this.boundary.y = 0;

			this.boundary.w = parent.parentElement.clientWidth;
			this.boundary.h = parent.parentElement.clientHeight;
		}

		this.moving = true;

		document.addEventListener('mouseup',this);
		document.addEventListener('mousemove',this);

		this.mouse = {x: event.clientX, y: event.clientY};
	}

	public drag(event:any) : void
	{
		if (this.moving)
		{
			event.preventDefault();

			let offX:number = event.clientX - this.mouse.x;
			let offY:number = event.clientY - this.mouse.y;

			let elemY:number = this.canvas.offsetTop;
			let elemX:number = this.canvas.offsetLeft;
			let elemW:number = this.canvas.offsetWidth;
			let elemH:number = this.canvas.offsetHeight;

			let posX:number = elemX + offX;
			let posY:number = elemY + offY;

			let minX:number = this.boundary.x;
			let minY:number = this.boundary.y;

			let maxX:number = this.boundary.w - elemW;
			let maxY:number = this.boundary.h - elemH;

			if (posX < minX) posX = minX;
			if (posY < minY) posY = minY;

			if (posX > maxX) posX = maxX;
			if (posY > maxY) posY = maxY;

			this.canvas.style.top = posY + "px";
			this.canvas.style.left = posX + "px";

			this.mouse = {x: event.clientX, y: event.clientY};
		}
	}

	private dragend() : void
	{
		this.moving = false;
		document.removeEventListener('mouseup',this);
		document.removeEventListener('mousemove',this);
	}

	public handleEvent(event:Event) : void
	{
		if (event.type == "mouseup") this.dragend();
		if (event.type == "mousemove") this.drag(event);
	}

	private static layers$:number = 0;

	public activate() : void
	{
		this.zindex = Canvas.newLayer;
		this.content.blur();
	}

	private static get newLayer() : number
	{
		return(++Canvas.layers$);
	}
}