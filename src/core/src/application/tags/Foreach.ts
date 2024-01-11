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

import { Tag } from "./Tag.js";
import { Logger, Type } from "../Logger.js";
import { Properties } from "../Properties.js";


export class Foreach implements Tag
{
	public parse(_component:any, tag:HTMLElement, attr:string) : HTMLElement[]
	{
		let tags:HTMLElement[] = [];
		let expr:string = tag.getAttribute(attr);
		Logger.log(Type.htmlparser,"Execute custom tag 'foreach' on: "+tag.tagName);

		if (expr == null)
		{
			attr = Properties.AttributePrefix+attr;
			expr = tag.getAttribute(attr);
		}

		if (expr == null)
			throw "@Foreach: cannot locate attribute "+attr;

		expr = expr.trim();
		tag.removeAttribute(attr);
		let pos:number = expr.indexOf(" ");

		if (pos <= 0)
			throw "@Foreach: illegal expr "+expr+". Syntax: <var> in <n1>..<n2>";

		// Get index variable
		let index:string = expr.substring(0,pos);

		// Skip "in" keyword
		expr = expr.substring(pos+1);
		pos = expr.indexOf(" ");
		expr = expr.substring(pos+1);

		let range:string[] = expr.split("..");
		if (range.length != 2) throw "@Foreach: illegal expr "+expr+". Syntax: <var> in <n1>..<n2>";

		range[0] = range[0].trim();
		range[1] = range[1].trim();

		if (isNaN(+range[0]) || isNaN(+range[1]))
			throw "@Foreach: illegal expr "+expr+". Syntax: <var> in <n1>..<n2>";

		let replace:number[] = [];
		let content:string = tag.innerHTML;
		if (!index.startsWith("$")) index = "$"+index;

		pos = 0;
		while(pos >= 0)
		{
			pos = content.indexOf(index,pos);

			if (pos > 0)
			{
				let n:string = content.charAt(pos+index.length);

				// Skip if next is letter or number
				if (n.toLowerCase() == n.toUpperCase() && isNaN(+n))
					replace.push(pos);

				pos += index.length;
			}
		}

		for(let i=+range[0]; i <= +range[1]; i++)
		{
			pos = 0;
			let str:string = "";
			let elem:HTMLElement = tag.cloneNode() as HTMLElement;

			for (let a = 0; a < elem.attributes.length; a++)
			{
				let attr:Node = elem.attributes.item(a);
				attr.nodeValue = attr.nodeValue.replaceAll(index,i+"");
			}

			for (let r=0; r < replace.length; r++)
			{
				str += content.substring(pos,replace[r]) + i;
				pos = replace[r] + index.length;
			}

			if (pos < content.length)
				str += content.substring(pos);

			tags.push(elem);
			elem.innerHTML = str;
		}

		return(tags);
	}
}