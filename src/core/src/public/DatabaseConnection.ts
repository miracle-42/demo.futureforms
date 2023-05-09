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

import { ConnectionScope } from "../database/ConnectionScope.js";
import { Connection as RestConnection } from "../database/Connection.js";

export class DatabaseConnection
{
	private conn$:RestConnection = null;

	public static get TRXTIMEOUT() : number
	{
		return(RestConnection.TRXTIMEOUT);
	}

	public static set TRXTIMEOUT(timeout:number)
	{
		RestConnection.TRXTIMEOUT = timeout;
	}

	public static get CONNTIMEOUT() : number
	{
		return(RestConnection.CONNTIMEOUT);
	}

	public static set CONNTIMEOUT(timeout:number)
	{
		RestConnection.CONNTIMEOUT = timeout;
	}

	public constructor(url?:string|URL)
	{
		this.conn$ = new RestConnection(url);
	}

	public get scope() : ConnectionScope
	{
		return(this.conn$.scope);
	}

	public set scope(scope:ConnectionScope)
	{
		this.conn$.scope = scope;
	}

	public set preAuthenticated(secret:string)
	{
		this.conn$.preAuthenticated = secret;
	}

	public async connect(username?:string, password?:string) : Promise<boolean>
	{
		return(this.conn$.connect(username,password));
	}

	public async disconnect() : Promise<boolean>
	{
		return(this.conn$.disconnect());
	}

	public connected() : boolean
	{
		return(this.conn$.connected());
	}

	public async commit() : Promise<boolean>
	{
		return(this.conn$.commit());
	}

	public async rollback() : Promise<boolean>
	{
		return(this.conn$.rollback());
	}

	public async sleep(ms:number) : Promise<void>
	{
		await this.conn$.sleep(ms);
	}
}