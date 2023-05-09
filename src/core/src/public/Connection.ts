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

import { FlightRecorder } from "../application/FlightRecorder.js";

export class Connection
{
	private base$:URL = null;
	private usr$:string = null;
	private pwd$:string = null;
	private headers$:any = {};
	private method$:string = null;
	private success$:boolean = true;

	public constructor(url?:string|URL)
	{
		if (url == null)
			url = window.location.origin;

		if (typeof url === "string")
			url = new URL(url);

		this.base$ = url;
	}

	public get baseURL() : URL
	{
		return(this.base$);
	}

	public get username() : string
	{
		return(this.usr$);
	}

	public set username(username:string)
	{
		this.usr$ = username;
	}

	public get password() : string
	{
		return(this.pwd$);
	}

	public set password(password:string)
	{
		this.pwd$ = password;
	}

	public get success() : boolean
	{
		return(this.success$);
	}

	public get headers() : any
	{
		return(this.headers$);
	}

	public set headers(headers:any)
	{
		this.headers$ = headers;
	}

	public set baseURL(url:string|URL)
	{
		if (typeof url === "string")
			url = new URL(url);

		this.base$ = url;
	}

	public async get(url?:string|URL, raw?:boolean) : Promise<any>
	{
		this.method$ = "GET";
		return(this.invoke(url,null,raw));
	}

	public async post(url?:string|URL, payload?:string|any, raw?:boolean) : Promise<any>
	{
		this.method$ = "POST";
		return(this.invoke(url,payload,raw));
	}

	public async patch(url?:string|URL, payload?:string|any, raw?:boolean) : Promise<any>
	{
		this.method$ = "PATCH";
		return(this.invoke(url,payload,raw));
	}

	private async invoke(url:string|URL, payload:string|any, raw:boolean) : Promise<any>
	{
		let body:any = null;
		this.success$ = true;

		let endpoint:URL = new URL(this.base$);
		if (url) endpoint = new URL(url,endpoint);

		if (payload)
		{
			if (typeof payload != "string")
				payload = JSON.stringify(payload);
		}

		if (!endpoint.toString().endsWith("ping"))
			FlightRecorder.add("@connection: "+endpoint+(payload ? " "+JSON.stringify(payload) : ""))

		let http:any = await fetch(endpoint,
		{
			method 	: this.method$,
			headers 	: this.headers$,
			body 		: payload
		}).
		catch((errmsg) =>
		{
			if (raw) body = errmsg;
			else body =
			{
				success: false,
				message: errmsg
			};

			this.success$ = false;
		});

		if (this.success$)
		{
			if (raw) body = await http.text();
			else		body = await http.json();
		}

		return(body);
	}
}