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
		let module:FormsModule = FormsModule.get() as FormsModule;

		if (parts[0] == "form")
		{
			switch(parts[1])
			{
				case "clear" : module.sendkey(KeyMap.enterquery);	break;
				case "close" : module.close();							break;
			}
		}

		if (parts[0] == "query")
		{
			switch(parts[1])
			{
				case "enter" 		: module.sendkey(KeyMap.enterquery);	break;
				case "execute" 	: module.sendkey(KeyMap.executequery);	break;
				case "refine" 		: module.sendkey(KeyMap.lastquery);		break;
				case "advanced" 	: module.sendkey(KeyMap.queryeditor);	break;
			}
		}

		if (parts[0] == "record")
		{
			switch(parts[1])
			{
				case "insert" 		: module.sendkey(KeyMap.insert);		break;
				case "delete" 		: module.sendkey(KeyMap.delete);		break;
				case "refresh" 	: module.sendkey(KeyMap.refresh);	break;
				case "scrollup" 	: module.sendkey(KeyMap.pageup);		break;
				case "scrolldown" : module.sendkey(KeyMap.pagedown);	break;
			}
		}

		if (parts[0] == "transaction")
		{
			switch(parts[1])
			{
				case "commit" 		: module.sendkey(KeyMap.commit);		break;
				case "rollback" 	: module.sendkey(KeyMap.rollback);	break;
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
							hinttext: "F5",
							command: "record/insert"
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