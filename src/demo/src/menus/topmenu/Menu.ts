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

import { Commands } from './Commands';
import { FormsModule } from '../../FormsModule';
import { EventType, FormEvent, formevent, MenuComponent, MenuEntry } from 'forms42core';

export class Menu extends MenuComponent
{
	private menuelem:HTMLElement = null;

	constructor()
	{
		super(new Commands());
		this.options.skiproot = true;

		this.menuelem = document.getElementById("topbar");

		this.target = this.menuelem;
      this.show();
	}

	@formevent({type: EventType.Connect})
	public async onConnect() : Promise<boolean>
	{
		let entry:MenuEntry = null;

		entry = await this.findEntry("/topbar/connection/connect");
		if (entry) entry.disabled = true;

		entry = await this.findEntry("/topbar/connection/disconnect");
		if (entry) entry.disabled = false;

		if (FormsModule.get().getRunningForms().length > 0)
		{
			entry = await this.findEntry("/topbar/query");
			if (entry) entry.disabled = false;

			entry = await this.findEntry("/topbar/record");
			if (entry) entry.disabled = false;
		}

		this.show();
		return(true);
	}

	@formevent({type: EventType.Disconnect})
	public async onDisConnect() : Promise<boolean>
	{
		let entry:MenuEntry = null;

		entry = await this.findEntry("/topbar/connection/disconnect");
		if (entry) entry.disabled = true;

		entry = await this.findEntry("/topbar/connection/connect");
		if (entry) entry.disabled = false;

		entry = await this.findEntry("/topbar/query");
		if (entry) entry.disabled = true;

		entry = await this.findEntry("/topbar/record");
		if (entry) entry.disabled = true;

		entry = await this.findEntry("/topbar/transaction");
		if (entry) entry.disabled = true;

		this.show();
		return(true);
	}

	@formevent({type: EventType.onNewForm})
	public async onFormOpen(event:FormEvent) : Promise<boolean>
	{
		let entry:MenuEntry = null;

		if (event.form.constructor.name == "UsernamePassword")
		{
			entry = await this.findEntry("/topbar/query");
			if (entry) entry.disabled = true;

			entry = await this.findEntry("/topbar/record");
			if (entry) entry.disabled = true;

			entry = await this.findEntry("/topbar/transaction");
			if (entry) entry.disabled = true;

			entry = await this.findEntry("/topbar/connection");
			if (entry) entry.disabled = true;

			this.show();
			return(true);
		}

		if (FormsModule.get().getRunningForms().length == 1)
		{
			entry = await this.findEntry("/topbar/form");
			if (entry) entry.disabled = false;

			if (FormsModule.DATABASE.connected())
			{
				entry = await this.findEntry("/topbar/query");
				if (entry) entry.disabled = false;

				entry = await this.findEntry("/topbar/record");
				if (entry) entry.disabled = false;
			}

			this.show();
		}

		return(true);
	}

	@formevent({type: EventType.PostCloseForm})
	public async onFormClose(event:FormEvent) : Promise<boolean>
	{
		let entry:MenuEntry = null;

		if (event.form.constructor.name == "UsernamePassword")
		{
			entry = await this.findEntry("/topbar/connection");
			if (entry) entry.disabled = false;
		}

		if (FormsModule.get().getRunningForms().length == 0)
		{
			entry = await this.findEntry("/topbar/form");
			if (entry) entry.disabled = true;

			entry = await this.findEntry("/topbar/query");
			if (entry) entry.disabled = true;

			entry = await this.findEntry("/topbar/record");
			if (entry) entry.disabled = true;
		}

		this.show();
		return(true);
	}

	@formevent([
		{type: EventType.OnNewRecord},
		{type: EventType.OnTransaction}
	])
	public async onTransactionStart(event:FormEvent) : Promise<boolean>
	{
		let entry:MenuEntry = null;

		if (event.form?.getBlock(event.block)?.isControlBlock())
			return(true);

		entry = await this.findEntry("/topbar/transaction");
		if (entry) entry.disabled = false;

		this.show();
		return(true);
	}

	@formevent([{type: EventType.PostCommit},{type: EventType.PostRollback}])
	public async onTransactionEnd() : Promise<boolean>
	{
		let entry:MenuEntry = null;

		entry = await this.findEntry("/topbar/transaction");
		if (entry) entry.disabled = true;

		this.show();
		return(true);
	}
}