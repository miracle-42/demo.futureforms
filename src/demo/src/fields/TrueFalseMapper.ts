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


//Demo: Convert backend boolean to Y/N flag

import { DataMapper, Tier } from "forms42core";

export class TrueFalseMapper implements DataMapper
{
	private value:{frontend:string, backend:string} = {frontend: null, backend: null};

	private static back2front:Map<string,string> = new Map<string,string>
	(
		[
			["true","Y"],
			["false","N"]
		]
	)

	private static front2back:Map<string,string> = new Map<string,string>
	(
		[
			["Y","true"],
			["N","false"]
		]
	)

	public getValue(tier:Tier) : any
	{
		if (tier == Tier.Backend) return(this.value.backend);
		else					  		  return(this.value.frontend);
	}

	public setValue(tier:Tier, value:any) : void
	{
		if (tier == Tier.Frontend)
		{
			this.value.frontend = value;
			this.value.backend = TrueFalseMapper.front2back.get(value);
		}
		else
		{
			this.value.backend = value;
			this.value.frontend = TrueFalseMapper.back2front.get(value);
		}
	}

	public getIntermediateValue(tier:Tier) : string
	{
		if (tier == Tier.Backend) return(this.value.backend);
		else 					  		  return(this.value.frontend);
	}

	public setIntermediateValue(tier:Tier, value:string) : void
	{
		if (tier == Tier.Backend)
		{
			this.value.backend = value;
			this.value.frontend = TrueFalseMapper.back2front.get(value);
		}
		else
		{
			this.value.frontend = value;
			this.value.backend = TrueFalseMapper.front2back.get(value);
		}
	}

	public toString() : string
	{
		return("value: ["+this.value.frontend+","+this.value.backend+"]")
	}
}