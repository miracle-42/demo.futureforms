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

import { StaticMenu, StaticMenuEntry } from "forms42core";

export class Context extends StaticMenu
{
  
   constructor()
   {
      super(Context.data());
   }

   execute(path: string): Promise<boolean> {
      throw new Error("Method not implemented.");
   }

   public static data(): StaticMenuEntry
   {
      return({
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

