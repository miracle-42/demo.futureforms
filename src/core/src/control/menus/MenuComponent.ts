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

import { Menu } from './interfaces/Menu.js';
import { EventType } from '../events/EventType.js';
import { MenuEntry } from './interfaces/MenuEntry.js';
import { FormEvent, FormEvents } from '../events/FormEvents.js';
import { EventListenerClass } from '../events/EventListenerClass.js';
import { MenuOptions, Navigation } from './interfaces/MenuOptions.js';


export class MenuComponent extends EventListenerClass implements EventListenerObject
{
	private menu$:Menu = null;
	private name$:string = null;
	private tabidx$:number = 1;
	private active$:number = null;
	private focused:boolean = false;
	private target$:HTMLElement = null;
	private options$:MenuOptions = null;
	private open$:Set<string> = new Set<string>();
	private entries$:Map<number,Entry> = new Map<number,Entry>();
	private menuentries$:Map<MenuEntry,Entry> = new Map<MenuEntry,Entry>();
	private elements$:Map<HTMLElement,Entry> = new Map<HTMLElement,Entry>();

	constructor(name:string, menu:Menu, target?:HTMLElement, options?:MenuOptions)
	{
		super();

		this.name$ = name;
		this.menu$ = menu;
		this.target$ = target;
		this.options$ = options;
		if (options == null) this.options$ = {};

		document.addEventListener("focus",this,true);
		document.addEventListener("mouseup",this,true);

		if (this.options$.skiproot == null) this.options$.skiproot = false;
		if (this.options$.singlepath == null) this.options$.singlepath = true;
	}

	public get name() : string
	{
		return(this.name$);
	}

	public get options() : MenuOptions
	{
		return(this.options$);
	}

	public get target() : HTMLElement
	{
		return(this.target$);
	}

	public set target(target:HTMLElement)
	{
		this.target$ = target;
	}

	public focus() : void
	{
		this.setFocus(this.entries$.get(this.active$)?.element);
	}

	public hasOpenBranches() : boolean
	{
		return(this.open$.size > 0);
	}

	public async show() : Promise<boolean>
	{
		await this.showMenu();
		return(true);
	}

	private async showMenu() : Promise<void>
	{
		this.tabidx$ = 0;
		this.active$ = null;
		this.entries$.clear();

		let path:string = null;
		let start:MenuEntry[] = [await this.menu$.getRoot()];

		if (this.options$.skiproot)
		{
			path = "/"+start[0].id;
			start = await this.menu$.getEntries(path);
		}

		this.target$.innerHTML = await this.showEntry(null,start,0,path);
		let entries:NodeList = this.target$.querySelectorAll("a");

		entries.forEach((link) =>
		{
			let href:HTMLAnchorElement = link as HTMLAnchorElement;
			this.entries$.get(href.tabIndex).element = href;
			this.prepare(href);
		});

		this.elements$.clear();
		this.index(this.target$);

		if (this.active$ == null)
			this.active$ = 1;

		if (this.options$.navigation == null && this.entries$.size > 1)
		{
			let x:number = null;
			let y:number = null;
			let skewX:number = 0;
			let skewY:number = 0;

			this.entries$.forEach((entry) =>
			{
				let rect:DOMRect = entry.element.getBoundingClientRect();

				if (x == null) x = rect.x;
				if (y == null) y = rect.y;

				let dx:number = Math.abs(rect.x-x);
				let dy:number = Math.abs(rect.y-y);

				if (dx > skewX) skewX = dx;
				if (dy > skewY) skewY = dy;
			});

			this.options$.navigation = Navigation.horizontal;
			if (skewY > skewX) this.options$.navigation = Navigation.vertical;
		}
	}

	public async hide() : Promise<boolean>
	{
		this.target$.innerHTML = "";
		this.open$.clear();
		return(true);
	}

	public async close() : Promise<void>
	{
		this.closeMenu();
	}

	private async closeMenu() : Promise<void>
	{
		if (this.open$.size == 0) return;
		this.target$.innerHTML = "";
		this.open$.clear();
		await this.showMenu();
	}

