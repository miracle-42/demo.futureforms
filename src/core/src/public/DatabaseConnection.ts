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

/**
 * Connection to DatabaseJS.
 */
export class DatabaseConnection
{
	private conn$:RestConnection = null;

	/** Transaction timeout in seconds, only with scope=transactional */
	public static get TRXTIMEOUT() : number
	{
		return(RestConnection.TRXTIMEOUT);
	}

	/** Transaction timeout in seconds, only with scope=transactional */
	public static set TRXTIMEOUT(timeout:number)
	{
		RestConnection.TRXTIMEOUT = timeout;
	}

	/** Lock timeout in seconds, only with scope!=stateless */
	public static get LOCKTIMEOUT() : number
	{
		return(RestConnection.LOCKTIMEOUT);
	}

	/** Lock timeout in seconds, only with scope!=stateless */
	public static set LOCKTIMEOUT(timeout:number)
	{
		RestConnection.LOCKTIMEOUT = timeout;
	}

	/** Connection timeout in seconds, only with scope=transactional */
	public static get CONNTIMEOUT() : number
	{
		return(RestConnection.CONNTIMEOUT);
	}

	/** Connection timeout in seconds, only with scope=transactional */
	public static set CONNTIMEOUT(timeout:number)
	{
		RestConnection.CONNTIMEOUT = timeout;
	}

	/** See connection */
	public constructor(url?:string|URL)
	{
		this.conn$ = new RestConnection(url);
	}

	/** Number of row locks */
	public get locks() : number
	{
		return(this.conn$.locks);
	}

	/** Number of row locks */
	public set locks(locks:number)
	{
		this.conn$.locks = locks;
	}

	/** The connection scope */
	public get scope() : ConnectionScope
	{
		return(this.conn$.scope);
	}

	/** The connection scope */
	public set scope(scope:ConnectionScope)
	{
		this.conn$.scope = scope;
	}

	/** The authorization method */
	public get authmethod() : string
	{
		return(this.conn$.authmethod);
	}

	/** The authorization method */
	public set authmethod(method:string)
	{
		this.conn$.authmethod = method;
	}

	/** Is connection scope transactional */
	public get transactional() : boolean
	{
		return(this.conn$.transactional);
	}

	/** Connect to database */
	public async connect(username?:string, password?:string, custom?:Map<string,any>) : Promise<boolean>
	{
		return(this.conn$.connect(username,password,custom));
	}

	/** Disconnect from database */
	public async disconnect() : Promise<boolean>
	{
		return(this.conn$.disconnect());
	}

	/** Is connected to database */
	public connected() : boolean
	{
		return(this.conn$.connected());
	}

	/** Commit all transactions */
	public async commit() : Promise<boolean>
	{
		return(this.conn$.commit());
	}

	/** Rollback all transactions */
	public async rollback() : Promise<boolean>
	{
		return(this.conn$.rollback());
	}
}