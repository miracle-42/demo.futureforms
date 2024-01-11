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

import { SQLRest } from "./SQLRest.js";
import { DataType } from "./DataType.js";
import { Connection } from "./Connection.js";
import { MSGGRP } from "../messages/Internal.js";
import { Messages } from "../messages/Messages.js";
import { SQLRestBuilder } from "./SQLRestBuilder.js";
import { Parameter, ParameterType } from "./Parameter.js";
import { DatabaseConnection } from "../public/DatabaseConnection.js";

/**
 * StoredProcedure is used with OpenRestDB to execute
 * a stored procedure
 */
export class StoredProcedure
{
	private name$:string;
	private response$:any = null;
	private patch$:boolean = false;
	private message$:string = null;
	private conn$:Connection = null;
	private params$:Parameter[] = [];
	private values$:Map<string,any> = new Map<string,any>();
	private datetypes$:DataType[] = [DataType.date, DataType.datetime, DataType.timestamp];

	protected retparm$:string = null;
	protected returntype$:DataType|string = null;

	/** @param connection : A connection to OpenRestDB */
	public constructor(connection:DatabaseConnection)
	{
		if (connection == null)
		{
			// Cannot create object when onnection is null
			Messages.severe(MSGGRP.ORDB,2,this.constructor.name);
			return;
		}

		this.conn$ = connection["conn$"];
	}

	/** If the procedure changes any values the backend */
	public set patch(flag:boolean)
	{
		this.patch$ = flag;
	}

	/** The error message from the backend */
	public error() : string
	{
		return(this.message$);
	}

	/** The name of the stored procedure */
	public setName(name:string) : void
	{
		this.name$ = name;
	}

	/** Add call parameter */
	public addParameter(name:string, value:any, datatype?:DataType|string, paramtype?:ParameterType) : void
	{
		let param:Parameter = new Parameter(name,value,datatype,paramtype);
		this.params$.push(param);
	}

	/** Get out parameter */
	public getOutParameter(name:string) : any
	{
		return(this.values$.get(name?.toLowerCase()));
	}

	/** Get out parameter names */
	public getOutParameterNames() : string[]
	{
		return([...this.values$.keys()]);
	}

	/** Execute the procedure */
	public async execute() : Promise<boolean>
	{
		let value:any = null;
		let name:string = null;
		let dates:string[] = [];
		let names:string[] = null;
		let unique:boolean = false;
		let retparam:Parameter = null;

		if (this.returntype$ != null)
		{
			this.retparm$ = "retval";

			while(!unique)
			{
				unique = true;

				for (let i = 0; i < this.params$.length; i++)
				{
					if (this.params$[i].name == this.retparm$)
					{
						unique = false;
						this.retparm$ += "0";
					}
				}
			}

			retparam = new Parameter(this.retparm$,null,this.returntype$,ParameterType.out);
		}

		let sql:SQLRest = SQLRestBuilder.proc(this.name$,this.params$,retparam);
		this.response$ = await this.conn$.call(this.patch$,sql);

		if (!this.response$.success)
		{
			this.message$ = this.response$.message;
			return(false);
		}

		if (this.returntype$ != null)
			this.params$.unshift(retparam);

		names = Object.keys(this.response$);

		this.params$.forEach((param) =>
		{
			let bn:string = param.name?.toLowerCase();
			let dt:DataType = DataType[param.dtype?.toLowerCase()];

			if (this.datetypes$.includes(dt))
				dates.push(bn)
		})

		for (let i = 1; i < names.length; i++)
		{
			name = names[i].toLowerCase();
			value = this.response$[names[i]];

			if (dates.includes(name))
				value = new Date(value);

			this.values$.set(name,value);
		}

		return(true);
	}
}