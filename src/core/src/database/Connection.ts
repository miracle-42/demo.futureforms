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

import { Cursor } from "./Cursor.js";
import { SQLRest } from "./SQLRest.js";
import { BindValue } from "./BindValue.js";
import { Alert } from "../application/Alert.js";
import { ConnectionScope } from "./ConnectionScope.js";
import { Logger, Type } from "../application/Logger.js";
import { EventType } from "../control/events/EventType.js";
import { FormsModule } from "../application/FormsModule.js";
import { FormBacking } from "../application/FormBacking.js";
import { Connection as BaseConnection } from "../public/Connection.js";
import { FormEvent, FormEvents } from "../control/events/FormEvents.js";

export class Connection extends BaseConnection
{
	private locks$:number = 0;
	private trx$:object = null;
	private conn$:string = null;
	private touched$:Date = null;
	private modified$:Date = null;
	private keepalive$:number = 20;
	private running$:boolean = false;
	private tmowarn$:boolean = false;
	private authmethod$:string = null;
	private scope$:ConnectionScope = ConnectionScope.transactional;

	public static TRXTIMEOUT:number = 240;
	public static CONNTIMEOUT:number = 120;


	// Be able to get the real connection from the public
	private static conns$:Connection[] = [];


	public static getAllConnections() : Connection[]
	{
		return(this.conns$);
	}

	public constructor(url?:string|URL)
	{
		super(url);
		Connection.conns$.push(this);
	}

	public get locks() : number
	{
		return(this.locks$);
	}

	public get scope() : ConnectionScope
	{
		return(this.scope$);
	}

	public set scope(scope:ConnectionScope)
	{
		if (this.connected())
		{
			Alert.warning("Connection scope cannot be changed after connect","Database Connection");
			return;
		}
		this.scope$ = scope;
	}

	public get authmethod() : string
	{
		return(this.authmethod$);
	}

	public set authmethod(method:string)
	{
		this.authmethod$ = method;
	}

	public get transactional() : boolean
	{
		return(this.scope != ConnectionScope.stateless);
	}

	public connected() : boolean
	{
		return(this.conn$ != null);
	}

	public hasTransactions() : boolean
	{
		return(this.modified$ != null);
	}

	public hasKeepAlive() : boolean
	{
		return(this.running$);
	}

	public async connect(username?:string, password?:string, custom?:Map<string,any>) : Promise<boolean>
	{
		this.touched$ = null;
		this.tmowarn$ = false;

		let scope:string = null;

		switch(this.scope)
		{
			case ConnectionScope.stateless: scope = "stateless"; break;
			case ConnectionScope.dedicated: scope = "dedicated"; break;
			case ConnectionScope.transactional: scope = "transaction"; break;
		}

		let method:string = this.authmethod$;
		if (!method) method = "database";

		let payload:any =
		{
			"scope": scope,
			"auth.method": method
		};

		if (username)
			payload.username = username;

		if (password)
			payload["auth.secret"] = password;

		if (custom)
		{
			custom.forEach((value,name) =>
			  {payload[name] = value})
		}

		Logger.log(Type.database,"connect");
		let thread:number = FormsModule.get().showLoading("Connecting");
		let response:any = await this.post("connect",payload);
		FormsModule.get().hideLoading(thread);

		if (!response.success)
		{
			console.error(response);
			Alert.warning(response.message,"Database Connection");
			return(false);
		}

		if (response["version"])
			console.log("OpenRestDB Version: "+response.version);

		this.trx$ = new Object();
		this.conn$ = response.session;
		this.keepalive$ = (+response.timeout * 4/5)*1000;
		await FormEvents.raise(FormEvent.AppEvent(EventType.Connect));

		if (!this.running$)
			this.keepalive();

		return(true);
	}

	public async disconnect() : Promise<boolean>
	{
		this.tmowarn$ = false;
		this.trx$ = new Object();
		this.touched$ = new Date();

		Logger.log(Type.database,"disconnect");
		let response:any = await this.post("disconnect",{session: this.conn$});

		if (response.success)
		{
			this.conn$ = null;
			this.touched$ = null;
			this.modified$ = null;
		}

		await FormEvents.raise(FormEvent.AppEvent(EventType.Disconnect));
		return(response.success);
	}