	public async toggle(path:string) : Promise<void>
	{
		let active:number = this.active$;
		let open:boolean = this.open$.has(path);

		if (this.options$.singlepath)
		{
			this.open$.clear();

			let opath:string = "";
			let mpath:string[] = this.split(path);

			for (let i = 0; i < mpath.length; i++)
			{
				opath += "/" + mpath[i];
				this.open$.add(opath);
			}

			if (open)
				this.open$.delete(path);
		}
		else
		{
			if (!open) this.open$.add(path);
			else	     this.open$.delete(path);
		}

		await this.showMenu();

		this.active$ = active;
		this.focus();
	}

	public async findEntry(path:string) : Promise<MenuEntry>
	{
		if (path == null) path = "/";
		if (path.length > 1) path += "/";

		let parts:string[] = this.split(path);

		let entries:MenuEntry[] = [await this.menu$.getRoot()];
		if (!entries) return(null);

		return(this.findrecusv(entries,parts,0,"/"));
	}

	private async findrecusv(entries:MenuEntry[], parts:string[], elem:number, path:string) : Promise<MenuEntry>
	{
		for (let i = 0; i < entries.length; i++)
		{
			if (entries[i].id == parts[elem])
			{
				elem++;

				if (elem == parts.length)
					return(entries[i]);

				let npath:string = path+entries[i].id+"/";
				entries = await this.menu$.getEntries(path+entries[i].id);

				if (!entries)
					return(null);

				return(this.findrecusv(entries,parts,elem,npath))
			}
		}

		return(null);
	}

	private async showEntry(parent:MenuEntry, entries:MenuEntry[], level:number, path?:string, page?:string) : Promise<string>
	{
		if (entries == null)
			return(page);

		if (page == null) page = "";
		if (path == null) path = "/";
		if (path.length > 1) path += "/";
		if (entries == null) return(page);

		let empty:boolean = true;

		for (let i = 0; i < entries.length; i++)
		{
			if (!entries[i].disabled)
			{
				empty = false;
				break;
			}
		}

		if (empty) return(page);

		let menu:string = this.name$;
		if (parent) menu = parent.id;

		page += "<menu name='"+menu+"' class='"+this.name$+" level-"+level+"'>";

		for (let i = 0; i < entries.length; i++)
		{
			let cmd:string = "";
			let type:string = "menu";
			let disabled:string = entries[i].disabled ? 'disabled' : '';

			this.tabidx$++;
			let entry:Entry = new Entry();

			entry.parent = parent;
			entry.curr = entries[i];
			entry.id = this.tabidx$;
			if (i > 0) entry.prev = entries[i-1];
			if (i < entries.length-1) entry.next = entries[i+1];

			this.entries$.set(this.tabidx$,entry);

			if (!this.active$ && !entries[i].disabled)
				this.active$ = this.tabidx$;

			if (entries[i].command)
			{
				type = "link";
				cmd = "command='"+entries[i].command+"'";
			}

			let npath:string = path+entries[i].id;
			let tabidx:string = "tabindex="+this.tabidx$;

			if (this.open$.has(npath))
			{
				page += "<li type='"+type+"'>";
				page += "  <a "+tabidx+" path='"+npath+"' "+cmd+disabled+">"+entries[i].display+"</a>";
				if (entries[i].hinttext) page += "  <div>"+entries[i].hinttext+"</div>";

				page = await this.showEntry(entries[i],await this.menu$.getEntries(npath),level + 1,npath,page);
				page += "</li>";
			}
			else
			{
				page += "<li type='"+type+"'>";
				page += "  <a "+tabidx+" path='"+npath+"' "+cmd+disabled+">"+entries[i].display+"</a>"
				if (entries[i].hinttext) page += "  <div>"+entries[i].hinttext+"</div>";
				page += "</li>";
			}
		}

		page += "</menu>";
		return(page);
	}

