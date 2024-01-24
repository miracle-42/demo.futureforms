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
import { MSGGRP } from "../messages/Internal.js";
import { ConnectionScope } from "./ConnectionScope.js";
import { Logger, Type } from "../application/Logger.js";
import { Messages, Level } from "../messages/Messages.js";
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
	private nowait$:boolean = false;
	private running$:boolean = false;
	private tmowarn$:boolean = false;
	private authmethod$:string = null;
	private autocommit$:boolean = false;
	private attributes$:Map<string,any> = new Map<string,any>();
	private clientinfo$:Map<string,any> = new Map<string,any>();
	private scope$:ConnectionScope = ConnectionScope.transactional;

	public static MAXLOCKS:number = 32;
	public static TRXTIMEOUT:number = 240;
	public static LOCKINSPECT:number = 120;
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

	public set locks(locks:number)
	{
		let trxstart:boolean =
			this.modified == null && this.transactional;

		if (this.autocommit$)
			return;

		if (!this.modified)
			this.modified = new Date();

		this.locks$ = locks;

		if (trxstart)
			FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));
	}

	public get scope() : ConnectionScope
	{
		return(this.scope$);
	}

	public set scope(scope:ConnectionScope)
	{
		if (this.connected())
		{
			Messages.warn(MSGGRP.ORDB,1) // Connection scope cannot be changed after connect
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

	public addAttribute(name:string, value:any) : void
	{
		this.attributes$.set(name,value);
	}

	public deleteAttribute(name:string) : void
	{
		this.attributes$.delete(name);
	}

	public addClientInfo(name:string, value:any) : void
	{
		this.clientinfo$.set(name,value);
	}

	public deleteClientInfo(name:string) : void
	{
		this.clientinfo$.delete(name);
	}

	public connected() : boolean
	{
		return(this.conn$ != null);
	}

	public hasTransactions() : boolean
	{
		return(this.modified != null);
	}

	public hasKeepAlive() : boolean
	{
		return(this.running$);
	}

	public async connect(username?:string, password?:string, custom?:Map<string,any>) : Promise<boolean>
	{
		this.touched = null;
		this.tmowarn = false;

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

		if (this.clientinfo$.size > 0)
		{
			let info:{name:string, value:any}[] = [];
			this.clientinfo$.forEach((value,name) => info.push({name: name, value: value}));
			payload["clientinfo"] = info;
		}

		this.attributes$.forEach((value,name) =>
			{payload[name] = value})

		Logger.log(Type.database,"connect");
		let thread:number = FormsModule.showLoading("Connecting");
		let response:any = await this.post("connect",payload);
		FormsModule.hideLoading(thread);

		if (!response.success)
		{
			Messages.handle(MSGGRP.ORDB,response.message,Level.fine);
			return(false);
		}

		if (response["version"])
			console.log("OpenRestDB Version: "+response.version);

		this.trx$ = new Object();
		this.conn$ = response.session;
		this.nowait$ = response.nowait;
		this.autocommit$ = response.autocommit;
		this.keepalive$ = (+response.timeout * 4/5)*1000;

		if (this.keepalive$ > 4/5*Connection.LOCKINSPECT*1000)
			this.keepalive$ = 4/5*Connection.LOCKINSPECT*1000;

		await FormEvents.raise(FormEvent.AppEvent(EventType.Connect));

		if (!this.running$)
			this.keepalive();

		return(true);
	}

	public async disconnect() : Promise<boolean>
	{
		this.tmowarn = false;
		this.trx = new Object();
		this.touched = new Date();

		let payload:any =
		{
			session: this.conn$
		};

		this.attributes$.forEach((value,name) =>
			{payload[name] = value})

		Logger.log(Type.database,"disconnect");
		let response:any = await this.post("disconnect",payload);

		if (response.success)
		{
			this.conn$ = null;
			this.touched = null;
			this.modified = null;
		}

		await FormEvents.raise(FormEvent.AppEvent(EventType.Disconnect));
		return(response.success);
	}

	public async commit() : Promise<boolean>
	{
		if (this.modified == null)
			return(true);

		this.tmowarn = false;
		this.trx = new Object();
		this.touched = new Date();

		let payload:any =
		{
			session: this.conn$
		};

		this.attributes$.forEach((value,name) =>
			{payload[name] = value})

		Logger.log(Type.database,"commit");
		let thread:number = FormsModule.showLoading("Comitting");
		let response:any = await this.post("commit",payload);
		FormsModule.hideLoading(thread);

		if (response.success)
		{
			this.locks$ = 0;
			this.touched = null;
			this.modified = null;

			if (response["session"])
				this.conn$ = response.session;
		}

		if (!response.success)
		{
			Messages.handle(MSGGRP.TRX,response.message,Level.fine);
			return(false);
		}

		return(true);
	}

	public async rollback() : Promise<boolean>
	{
		if (!this.modified)
			return(true);

		this.tmowarn = false;

		let payload:any =
		{
			session: this.conn$
		};

		this.attributes$.forEach((value,name) =>
			{payload[name] = value})

		Logger.log(Type.database,"rollback");
		let thread:number = FormsModule.showLoading("Rolling back");
		let response:any = await this.post("rollback",payload);
		FormsModule.hideLoading(thread);

		if (response.success)
		{
			this.locks$ = 0;
			this.touched = null;
			this.modified = null;
			this.trx = new Object();

			if (response["session"])
				this.conn$ = response.session;
		}

		if (!response.success)
		{
			Messages.handle(MSGGRP.TRX,response.message,Level.fine);
			return(false);
		}

		return(true);
	}

	public async release() : Promise<boolean>
	{
		this.tmowarn = false;

		let payload:any =
		{
			session: this.conn$
		};

		this.attributes$.forEach((value,name) =>
			{payload[name] = value})

		Logger.log(Type.database,"release");
		let thread:number = FormsModule.showLoading("Releasing connection");
		let response:any = await this.post("release",payload);
		FormsModule.hideLoading(thread);

		if (response.success)
		{
			this.locks$ = 0;
			this.touched = null;
			this.modified = null;
		}

		if (!response.success)
		{
			Messages.handle(MSGGRP.TRX,response.message,Level.fine);
			return(false);
		}

		return(true);
	}

	public async select(sql:SQLRest, cursor:Cursor, rows:number, describe?:boolean) : Promise<Response>
	{
		if (describe == null)
			describe = false;

		let skip:number = 0;
		this.tmowarn = false;
		this.touched = new Date();
		if (this.modified) this.modified = new Date();

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

		if (sql.attributes)
		{
			sql.attributes.forEach((entry) =>
			{payload[entry.name] = entry.value;})
		}

		this.attributes$.forEach((value,name) =>
			{payload[name] = value})

		Logger.log(Type.database,"select");
		let thread:number = FormsModule.showLoading("Querying");
		let response:any = await this.post("select",payload);
		FormsModule.hideLoading(thread);

		if (!response.success)
		{
			Messages.handle(MSGGRP.SQL,response.message,Level.fine);
			return(response);
		}

		if (cursor)
			cursor.eof = !response.more;

		if (response["session"])
			this.conn$ = response.session;

		return(response);
	}

	public async fetch(cursor:Cursor) : Promise<Response>
	{
		this.tmowarn = false;
		this.touched = new Date();
		let restore:boolean = false;
		if (this.modified) this.modified = new Date();

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

		let payload:any = {session: this.conn$, cursor: cursor.name};

		this.attributes$.forEach((value,name) =>
			{payload[name] = value})

		Logger.log(Type.database,"fetch");
		let thread:number = FormsModule.showLoading("Fetching data");
		let response:any = await this.post("fetch",payload);
		FormsModule.hideLoading(thread);

		if (!response.success)
		{
			Messages.handle(MSGGRP.SQL,response.message,Level.fine);
			return(response);
		}

		cursor.eof = !response.more;
		cursor.pos += response.rows.length;

		if (response["session"])
			this.conn$ = response.session;

		return(response);
	}

	public async close(cursor:Cursor) : Promise<Response>
	{
		this.tmowarn = false;
		let response:any = null;
		if (this.modified) this.modified = new Date();

		if (this.scope == ConnectionScope.stateless)
			return({success: true, message: null, rows: []});

		if (cursor.trx == this.trx)
		{
			let payload:any =
			{
				close: true,
				session: this.conn$,
				cursor: cursor.name
			};

			this.attributes$.forEach((value,name) =>
				{payload[name] = value})

			response = await this.post("fetch",payload);

			if (!response.success)
			{
				Messages.handle(MSGGRP.SQL,response.message,Level.fine);
				return(response);
			}

			if (response["session"])
				this.conn$ = response.session;
		}

		return(response);
	}

	public async lock(sql:SQLRest) : Promise<Response>
	{
		if (this.scope == ConnectionScope.stateless)
			return({success: true, message: null, rows: []});

		let response:any = null;
		let trxstart:boolean = this.modified == null;

		if (this.nowait$)
			sql.stmt += " nowait";

		let payload:any =
		{
			rows: 1,
			compact: true,
			sql: sql.stmt,
			dateformat: "UTC",
			session: this.conn$,
			bindvalues: this.convert(sql.bindvalues)
		};

		if (sql.attributes)
		{
			sql.attributes.forEach((entry) =>
			{payload[entry.name] = entry.value;})
		}

		if (sql.assert)
			payload.assert = this.convert(sql.assert);

		this.attributes$.forEach((value,name) =>
			{payload[name] = value})

		this.tmowarn = false;
		this.touched = new Date();

		Logger.log(Type.database,"lock");
		let thread:number = FormsModule.showLoading("Locking");
		response = await this.post("select",payload);
		FormsModule.hideLoading(thread);

		if (!response.success)
		{
			if (response.assert == null)
			{
				Messages.handle(MSGGRP.ORDB,response,Level.info);
				return(response);
			}
		}

		this.locks$++;
		this.tmowarn = false;
		this.touched = new Date();
		this.modified = new Date();

		if (response["session"])
			this.conn$ = response.session;

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

		if (sql.attributes)
		{
			sql.attributes.forEach((entry) =>
			{payload[entry.name] = entry.value;})
		}

		this.attributes$.forEach((value,name) =>
			{payload[name] = value})

		this.tmowarn = false;
		this.touched = new Date();

		Logger.log(Type.database,"refresh");
		let thread:number = FormsModule.showLoading("Refresh row");
		response = await this.post("select",payload);
		FormsModule.hideLoading(thread);

		if (!response.success)
		{
			Messages.handle(MSGGRP.SQL,response.message,Level.fine);
			return(response);
		}

		if (response["session"])
			this.conn$ = response.session;

		return(response);
	}

	public async insert(sql:SQLRest) : Promise<Response>
	{
		let trxstart:boolean =
			this.modified == null && this.transactional;

		let payload:any =
		{
			sql: sql.stmt,
			dateformat: "UTC",
			session: this.conn$,
			bindvalues: this.convert(sql.bindvalues)
		};

		if (sql.returnclause)
			payload.returning = true;

		if (sql.attributes)
		{
			sql.attributes.forEach((entry) =>
			{payload[entry.name] = entry.value;})
		}

		this.attributes$.forEach((value,name) =>
			{payload[name] = value})

		this.tmowarn = false;
		this.touched = new Date();

		Logger.log(Type.database,"insert");
		let thread:number = FormsModule.showLoading("Insert");
		let response:any = await this.post("insert",payload);
		FormsModule.hideLoading(thread);

		if (!response.success)
		{
			Messages.handle(MSGGRP.SQL,response.message,Level.fine);
			return(response);
		}

		this.tmowarn = false;
		this.touched = new Date();
		this.modified = new Date();

		if (response["session"])
			this.conn$ = response.session;

		if (trxstart)
			await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));

		return(response);
	}

	public async update(sql:SQLRest) : Promise<Response>
	{
		let trxstart:boolean =
			this.modified == null && this.transactional;

		let payload:any =
		{
			sql: sql.stmt,
			dateformat: "UTC",
			session: this.conn$,
			bindvalues: this.convert(sql.bindvalues)
		};

		if (sql.returnclause)
			payload.returning = true;

		if (sql.attributes)
		{
			sql.attributes.forEach((entry) =>
			{payload[entry.name] = entry.value;})
		}

		if (sql.assert)
			payload.assert = this.convert(sql.assert);

		this.attributes$.forEach((value,name) =>
			{payload[name] = value})

		this.tmowarn = false;
		this.touched = new Date();

		Logger.log(Type.database,"update");
		let thread:number = FormsModule.showLoading("Update");
		let response:any = await this.post("update",payload);
		FormsModule.hideLoading(thread);

		if (!response.success)
		{
			if (response.assert == null)
			{
				console.error(response);
				return(response);
			}
		}

		this.tmowarn = false;
		this.touched = new Date();
		this.modified = new Date();

		if (response["session"])
			this.conn$ = response.session;

		if (sql.assert && !this.autocommit$)
			this.locks$++;

		if (trxstart)
			await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));

		return(response);
	}

	public async script(steps:Step[], attributes?:{name:string, value:object}[]) : Promise<any>
	{
		let request:any[] = [];
		steps.forEach((stmt) =>
		{
			let step:any =
			{
				path: stmt.path,
				payload:
				{
					sql: stmt.stmt,
					dateformat: "UTC"
				}
			}

			if (stmt.returnclause)
				step.payload.returning = true;

			if (stmt.attributes)
			{
				stmt.attributes.forEach((entry) =>
				{step.payload[entry.name] = entry.value;})
			}

			if (stmt.assert)
				step.payload.assert = this.convert(stmt.assert);

			this.attributes$.forEach((value,name) =>
				{step.payload[name] = value})

			step.payload.bindvalues = this.convert(stmt.bindvalues);

			request.push(step);
		});

		let script:any =
		{
			script: request,
			session: this.conn$
		};

		if (attributes)
		{
			attributes.forEach((entry) =>
			{script[entry.name] = entry.value;})
		}

		Logger.log(Type.database,"script");
		let thread:number = FormsModule.showLoading("script");
		let response:any = await this.post("script",script);
		FormsModule.hideLoading(thread);

		this.tmowarn = false;
		this.touched = new Date();
		this.modified = new Date();

		if (!response.success)
		{
			if (response.assert == null)
			{
				console.error(response);
				return(response);
			}
		}

		if (response["session"])
			this.conn$ = response.session;

		return(response);
	}

	public async batch(stmts:Step[], attributes?:{name:string, value:object}[]) : Promise<any[]>
	{
		if (!stmts || stmts.length == 0)
		{
			console.error("Nothing to do");
			return([]);
		}

		let trxstart:boolean =
			this.modified == null && this.transactional;

		let request:any[] = [];
		stmts.forEach((stmt) =>
		{
			let step:any =
			{
				path: stmt.path,
				payload:
				{
					sql: stmt.stmt,
					dateformat: "UTC"
				}
			}

			if (stmt.returnclause)
				step.payload.returning = true;

			if (stmt.attributes)
			{
				stmt.attributes.forEach((entry) =>
				{step.payload[entry.name] = entry.value;})
			}

			if (stmt.assert)
				step.payload.assert = this.convert(stmt.assert);

			this.attributes$.forEach((value,name) =>
				{step.payload[name] = value})

			step.payload.bindvalues = this.convert(stmt.bindvalues);

			request.push(step);
		});

		let batch:any =
		{
			batch: request,
			session: this.conn$
		};

		if (attributes)
		{
			attributes.forEach((entry) =>
			{batch[entry.name] = entry.value;})
		}

		Logger.log(Type.database,"batch");
		let thread:number = FormsModule.showLoading("batch");
		let response:any = await this.post("batch",batch);
		FormsModule.hideLoading(thread);

		let locks:number = this.locks$;
		let steps:any[] = response.steps;

		if (!steps || steps.length == 0)
		{
			console.error("No response");
			return([]);
		}

		for (let i = 0; i < steps.length; i++)
		{
			let resp:any = steps[i];

			if (resp.success && !this.autocommit$)
			{
				if (stmts[i].path == "update") this.locks$++;
				else if (stmts[i].path == "delete") this.locks$++;
			}
		}

		this.tmowarn = false;
		this.touched = new Date();
		this.modified = new Date();

		if (response["session"])
			this.conn$ = response.session;

		if (trxstart && this.locks$ > locks)
			await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));

		return(steps);
	}

	public async delete(sql:SQLRest) : Promise<Response>
	{
		let trxstart:boolean =
			this.modified == null && this.transactional;

		let payload:any =
		{
			sql: sql.stmt,
			dateformat: "UTC",
			session: this.conn$,
			bindvalues: this.convert(sql.bindvalues)
		};

		if (sql.returnclause)
			payload.returning = true;

		if (sql.assert)
			payload.assert = this.convert(sql.assert);

		this.attributes$.forEach((value,name) =>
			{payload[name] = value})

		this.tmowarn = false;
		this.touched = new Date();

		Logger.log(Type.database,"delete");
		let thread:number = FormsModule.showLoading("Delete");
		let response:any = await this.post("delete",payload);
		FormsModule.hideLoading(thread);

		if (!response.success)
		{
			if (response.assert == null)
			{
				console.error(response);
				return(response);
			}
		}

		this.tmowarn = false;
		this.touched = new Date();
		this.modified = new Date();

		if (response["session"])
			this.conn$ = response.session;

		if (sql.assert && !this.autocommit$)
			this.locks$++;

		if (trxstart)
			await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));

		return(response);
	}

	public async call(patch:boolean, sql:SQLRest) : Promise<Response>
	{
		let response:any = null;

		let trxstart:boolean =
			this.modified == null && this.transactional;

		let payload:any =
		{
			sql: sql.stmt,
			dateformat: "UTC",
			session: this.conn$,
			bindvalues: this.convert(sql.bindvalues)
		};

		this.attributes$.forEach((value,name) =>
			{payload[name] = value})

		this.tmowarn = false;
		this.touched = new Date();

		Logger.log(Type.database,"call");
		let thread:number = FormsModule.showLoading("Call procedure");
		if (patch) response = await this.patch("call",payload);
		else 		  response = await this.post("call",payload);
		FormsModule.hideLoading(thread);

		if (!response.success)
		{
			Messages.handle(MSGGRP.SQL,response.message,Level.fine);
			return(response);
		}

		this.tmowarn = false;
		this.touched = new Date();

		if (patch)
			this.modified = new Date();

		if (response["session"])
			this.conn$ = response.session;

		if (trxstart && patch)
			await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));

		return(response);
	}

	public async execute(patch:boolean, sql:SQLRest) : Promise<Response>
	{
		let response:any = null;

		let trxstart:boolean =
			this.modified == null && this.transactional;

		let payload:any =
		{
			sql: sql.stmt,
			dateformat: "UTC",
			session: this.conn$,
			bindvalues: this.convert(sql.bindvalues)
		};

		this.attributes$.forEach((value,name) =>
			{payload[name] = value})

		this.tmowarn = false;
		this.touched = new Date();

		Logger.log(Type.database,"execute");
		let thread:number = FormsModule.showLoading("Execute procedure");
		if (patch) response = await this.patch("call",payload);
		else 		  response = await this.post("call",payload);
		FormsModule.hideLoading(thread);

		if (!response.success)
		{
			Messages.handle(MSGGRP.SQL,response.message,Level.fine);
			return(response);
		}

		this.tmowarn = false;
		this.touched = new Date();

		if (patch)
			this.modified = new Date();

		if (response["session"])
			this.conn$ = response.session;

		if (trxstart && patch)
			await FormEvents.raise(FormEvent.AppEvent(EventType.OnTransaction));

		return(response);
	}

	private get trx() : object
	{
		return(this.trx$);
	}

	private set trx(trx:object)
	{
		this.trx$ = trx;
	}

	private get tmowarn() : boolean
	{
		return(this.tmowarn$);
	}

	private set tmowarn(flag:boolean)
	{
		this.tmowarn$ = flag;
	}

	private get touched() : Date
	{
		return(this.touched$);
	}

	private set touched(date:Date)
	{
		this.touched$ = date;
	}

	private get modified() : Date
	{
		return(this.modified$);
	}

	private set modified(date:Date)
	{
		this.modified$ = date;
	}

	private async keepalive() : Promise<void>
	{
		this.running$ = true;
		await FormsModule.sleep(this.keepalive$);

		if (this.touched$)
		{
			let now:number = (new Date()).getTime();
			let next:number = this.touched$.getTime() + this.keepalive$;

			let nap:number = next - now;
			if (nap > 1000) await FormsModule.sleep(nap);
		}

		if (!this.connected())
		{
			this.running$ = false;
			return;
		}

		let conn:string = this.conn$;
		let response:any = await this.post("ping",{session: this.conn$, keepalive: true});

		if (this.conn$ != conn)
		{
			this.touched = null;
			this.modified = null;
			this.tmowarn = false;
			this.keepalive();
			return;
		}

		if (!response.success)
		{
			this.conn$ = null;
			Messages.handle(MSGGRP.ORDB,response.message,Level.warn);
			await FormEvents.raise(FormEvent.AppEvent(EventType.Disconnect));
			this.running$ = false;
			return(response);
		}

		if (response["session"])
			this.conn$ = response.session;

		let idle:number = 0;

		if (this.modified)
			idle = ((new Date()).getTime() - this.modified.getTime())/1000;

		if (this.scope != ConnectionScope.stateless)
		{
			if (this.locks >= Connection.MAXLOCKS)
			{
				if (!this.tmowarn$)
				{
					this.tmowarn = true;
					Messages.warn(MSGGRP.TRX,6,Connection.TRXTIMEOUT); // Maximum number of locks reached
				}
				else
				{
					Messages.warn(MSGGRP.TRX,7); // Transaction is being rolled back
					await FormBacking.rollback();
				}
			}
		}

		if (this.scope == ConnectionScope.transactional)
		{
			if (this.modified)
			{
				if (idle > Connection.TRXTIMEOUT && this.tmowarn)
				{
					Messages.warn(MSGGRP.TRX,7); // Transaction is being rolled back
					await FormBacking.rollback();
				}
				else
				{
					if (idle > Connection.TRXTIMEOUT*2/3 && !this.tmowarn)
					{
						this.tmowarn = true;
						Messages.warn(MSGGRP.TRX,8,Connection.TRXTIMEOUT); // Transaction will be rolled back
					}
				}
			}

			else

			if (this.touched)
			{
				idle = ((new Date()).getTime() - this.touched.getTime())/1000;
				if (idle > Connection.CONNTIMEOUT) await this.release();
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

export class Step extends SQLRest
{
	public path:string;
}