	public async commit() : Promise<boolean>
	{
		if (this.modified$ == null)
			return(true);

		this.tmowarn$ = false;
		this.trx$ = new Object();
		this.touched$ = new Date();

		Logger.log(Type.database,"commit");
		let thread:number = FormsModule.get().showLoading("Comitting");
		let response:any = await this.post("commit",{session: this.conn$});
		FormsModule.get().hideLoading(thread);

		if (response.success)
		{
			this.locks$ = 0;
			this.touched$ = null;
			this.modified$ = null;
		}

		if (!response.success)
		{
			console.error(response);
			Alert.warning(response.message,"Database Connection");
			return(false);
		}

		return(true);
	}

	public async rollback() : Promise<boolean>
	{
		if (this.modified$ == null)
			return(true);

		this.tmowarn$ = false;
		this.trx$ = new Object();
		this.touched$ = new Date();

		Logger.log(Type.database,"rollback");
		let thread:number = FormsModule.get().showLoading("Rolling back");
		let response:any = await this.post("rollback",{session: this.conn$});
		FormsModule.get().hideLoading(thread);

		if (response.success)
		{
			this.locks$ = 0;
			this.touched$ = null;
			this.modified$ = null;
		}

		if (!response.success)
		{
			console.error(response);
			Alert.fatal(response.message,"Database Connection");
			return(false);
		}

		return(true);
	}

	public async select(sql:SQLRest, cursor:Cursor, rows:number, describe?:boolean) : Promise<Response>
	{
		if (describe == null)
			describe = false;

		let skip:number = 0;
		this.tmowarn$ = false;
		this.touched$ = new Date();
		if (this.modified$) this.modified$ = new Date();

		if (cursor && cursor.trx != this.trx$)
			skip = cursor.pos;

		if (cursor && this.scope == ConnectionScope.stateless)
			skip = cursor.pos;

		let payload:any =
		{
			rows: rows,
			skip: skip,
			compact: true,
			dateformat: "UTC",
			describe: describe,
			session: this.conn$,

			sql: sql.stmt,
			bindvalues: this.convert(sql.bindvalues)
		};

		if (cursor)
		{
			payload.cursor = cursor.name;

			cursor.rows = rows;
			cursor.pos += rows;
			cursor.trx = this.trx$;
			cursor.stmt = sql.stmt;
			cursor.bindvalues = sql.bindvalues;
		}

		Logger.log(Type.database,"select");
		let thread:number = FormsModule.get().showLoading("Querying");
		let response:any = await this.post("select",payload);
		FormsModule.get().hideLoading(thread);

		if (!response.success)
		{
			console.error(response);
			Alert.warning(response.message,"Database Connection");
			return(response);
		}

		if (cursor)
			cursor.eof = !response.more;

		return(response);
	}

	public async fetch(cursor:Cursor) : Promise<Response>
	{
		this.tmowarn$ = false;
		this.touched$ = new Date();
		let restore:boolean = false;
		if (this.modified$) this.modified$ = new Date();

		if (cursor.trx != this.trx$)
			restore = true;

		if (this.scope == ConnectionScope.stateless)
			restore = true;

		if (restore)
		{
			let sql:SQLRest = new SQLRest();

			sql.stmt = cursor.stmt;
			sql.bindvalues = cursor.bindvalues;

			return(this.select(sql,cursor,cursor.rows,false));
		}

		Logger.log(Type.database,"fetch");
		let payload:any = {session: this.conn$, cursor: cursor.name};
		let thread:number = FormsModule.get().showLoading("Fetching data");
		let response:any = await this.post("fetch",payload);
		FormsModule.get().hideLoading(thread);

		if (!response.success)
		{
			console.error(response);
			Alert.warning(response.message,"Database Connection");
			return(response);
		}

		cursor.eof = !response.more;
		cursor.pos += response.rows.length;

		return(response);
	}

	public async close(cursor:Cursor) : Promise<Response>
	{
		this.tmowarn$ = false;
		let response:any = null;
		if (this.modified$) this.modified$ = new Date();

		if (this.scope == ConnectionScope.stateless)
			return({success: true, message: null, rows: []});

		if (cursor.trx == this.trx$)
		{
			Logger.log(Type.database,"close cursor");

			let payload:any =
			{
				close: true,
				session: this.conn$,
				cursor: cursor.name
			};

			response = await this.post("fetch",payload);

			if (!response.success)
			{
				console.error(response);
				Alert.warning(response.message,"Database Connection");
				return(response);
			}
		}

		return(response);
	}

