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

import { DataMapper, Tier } from "forms42core";

export class LinkMapper implements DataMapper
{
	private value:any = null;
	private ivalue:string = null;
	private link:HTMLAnchorElement = this.createLink();

	public getValue(tier:Tier) : any
	{
		if (tier == Tier.Frontend) return(this.link);
		else					   return(this.value);
	}

	public setValue(tier:Tier, value:any) : void
	{
		if (tier == Tier.Backend)
		{
			this.value = value;
			if (value == null) value = "";
			let text:Node = this.link.firstChild;

			this.link.title = value;
			text.textContent = value;
			this.link.href = "https://"+value;
		}
	}

	public getIntermediateValue(tier:Tier) : string
	{
		if (tier == Tier.Frontend) return(this.ivalue);
		else					   return(this.value+"");
	}

	public setIntermediateValue(tier:Tier, value:string) : void
	{
		this.ivalue = value;
		this.setValue(tier,value);
	}

	private createLink() : HTMLAnchorElement
	{
		let link:HTMLAnchorElement = document.createElement("a");
		link.append(document.createTextNode(""));
		link.target = "_blank";
		return(link);
	}
}