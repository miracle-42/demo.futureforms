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

import { Menu } from "./interfaces/Menu.js";
import { MenuEntry } from "./interfaces/MenuEntry.js";
import { StaticMenuEntry } from "./interfaces/StaticMenuEntry.js";

/**
 * An easy to use scaffolding of a static Menu.
 * Just implement the execute method that occurs
 * when a given menu-entry is choosen.
 */
export abstract class StaticMenu implements Menu
{
	private root:StaticMenuEntry = null;
	private menu:Map<string,StaticMenuEntry> = new Map<string,StaticMenuEntry>();

	constructor(public entries:StaticMenuEntry)
	{
		this.root = entries;
		this.index("/"+this.root.id,entries);
	}

	public async getRoot() : Promise<MenuEntry>
	{
		return(this.root);
	}

	public async getEntries(path:string) : Promise<MenuEntry[]>
	{
		let entry:StaticMenuEntry = this.menu.get(path);
		if (entry != null) return(entry.entries);
		return(null);
	}

	abstract execute(path:string) : Promise<boolean>;

	public index(path:string, entry:StaticMenuEntry) : void
	{
		this.menu.set(path,entry);

		for (let i = 0; entry.entries != null && i < entry.entries.length; i++)
		{
			let npath:string = path;
			if (npath.length > 1) npath += "/";
			npath += entry.entries[i].id;
			this.index(npath,entry.entries[i]);
		}
	}
}