	public async lock(sql:SQLRest) : Promise<Response>
	{
		if (this.scope == ConnectionScope.stateless)
			return({success: true, message: null, rows: []});

		let response:any = null;
		let trxstart:boolean = this.modified$ == null;

		let payload:any =
		{
			rows: 1,
			compact: true,
			sql: sql.stmt,
			dateformat: "UTC",
			session: this.conn$,
			bindvalues: this.convert(sql.bindvalues)
		};

		this.tmowarn$ = false;
		this.touched$ = new Date();

		Logger.log(Type.database,"lock");
		let thread:number = FormsModule.get().showLoading("Locking");
		response = await this.post("select",payload);
		FormsModule.get().hideLoading(thread);

		if (!response.success)
		{
			console.error(response);
			console.error(new Error().stack);
			return(response);
		}

		this.locks$++;
		this.tmowarn$ = false;
		this.touched$ = new Date();
		this.modified$ = new Date();

		if (trxstart)
			await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));

		return(response);
	}

	public async refresh(sql:SQLRest) : Promise<Response>
	{
		let response:any = null;

		let payload:any =
		{
			rows: 1,
			compact: true,
			sql: sql.stmt,
			dateformat: "UTC",
			session: this.conn$,
			bindvalues: this.convert(sql.bindvalues)
		};

		this.tmowarn$ = false;
		this.touched$ = new Date();

		Logger.log(Type.database,"refresh");
		let thread:number = FormsModule.get().showLoading("Refresh row");
		response = await this.post("select",payload);
		FormsModule.get().hideLoading(thread);

		if (!response.success)
		{
			console.error(response);
			Alert.warning(response.message,"Database Connection");
			return(response);
		}

		return(response);
	}

	public async insert(sql:SQLRest) : Promise<Response>
	{
		let trxstart:boolean =
			this.modified$ == null && this.transactional;

		let payload:any =
		{
			sql: sql.stmt,
			dateformat: "UTC",
			session: this.conn$,
			bindvalues: this.convert(sql.bindvalues)
		};

		if (sql.returnclause)
			payload.returning = true;

		this.tmowarn$ = false;
		this.touched$ = new Date();

		Logger.log(Type.database,"insert");
		let thread:number = FormsModule.get().showLoading("Insert");
		let response:any = await this.post("insert",payload);
		FormsModule.get().hideLoading(thread);

		if (!response.success)
		{
			console.error(response);
			Alert.warning(response.message,"Database Connection");
			return(response);
		}

		this.tmowarn$ = false;
		this.touched$ = new Date();
		this.modified$ = new Date();

		if (trxstart)
			await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));

		return(response);
	}

	public async update(sql:SQLRest) : Promise<Response>
	{
		let trxstart:boolean =
			this.modified$ == null && this.transactional;

		let payload:any =
		{
			sql: sql.stmt,
			dateformat: "UTC",
			session: this.conn$,
			bindvalues: this.convert(sql.bindvalues)
		};

		if (sql.returnclause)
			payload.returning = true;

		this.tmowarn$ = false;
		this.touched$ = new Date();

		Logger.log(Type.database,"update");
		let thread:number = FormsModule.get().showLoading("Update");
		let response:any = await this.post("update",payload);
		FormsModule.get().hideLoading(thread);

		if (!response.success)
		{
			console.error(response);
			Alert.warning(response.message,"Database Connection");
			return(response);
		}

		this.tmowarn$ = false;
		this.touched$ = new Date();
		this.modified$ = new Date();

		if (trxstart)
			await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));

		return(response);
	}

	public async delete(sql:SQLRest) : Promise<Response>
	{
		let trxstart:boolean =
			this.modified$ == null && this.transactional;

		let payload:any =
		{
			sql: sql.stmt,
			dateformat: "UTC",
			session: this.conn$,
			bindvalues: this.convert(sql.bindvalues)
		};

		if (sql.returnclause)
			payload.returning = true;

		this.tmowarn$ = false;
		this.touched$ = new Date();

		Logger.log(Type.database,"delete");
		let thread:number = FormsModule.get().showLoading("Delete");
		let response:any = await this.post("delete",payload);
		FormsModule.get().hideLoading(thread);

		if (!response.success)
		{
			console.error(response);
			Alert.warning(response.message,"Database Connection");
			return(response);
		}

		this.tmowarn$ = false;
		this.touched$ = new Date();
		this.modified$ = new Date();

		if (trxstart)
			await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));

		return(response);
	}

	public async call(patch:boolean, sql:SQLRest) : Promise<Response>
	{
		let response:any = null;

		let trxstart:boolean =
			this.modified$ == null && this.transactional;

		let payload:any =
		{
			sql: sql.stmt,
			dateformat: "UTC",
			session: this.conn$,
			bindvalues: this.convert(sql.bindvalues)
		};

		this.tmowarn$ = false;
		this.touched$ = new Date();

		Logger.log(Type.database,"call");
		let thread:number = FormsModule.get().showLoading("Call procedure");
		if (patch) response = await this.patch("call",payload);
		else 		  response = await this.post("call",payload);
		FormsModule.get().hideLoading(thread);

		if (!response.success)
		{
			console.error(response);
			Alert.warning(response.message,"Database Connection");
			return(response);
		}

		this.tmowarn$ = false;
		this.touched$ = new Date();
		if (patch) this.modified$ = new Date();

		if (trxstart && patch)
			await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));

		return(response);
	}

	public async execute(patch:boolean, sql:SQLRest) : Promise<Response>
	{
		let response:any = null;

		let trxstart:boolean =
			this.modified$ == null && this.transactional;

		let payload:any =
		{
			sql: sql.stmt,
			dateformat: "UTC",
			session: this.conn$,
			bindvalues: this.convert(sql.bindvalues)
		};

		this.tmowarn$ = false;
		this.touched$ = new Date();

		Logger.log(Type.database,"execute");
		let thread:number = FormsModule.get().showLoading("Execute procedure");
		if (patch) response = await this.patch("call",payload);
		else 		  response = await this.post("call",payload);
		FormsModule.get().hideLoading(thread);

		if (!response.success)
		{
			console.error(response);
			Alert.warning(response.message,"Database Connection");
			return(response);
		}

		this.tmowarn$ = false;
		this.touched$ = new Date();
		if (patch) this.modified$ = new Date();

		if (trxstart && patch)
			await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));

		return(response);
	}

	private async keepalive() : Promise<void>
	{
		this.running$ = true;
		await FormsModule.sleep(this.keepalive$);

		if (!this.connected())
		{
			this.running$ = false;
			return;
		}

		let conn:string = this.conn$;
		let response:any = await this.post("ping",{session: this.conn$, keepalive: true});

		if (this.conn$ != conn)
		{
			this.touched$ = null;
			this.modified$ = null;
			this.tmowarn$ = false;
			this.keepalive();
			return;
		}

		if (!response.success)
		{
			this.conn$ = null;
			console.error(response);
			Alert.warning(response.message,"Database Connection");
			await FormEvents.raise(FormEvent.AppEvent(EventType.Disconnect));
			this.running$ = false;
			return(response);
		}

		if (response["session"])
			this.conn$ = response.session;

		if (this.scope == ConnectionScope.transactional)
		{
			if (this.modified$)
			{
				let idle:number = ((new Date()).getTime() - this.modified$.getTime())/1000;

				if (idle > Connection.TRXTIMEOUT && this.tmowarn$)
				{
					Alert.warning("Transaction is being rolled back","Database Connection");
					await FormBacking.rollback();
				}
				else
				{
					if (idle > Connection.TRXTIMEOUT*2/3 && !this.tmowarn$)
					{
						this.tmowarn$ = true;
						Alert.warning("Transaction will be rolled back in "+Connection.TRXTIMEOUT+" seconds","Database Connection");
					}
				}
			}

			if (this.touched$ && !this.modified$)
			{
				if ((new Date()).getTime() - this.touched$.getTime() > 1000 * Connection.CONNTIMEOUT)
					await this.rollback();

				this.touched$ = null;
				this.modified$ = null;
			}
		}

		this.keepalive();
	}

	private convert(bindv:BindValue[]) : any[]
	{
		let binds:any[] = [];
		if (bindv == null) return([]);

		bindv.forEach((b) =>
		{
			let value:any = b.value;

			if (value instanceof Date)
				value = value.getTime();

			if (b.outtype) binds.push({name: b.name, type: b.type});
			else
			{
				if (value == null) binds.push({name: b.name, type: b.type});
				else binds.push({name: b.name, value: value, type: b.type});
			}
		})

		return(binds);
	}
}

export class Response
{
	public rows:any[];
	public message:string = null;
	public success:boolean = true;
}