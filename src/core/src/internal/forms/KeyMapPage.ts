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

import { Class } from "../../public/Class.js";
import { KeyMap } from "../../control/events/KeyMap.js";


/**
 * Very simple html page that displays keymappings
 * Mostly acts as an example
 */
export class KeyMapPage
{
	private static ul:HTMLElement = null;

	public static show(map?:Class<any>) : HTMLElement
	{
		this.ul = document.createElement("ul");
		this.ul.classList.add("InformationKeyMap");

		KeyMap.list(map).forEach(([desc,name]) =>
		{
			let li:HTMLElement = document.createElement("li");
			li.innerHTML = "<label class='name'>" + name + "</label><label class='desc'>" + desc + "</label>";
			this.ul.appendChild(li);
		});

		return(this.ul);
	}

	public static hide()
	{
		this.ul.remove();
	}
}
