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
import { MenuEntry } from './interfaces/MenuEntry.js';
import { MenuOptions } from './interfaces/MenuOptions.js';
import { EventListenerClass } from '../events/EventListenerClass.js';


export class MenuComponent extends EventListenerClass implements EventListenerObject
{
	private menu$:Menu = null;
	private tabidx$:number = 1;
	private active$:number = null;
	private levcls$:string = null;
	private menucls$:string = null;
	private linkcls$:string = null;
	private hintcls$:string = null;
	private target$:HTMLElement = null;
	private options$:MenuOptions = null;
	private open$:Set<string> = new Set<string>();
	private entries$:Map<number,Entry> = new Map<number,Entry>();
	private elements$:Map<HTMLElement,Entry> = new Map<HTMLElement,Entry>();

	constructor(menu:Menu, target?:HTMLElement, options?:MenuOptions)
	{
		super();

		this.menu$ = menu;
		this.target$ = target;
		this.options$ = options;
		if (options == null) this.options$ = {};

		document.addEventListener("mouseup",this);

		if (this.options$.classes == null) this.options$.classes = {};
		if (this.options$.skiproot == null) this.options$.skiproot = false;
		if (this.options$.singlepath == null) this.options$.singlepath = true;
		if (this.options$.classes.common == null) this.options$.classes.common = "";
		if (this.options$.classes.open == null) this.options$.classes.open = "menu-open";
		if (this.options$.classes.menuitem == null) this.options$.classes.menuitem = "menu-item";
		if (this.options$.classes.linkitem == null) this.options$.classes.linkitem = "link-item";
		if (this.options$.classes.hinttext == null) this.options$.classes.hinttext = "hint-text";
		if (this.options$.classes.container == null) this.options$.classes.container = "menu-items";

		this.levcls$ = (this.options$.classes.common + " " + this.options$.classes.container).trim();
		this.menucls$ = (this.options$.classes.common + " " + this.options$.classes.menuitem).trim();
		this.linkcls$ = (this.options$.classes.common + " " + this.options$.classes.linkitem).trim();
		this.hintcls$ = (this.options$.classes.common + " " + this.options$.classes.hinttext).trim();
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
		this.entries$.get(this.active$)?.element?.focus();
	}

	public hasOpenBranches() : boolean
	{
		return(this.open$.size > 0);
	}

	public async show() : Promise<void>
	{
		this.tabidx$ = 0;
		this.entries$.clear();

		let path:string = null;
		let start:MenuEntry[] = [await this.menu$.getRoot()];

		if (this.options$.skiproot)
		{
			path = "/"+start[0].id;
			start = await this.menu$.getEntries(path);
		}

		this.target$.innerHTML = await this.showEntry(null,start,path);

		let entries:NodeList = this.target$.querySelectorAll("a:not(.disabled)");
		entries.forEach((link) => {this.prepare(link as HTMLAnchorElement);});

		this.elements$.clear();
		this.index(this.target$);
	}

	public async hide() : Promise<void>
	{
		if (this.open$.size == 0) return;
		this.target$.innerHTML = "";
		this.open$.clear();
		this.show();
	}

	public clear() : void
	{
		this.hide();
	}

	public async toggle(path:string) : Promise<void>
	{
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

		await this.show();
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

	private async showEntry(parent:MenuEntry, entries:MenuEntry[], path?:string, page?:string) : Promise<string>
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
		page += "<div class='"+this.levcls$+"'>";

		for (let i = 0; i < entries.length; i++)
		{
			let cmd:string = "";
			let classes:string = this.menucls$;
			let disabled:string = entries[i].disabled ? ' class="disabled" ' : '';

			this.tabidx$++;
			let entry:Entry = new Entry();

			entry.parent = parent;
			entry.curr = entries[i];
			entry.id = this.tabidx$;
			if (i > 0) entry.prev = entries[i-1];
			if (i < entries.length-1) entry.next = entries[i+1];

			this.entries$.set(this.tabidx$,entry);
			if (!this.active$) this.active$ = this.tabidx$;

			if (entries[i].command)
			{
				classes = this.linkcls$;
				cmd = "command='"+entries[i].command+"'";
			}

			let npath:string = path+entries[i].id;
			let tabidx:string = "tabindex="+this.tabidx$;
			if (entries[i].disabled) classes = (classes + " disabled").trim();

			if (this.open$.has(npath))
			{
				classes += " "+this.options$.classes.open;

				page += "<div class='"+classes+"'>";
				page += "  <a "+tabidx+" path='"+npath+"' "+cmd+disabled+">"+entries[i].display+"</a>";
				if (entries[i].hinttext) page += "  <div class='"+this.hintcls$+"'>"+entries[i].hinttext+"</div>";

				page = await this.showEntry(entries[i],await this.menu$.getEntries(npath),npath,page);
				page += "</div>";
			}
			else
			{
				page += "<div class='"+classes+"'>"
				page += "  <a "+tabidx+" path='"+npath+"' "+cmd+disabled+">"+entries[i].display+"</a>"
				if (entries[i].hinttext) page += "  <div class='"+this.hintcls$+"'>"+entries[i].hinttext+"</div>";
				page += "</div>";
			}
		}

		page += "</div>";
		return(page);
	}

	public async handleEvent(event:Event)
	{
		if (!(event.target instanceof HTMLElement))
		{
			this.hide();
			return;
		}

		if (event.type == "mouseup" && !this.belongs(event.target))
		{
			this.hide();
			return;
		}

		if (event.type == "focus")
			this.active$ = event.target.tabIndex;

		if (event.type == "keyup")
		{
			//console.log((event as KeyboardEvent).key)
		}

		if (event.type != "click")
			return;

		let elem:HTMLElement = event.target;

		let path:string = elem.getAttribute("path");
		let command:string = elem.getAttribute("command");

		while(path == null && command == null && elem != document.body)
		{
			elem = elem.parentElement;
			path = elem.getAttribute("path");
			command = elem.getAttribute("command");
		}

		if (path != null || command != null)
		{
			if (command == null) await this.toggle(path);
			else if (await this.menu$.execute(command)) await this.hide();

			this.focus();
		}
	}

	private belongs(elem:HTMLElement) : boolean
	{
		return(this.elements$.has(elem));
	}

	private index(elem:HTMLElement) : void
	{
		elem.childNodes.forEach((node) =>
		{
			this.index(node as HTMLElement);
			this.elements$.set(node as HTMLElement, this.entries$.get(elem.tabIndex));
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
		this.entries$.get(element.tabIndex).element = element;
	}
}


class Entry
{
	id:number;
	next:MenuEntry;
	prev:MenuEntry;
	curr:MenuEntry;
	parent:MenuEntry;
	element:HTMLElement;

	public toString() : string
	{
		return(this.id+" "+(this.element ? "set "+this.element.innerHTML : "unset"))
	}
}