	public async handleEvent(event:Event)
	{
		if (!(event.target instanceof HTMLElement))
		{
			await this.fireBlur();
			await this.closeMenu();
			return;
		}

		let elem:HTMLElement = event.target;

		if (event.type == "mouseup" && !this.belongs(event.target))
		{
			await this.fireBlur();
			await this.closeMenu();
			return;
		}

		if (event.type == "focus")
		{
			if (!this.belongs(event.target))
			{
				await this.fireBlur();
				await this.closeMenu();
				return;
			}

			this.fireFocus();
			this.active$ = event.target.tabIndex;
		}

		if (event.type == "keyup")
		{
			if (this.belongs(event.target))
			{
				if (await this.navigate(elem,(event as KeyboardEvent).key))
				return;
			}
		}

		if (event.type != "click")
			return;

		let path:string = elem.getAttribute("path");
		let command:string = elem.getAttribute("command");

		while(path == null && command == null && elem != document.body)
		{
			elem = elem.parentElement;
			path = elem.getAttribute("path");
			command = elem.getAttribute("command");
		}

		this.pick(elem);
	}


	private async pick(elem:HTMLElement) : Promise<boolean>
	{
		let path:string = elem.getAttribute("path");
		let command:string = elem.getAttribute("command");

		if (elem.getAttribute("disabled") != null)
			return(true);

		if (path != null || command != null)
		{
			this.active$ = elem.tabIndex;

			if (command == null)
			{
				await this.toggle(path);
			}
			else
			{
				if (await this.menu$.execute(command))
					await this.closeMenu();
			}

			return(true);
		}

		return(false);
	}

	private async navigate(elem:HTMLElement, key:string) : Promise<boolean>
	{
		elem = this.getElement(elem);
		if (elem == null) return(null);

		// Probaby everything closed
		if (this.options$.navigation == null)
			return(this.navigateV(elem,key));

		else if (this.options$.navigation == Navigation.vertical)
			return(this.navigateV(elem,key));

		else if (this.options$.navigation == Navigation.horizontal)
			return(this.navigateH(elem,key));

		return(false);
	}

	private async navigateV(elem:HTMLElement, key:string) : Promise<boolean>
	{
		let path:string = elem.getAttribute("path");
		let command:boolean = elem.getAttribute("command") != null;
		let disabled:boolean = elem.getAttribute("disabled") != null;

		switch(key)
		{
			case "ArrowUp" :
				elem = this.findPrev(elem);

				if (elem)
				{
					this.setFocus(elem);
					this.active$ = elem.tabIndex;
				}

				break;

			case "ArrowDown" :
				elem = this.findNext(elem);

				if (elem)
				{
					this.setFocus(elem);
					this.active$ = elem.tabIndex;
				}

				break;

			case "ArrowLeft" :
				if (!command && !disabled && this.open$.has(path))
					await this.toggle(path);
				break;

			case "ArrowRight" :
				if (!command && !disabled && !this.open$.has(path))
				{
					await this.toggle(path);

					elem = this.findNext(elem);

					if (elem)
					{
						this.setFocus(elem);
						this.active$ = elem.tabIndex;
					}
				}

				break;

			case "Escape" :
				if (!command)
				{
					if (!command && !disabled && this.open$.has(path))
						await this.toggle(path);
				}
				break;


			case " " :
			case "Enter" :
				this.pick(elem);
				break;
		}

		return(true);
	}

	private async navigateH(elem:HTMLElement, key:string) : Promise<boolean>
	{
		let path:string = elem.getAttribute("path");
		let command:boolean = elem.getAttribute("command") != null;
		let disabled:boolean = elem.getAttribute("disabled") != null;
		let parent:MenuEntry = this.entries$.get(elem.tabIndex)?.parent;

		if (parent)
		{
			switch(key)
			{
				case "ArrowUp" : key = "ArrowLeft"; break;
				case "ArrowDown" : key = "ArrowRight"; break;

				case "ArrowLeft" : key = "ArrowUp"; break;
				case "ArrowRight" : key = "ArrowDown"; break;
			}
		}

		switch(key)
		{
			case "ArrowUp" :
				if (!command && !disabled && this.open$.has(path))
				{
					await this.toggle(path);
				}
				else if (command || parent)
				{
					elem = this.findPrev(elem);

					if (elem)
					{
						this.setFocus(elem);
						this.active$ = elem.tabIndex;
					}
				}

				break;

			case "ArrowDown" :
				if (!command && !disabled && !this.open$.has(path))
					await this.toggle(path);

				elem = this.findNext(elem);

				if (elem)
				{
					this.setFocus(elem);
					this.active$ = elem.tabIndex;
				}

				break;

			case "ArrowLeft" :
				elem = this.findPrev(elem);

				if (elem)
				{
					this.setFocus(elem);
					this.active$ = elem.tabIndex;
				}

				break;

			case "ArrowRight" :
				elem = this.findNext(elem);

				if (elem)
				{
					this.setFocus(elem);
					this.active$ = elem.tabIndex;
				}

				break;

			case "Escape" :
				if (!command && !disabled)
				{
					if (this.open$.has(path))
						await this.toggle(path);
				}
				break;


			case " " :
			case "Enter" :
				this.pick(elem);
				break;
		}

		return(true);
	}

