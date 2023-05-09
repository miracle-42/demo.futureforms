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
import { Form } from "../../public/Form.js";
import { Properties } from "../Properties.js";
import { FormBacking } from "../FormBacking.js";

export class RowIndicator implements Tag
{
	public row:number = -1;
	public binding:string = null;
	public element:HTMLElement = null;

	public parse(component:any, tag:HTMLElement, attr:string) : HTMLElement
	{
		let row:string = tag.getAttribute("row");
		let binding:string = tag.getAttribute(attr);
		if (attr != Properties.BindAttr) tag.removeAttribute(attr);

		if (row == null)
			throw "@Indicator: row attribute missing";

		if (isNaN(+row))
			throw "@Indicator: row attribute is not a number";

		if (!(component instanceof Form))
			throw "@Indicator: Indicators cannot be placed on non-forms "+component.constructor.name;

		this.row = +row;
		this.element = tag;
		this.binding = binding;

		FormBacking.getViewForm(component,true)?.addIndicator(this);
		return(tag);
	}
}