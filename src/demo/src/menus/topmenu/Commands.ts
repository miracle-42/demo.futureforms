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

import { FormsModule } from "../../FormsModule";
import { KeyMap, StaticMenu, StaticMenuEntry } from "forms42core";

export class Commands extends StaticMenu
{
	constructor()
	{
		super(Commands.data());
	}

	public async execute(path:string): Promise<boolean>
	{
		path = path.toLowerCase();
		let parts:string[] = path.split("/");
		let module:FormsModule = FormsModule.get();

		if (parts[0] == "form")
		{
			switch(parts[1])
			{
				case "clear" : FormsModule.sendkey(KeyMap.enterquery);	break;
				case "close" : module.close();									break;
			}
		}

		if (parts[0] == "query")
		{
			switch(parts[1])
			{
				case "enter" 		: FormsModule.sendkey(KeyMap.enterquery);		break;
				case "execute" 	: FormsModule.sendkey(KeyMap.executequery);	break;
				case "refine" 		: FormsModule.sendkey(KeyMap.lastquery);		break;
				case "advanced" 	: FormsModule.sendkey(KeyMap.queryeditor);	break;
			}
		}

		if (parts[0] == "record")
		{
			switch(parts[1])
			{
				case "insert" 		: FormsModule.sendkey(KeyMap.insert);			break;
				case "Insert" 		: FormsModule.sendkey(KeyMap.insertAbove);	break;
				case "delete" 		: FormsModule.sendkey(KeyMap.delete);			break;
				case "refresh" 	: FormsModule.sendkey(KeyMap.refresh);			break;
				case "scrollup" 	: FormsModule.sendkey(KeyMap.pageup);			break;
				case "scrolldown" : FormsModule.sendkey(KeyMap.pagedown);		break;
			}
		}

		if (parts[0] == "transaction")
		{
			switch(parts[1])
			{
				case "commit" 		: FormsModule.sendkey(KeyMap.commit);		break;
				case "rollback" 	: FormsModule.sendkey(KeyMap.rollback);	break;
			}
		}

		if (parts[0] == "connection")
		{
			switch(parts[1])
			{
				case "connect" 	: module.login();		break;
				case "disconnect" : module.logout();	break;
			}
		}

		return(true);
	}

	public static data() : StaticMenuEntry
	{
		return(
		{
			id: "topbar",
			display: "topbar",
			entries:
			[
				{
					id: "form",
					disabled: true,
					display: "Form",
					entries:
					[
						{
							id: "clear",
							display: "Clear",
							hinttext: "shift-F4",
							command :"form/clear"
						},
						{
							id: "close",
							display: "Close",
							hinttext: "ctrl-w",
							command: "form/close"
						}
					]
				},
				{
					id: "query",
					disabled: true,
					display: "Query",
					entries:
					[
						{
							id: "enter",
							display: "Enter",
							hinttext: "F7",
							command: "query/enter"
						},
						{
							id: "execute",
							display: "Execute",
							hinttext: "F8",
							command: "query/execute"
						},
						{
							id: "refine",
							display: "Refine",
							hinttext: "shift-F7",
							command: "query/refine"
						},
						{
							id: "advanced",
							display: "Advanced",
							hinttext: "ctrl-F7",
							command: "query/advanced"
						}
					]
				},
				{
					id: "record",
					disabled: true,
					display: "Record",
					entries:
					[
						{
							id: "insert",
							display: "Insert",
							hinttext: "Insert Record",
							entries:
							[
								{
									id: "after",
									display: "Below",
									hinttext: "F5",
									command: "record/insert"
								},
								{
									id: "before",
									display: "Above",
									hinttext: "Shift-F5",
									command: "record/Insert"
								}
							]
						},
						{
							id: "delete",
							display: "Delete",
							hinttext: "F6",
							command: "record/delete"
						},
						{
							id: "refresh",
							display: "Requery/Undo",
							hinttext: "ctrl-u",
							command: "record/refresh"
						},
						{
							id: "scrollup",
							display: "Scroll up",
							hinttext: "shift up",
							command: "record/scrollup"
						},
						{
							id: "scrolldown",
							display: "Scroll dowm",
							hinttext: "shift down",
							command: "record/scrolldown"
						}
					]
				},
				{
					disabled: true,
					id: "transaction",
					display: "Transaction",
					entries:
					[
						{
							id: "commit",
							display: "Commit",
							hinttext: "F10",
							command: "transaction/commit"
						},
						{
							id: "rollback",
							display: "Rollback",
							hinttext: "F12",
							command: "transaction/rollback"
						},
					]
				},
				{
					id: "connection",
					display:`Connection`,
					entries:
					[
						{
								id: "connect",
								display: "Connect",
								command: "connection/connect"
						},
						{
								disabled: true,
								id: "disconnect",
								display:"Disconnect",
								command: "connection/disconnect"
						}
					]
        		}
			]
		})
	}
}