	private findPrev(elem:HTMLElement) : HTMLElement
	{
		let parent:MenuEntry = this.entries$.get(elem.tabIndex)?.parent;
		let previous:MenuEntry = this.entries$.get(elem.tabIndex)?.prev;
		let prev:HTMLElement = this.menuentries$.get(previous)?.element;

		if (prev) return(prev);
		return(this.menuentries$.get(parent)?.element);
	}

	private findNext(elem:HTMLElement) : HTMLElement
	{
		let path:string = elem.getAttribute("path");
		let next:MenuEntry = this.entries$.get(elem.tabIndex)?.next;

		if (this.open$.has(path))
		{
			let next:HTMLElement = this.findFirstChild(elem);
			if (next) return(next);
		}

		return(this.menuentries$.get(next)?.element);
	}

	private findFirstChild(elem:HTMLElement) : HTMLElement
	{
		let parent:MenuEntry = this.entries$.get(elem.tabIndex)?.curr;

		for (let [key, entry] of this.entries$)
		{
			if (entry.parent == parent)
				return(entry.element);
		}

		return(null);
	}

	private async fireBlur() : Promise<boolean>
	{
		if (!this.focused)
			return(true);

		this.focused = !this.focused;
		let frmevent:FormEvent = FormEvent.AppEvent(EventType.OnMenuBlur,this);
		return(FormEvents.raise(frmevent));
	}

	private async fireFocus() : Promise<boolean>
	{
		if (this.focused)
			return(true);

		this.focused = !this.focused;
		let frmevent:FormEvent = FormEvent.AppEvent(EventType.OnMenuFocus,this);
		return(FormEvents.raise(frmevent));
	}

	private belongs(elem:HTMLElement) : boolean
	{
		return(this.elements$.has(elem));
	}

	private setFocus(elem:HTMLElement) : void
	{
		this.getElement(elem).focus();
	}

	private getElement(elem:HTMLElement) : HTMLAnchorElement
	{
		if (elem instanceof HTMLAnchorElement)
			return(elem);

		for (let i = 0; i < elem.children.length; i++)
		{
			let achor:Element = elem.children.item(i);

			if (achor instanceof HTMLAnchorElement)
				return(achor);
		}

		return(null);
	}

	private index(elem:HTMLElement) : void
	{
		elem.childNodes.forEach((node) =>
		{
			this.index(node as HTMLElement);
			let entry:Entry = this.entries$.get(elem.tabIndex);

			this.elements$.set(node as HTMLElement,entry);

			if (entry)
			{
				this.menuentries$.set(entry.curr,entry);
				entry.children = entry.element.parentElement.querySelectorAll("li")?.length;
			}
		})
	}

	private split(path:string) : string[]
	{
		let parts:string[] = [];
		let split:string[] = path.trim().split("/");

		split.forEach((elem) =>
		{
			elem = elem.trim();
			if (elem.length > 0) parts.push(elem);
		});

		return(parts);
	}

	private prepare(element:HTMLElement) : void
	{
		element.addEventListener("click",this);
		element.addEventListener("keyup",this);
		element.addEventListener("focus",this);
		element.addEventListener("mouseover",this);
	}
}


class Entry
{
	id:number;
	next:MenuEntry;
	prev:MenuEntry;
	curr:MenuEntry;
	children:number;
	parent:MenuEntry;
	element:HTMLElement;

	public toString() : string
	{
		return(this.id+" "+(this.element ? "set "+this.element.innerHTML : "unset"))
	}
}