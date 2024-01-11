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

import { KeyMap } from "./KeyMap.js";
import { MouseMap } from "./MouseMap.js";
import { MenuEvent } from "./MenuEvent.js";
import { Form } from "../../public/Form.js";
import { CustomEvent } from "./CustomEvent.js";
import { EventFilter } from "./EventFilter.js";
import { EventListener } from "./EventListener.js";
import { MSGGRP } from "../../messages/Internal.js";
import { Messages } from "../../messages/Messages.js";
import { EventGroup, EventType } from "./EventType.js";
import { FormEvent as Interface } from "./FormEvent.js";
import { MenuComponent } from "../menus/MenuComponent.js";
import { Framework } from "../../application/Framework.js";
import { Logger, Type } from "../../application/Logger.js";
import { ApplicationHandler } from "./ApplicationHandler.js";
import { FlightRecorder } from "../../application/FlightRecorder.js";
import { FieldInstance as ViewFieldInstance } from "../../view/fields/FieldInstance.js";

export class KeyEventSource
{
	constructor(public key:KeyMap, public field:string, public block:string, public record:number, public form:Form) {}
}

export class FormEvent implements Interface, MenuEvent, CustomEvent
{
	public static AppEvent(type:EventType, source?:any) : FormEvent
	{
		let event:FormEvent = new FormEvent(type,null);
		if (source) event.source$ = source;
		return(event);
	}

	public static FormEvent(type:EventType, form:Form) : FormEvent
	{
		return(new FormEvent(type,form));
	}

	public static BlockEvent(type:EventType, form:Form, block:string, inst?:ViewFieldInstance|string) : FormEvent
	{
		return(new FormEvent(type,form,inst,block));
	}

	public static FieldEvent(type:EventType, inst:ViewFieldInstance) : FormEvent
	{
		return(new FormEvent(type,inst.field.block.form.parent,inst));
	}

	public static KeyEvent(form:Form, inst:ViewFieldInstance, key:KeyMap) : FormEvent
	{
		return(new FormEvent(EventType.Key,form,inst,inst?.block,key));
	}

	public static MouseEvent(form:Form, event:MouseMap, inst?:ViewFieldInstance, block?:string) : FormEvent
	{
		return(new FormEvent(EventType.Mouse,form,inst,inst != null ? inst.block : block,null,event));
	}

	private source$:any = null;

	private constructor
		(
			private type$:EventType,
			private form$:Form, private inst?:ViewFieldInstance|string,
			private block$?:string, private key$?:KeyMap,private mevent$?:MouseMap
		)
	{
		if (inst instanceof ViewFieldInstance)
			this.block$ = inst.block;

		if (inst) this.source$ = this.field;
		else if (block$) this.source$ = this.block;
		else if (form$) this.source$ = this.form;
	}

	public get type() : EventType
	{
		return(this.type$);
	}

	public get form() : Form
	{
		return(this.form$);
	}

	public get block() : string
	{
		return(this.block$);
	}

	public get jsevent() : any
	{
		return(Framework.getEvent());
	}

	public get key() : KeyMap
	{
		return(this.key$);
	}

	public get field() : string
	{
		if (typeof this.inst === "string")
			return(this.inst);

		if (this.inst instanceof ViewFieldInstance)
			return(this.inst?.name);

		return(null);
	}

	public get menu() : MenuComponent
	{
		return(this.source$ as MenuComponent);
	}

	public get source() : any
	{
		return(this.source$);
	}

	public get mouse() : MouseMap
	{
		return(this.mevent$);
	}

	public toString() : string
	{
		let str:string = "";

		str += "form: "+this.form$?.name;
		if (this.type != null) str += ", type: " + EventType[this.type];

		if (this.block != null) str += ", block: "+this.block;
		if (this.field != null) str += ", field: "+this.field;

		if (this.key != null) str += ", key: "+this.key.toString();
		if (this.mouse != null) str += ", mouse: "+MouseMap[this.mouse];

		return(str);
	}
}

export class FormEvents
{
	private static listeners:EventListener[] = [];
	private static applisteners:Map<EventType|number,EventListener[]> = new Map<EventType|number,EventListener[]>();
	private static frmlisteners:Map<EventType|number,EventListener[]> = new Map<EventType|number,EventListener[]>();
	private static blklisteners:Map<EventType|number,EventListener[]> = new Map<EventType|number,EventListener[]>();
	private static fldlisteners:Map<EventType|number,EventListener[]> = new Map<EventType|number,EventListener[]>();

	public static addListener(form:Form, clazz:any, method:Function|string, filter?:EventFilter|EventFilter[]) : object
	{
		let id:object = new Object();
		let listeners:EventListener[] = [];

		if (filter == null)
		{
			listeners.push(new EventListener(id,form,clazz,method,null));
		}
		else if (!Array.isArray(filter))
		{
			listeners.push(new EventListener(id,form,clazz,method,filter as EventFilter));
		}
		else
		{
			filter.forEach((f) => {listeners.push(new EventListener(id,form,clazz,method,f));})
		}

		listeners.forEach((lsnr) =>
		{
			let ltype:number = 0;
			if (lsnr.form != null) ltype = 1;

			if (lsnr.filter != null)
			{
				if (lsnr.filter.type == null)
				{
					if (lsnr.filter.key != null) lsnr.filter.type = EventType.Key;
					if (lsnr.filter.mouse != null) lsnr.filter.type = EventType.Mouse;
				}

				if (lsnr.filter.field != null) lsnr.filter.field = lsnr.filter.field.toLowerCase();
				if (lsnr.filter.block != null) lsnr.filter.block = lsnr.filter.block.toLowerCase();

				if (lsnr.filter.block != null) ltype = 2;
				if (lsnr.filter.field != null) ltype = 3;

				if (ltype == 0 && lsnr.filter.mouse == MouseMap.contextmenu)
					ApplicationHandler.addContextListener();

				switch(ltype)
				{
					case 0: FormEvents.add(lsnr.filter.type,lsnr,FormEvents.applisteners); break;
					case 1: FormEvents.add(lsnr.filter.type,lsnr,FormEvents.frmlisteners); break;
					case 2: FormEvents.add(lsnr.filter.type,lsnr,FormEvents.blklisteners); break;
					case 3: FormEvents.add(lsnr.filter.type,lsnr,FormEvents.fldlisteners); break;
				}
			}
			else
			{
				FormEvents.listeners.push(lsnr);
			}
		});

		return(id);
	}

	public static getListener(id:object) : EventListener
	{
		let map:Map<EventType,EventListener[]> = null;

		for (let i = 0; i < FormEvents.listeners.length; i++)
		{
			let lsnr:EventListener = FormEvents.listeners[i];
			if (lsnr.id == id) return(lsnr);
		}

		for (let m = 0; m < 4; m++)
		{
			switch(m)
			{
				case 0: map = FormEvents.fldlisteners; break;
				case 1: map = FormEvents.blklisteners; break;
				case 2: map = FormEvents.frmlisteners; break;
				case 3: map = FormEvents.applisteners; break;
			}

			for(let key of map.keys())
			{
				let listeners:EventListener[] = map.get(key);

				for (let i = 0; listeners != null &&  i < listeners.length; i++)
				{
					if (listeners[i].id == id)
						return(listeners[i]);
				}
			}
		}

		return(null);
	}

	public static removeListener(id:object) : void
	{
		let map:Map<EventType,EventListener[]> = null;

		for (let i = 0; i < FormEvents.listeners.length; i++)
		{
			let lsnr:EventListener = FormEvents.listeners[i];

			if (lsnr.id == id)
			{
				FormEvents.listeners.splice(i,1)
				break;
			}
		}

		for (let m = 0; m < 4; m++)
		{
			switch(m)
			{
				case 0: map = FormEvents.fldlisteners; break;
				case 1: map = FormEvents.blklisteners; break;
				case 2: map = FormEvents.frmlisteners; break;
				case 3: map = FormEvents.applisteners; break;
			}

			for(let key of map.keys())
			{
				let listeners:EventListener[] = map.get(key);

				for (let i = 0; listeners != null &&  i < listeners.length; i++)
				{
					if (listeners[i].id == id)
					{
						listeners.splice(i,1);
						map.set(key,listeners);

						if (listeners.length == 0)
							map.delete(key);

						break;
					}
				}
			}
		}
	}

	public static async raise(event:FormEvent) : Promise<boolean>
	{
		let listeners:EventListener[] = null;
		let done:Set<object> = new Set<object>();

		// Field Listeners
		listeners = FormEvents.merge(FormEvents.fldlisteners,event.type);
		Logger.log(Type.eventlisteners,"raise event: "+event.toString());

		for (let i = 0; i < listeners.length; i++)
		{
			let lsnr:EventListener = listeners[i];

			if (done.has(lsnr.id))
				continue;

			if (FormEvents.match(event,lsnr))
			{
				done.add(lsnr.id);

				Logger.log(Type.eventlisteners,"fieldlevel lsnr: "+lsnr);
				if (!(await FormEvents.execute(Level.Field,event.type,lsnr,event)))
				{
					Logger.log(Type.eventlisteners,"fieldlevel "+lsnr+" returned false");
					return(false);
				}
			}
		}

		// Block Listeners
		listeners = FormEvents.merge(FormEvents.blklisteners,event.type);

		for (let i = 0; i < listeners.length; i++)
		{
			let lsnr:EventListener = listeners[i];

			if (done.has(lsnr.id))
				continue;

			if (FormEvents.match(event,lsnr))
			{
				done.add(lsnr.id);

				Logger.log(Type.eventlisteners,"blocklevel "+lsnr);
				if (!(await FormEvents.execute(Level.Block,event.type,lsnr,event)))
				{
					Logger.log(Type.eventlisteners,"blocklevel "+lsnr+" returned false");
					return(false);
				}
			}
		}

		// Form Listeners
		listeners = FormEvents.merge(FormEvents.frmlisteners,event.type);

		for (let i = 0; i < listeners.length; i++)
		{
			let lsnr:EventListener = listeners[i];

			if (done.has(lsnr.id))
				continue;

			if (FormEvents.match(event,lsnr))
			{
				done.add(lsnr.id);

				Logger.log(Type.eventlisteners,"formlevel "+lsnr);
				if (!(await FormEvents.execute(Level.Form,event.type,lsnr,event)))
				{
					Logger.log(Type.eventlisteners,"formlevel "+lsnr+" returned false");
					return(false);
				}
			}
		}

		// App Listeners
		listeners = FormEvents.merge(FormEvents.applisteners,event.type);

		for (let i = 0; i < listeners.length; i++)
		{
			let lsnr:EventListener = listeners[i];

			if (done.has(lsnr.id))
				continue;

			if (FormEvents.match(event,lsnr))
			{
				done.add(lsnr.id);

				Logger.log(Type.eventlisteners,"applevel "+lsnr);
				if (!(await FormEvents.execute(Level.Application,event.type,lsnr,event)))
				{
					Logger.log(Type.eventlisteners," applevel "+lsnr+" returned false");
					return(false);
				}
			}
		}

		for (let i = 0; i < FormEvents.listeners.length; i++)
		{
			let lsnr:EventListener = FormEvents.listeners[i];

			if (done.has(lsnr.id))
				continue;

			if (FormEvents.match(event,lsnr))
			{
				done.add(lsnr.id);

				Logger.log(Type.eventlisteners,"alltypes "+lsnr);
				if (!(await FormEvents.execute(Level.All,event.type,lsnr,event)))
				{
					Logger.log(Type.eventlisteners," alltypes "+lsnr+" returned false");
					return(false);
				}
			}
		}

		return(true);
	}

	private static merge(lsnrs:Map<EventType|number,EventListener[]>, type:EventType) : EventListener[]
	{
		let all:EventListener[] = [];

		let typed:EventListener[] = lsnrs.get(type);
		let untyped:EventListener[] = lsnrs.get(-1);

		if (typed != null) all.push(...typed);
		if (untyped != null) all.push(...untyped);

		return(all);
	}


	private static async execute(level:Level, type:EventType,lsnr:EventListener, event:FormEvent) : Promise<boolean>
	{
		let cont:boolean = true;
		Logger.log(Type.eventlisteners,"Level: "+Level[level]+" "+EventType[type]+" Invoking eventhandler: "+lsnr);

		let ekey:KeyMap = event.key;
		let lkey:KeyMap = lsnr.filter?.key;
		let swap:boolean = lkey != null && ekey != null;
		// Make sure event.key not only matches, but is identical

		if (swap) event["key$"] = lkey;
		let response:Promise<boolean> = null;

		try
		{
			response = lsnr.clazz[lsnr.method](event);
		}
		catch (error)
		{
			let meth:string = lsnr.clazz.constructor.name+"."+lsnr.method;
			Messages.severe(MSGGRP.FRAMEWORK,6,meth,error); // lsnr.method+" returned error
			if (swap) event["key$"] = ekey;
			return(false);
		}

		if (response instanceof Promise)
		{
			try
			{
				await response.then((value) =>
				{
					if (typeof value !== "boolean")
					{
						Messages.severe(MSGGRP.FRAMEWORK,7,lsnr,value); // EventListner %1 did not return Promise<boolean>, but %s
						value = true;
					}

					cont = value;
				});
			}
			catch(error)
			{
				let meth:string = lsnr.clazz.constructor.name+"."+lsnr.method;
				Messages.severe(MSGGRP.FRAMEWORK,6,meth,error);
				cont = false;
			}
		}
		else
		{
			if (response == null || typeof response !== "boolean")
			{
				Messages.severe(MSGGRP.FRAMEWORK,8,lsnr,response); // EventListner '%s' did not return boolean, but '%s'
				cont = true;
			}

			if (typeof response === "boolean")
				cont = response;
		}

		if (swap) event["key$"] = ekey;
		if (!cont) FlightRecorder.add("@formevent: "+lsnr.clazz+" "+lsnr.method+" "+event+" returned false");

		return(cont);
	}


	private static match(event:FormEvent, lsnr:EventListener) : boolean
	{
		let appevent:boolean = EventGroup.ApplEvents.has(event.type);
		let frmevent:boolean = EventGroup.FormEvents.has(event.type);

		if (lsnr.form != null && (lsnr.form != event.form && !appevent))
			return(false);

		Logger.log(Type.eventlisteners," match: "+EventType[event.type]+" "+lsnr.clazz.constructor.name);

		if (lsnr.filter != null)
		{
			if (lsnr.filter.mouse != null && lsnr.filter.mouse != event.mouse) return(false);
			if (lsnr.filter.key != null && lsnr.filter.key.signature != event.key?.signature) return(false);

			if (!frmevent)
			{
				if (lsnr.filter.block != null && lsnr.filter.block != event.block) return(false);
				if (lsnr.filter.field != null && lsnr.filter.field != event.field) return(false);
			}
		}

		return(true);
	}


	private static add(type:EventType, lsnr:EventListener, map:Map<EventType|number,EventListener[]>) : void
	{
		let listeners:EventListener[];

		if (type == null) listeners = map.get(-1);
		else			  		listeners = map.get(type);

		if (listeners == null)
		{
			listeners = [];

			if (type == null) map.set(-1,listeners);
			else			  		map.set(type,listeners);
		}

		listeners.push(lsnr);
	}
}

enum Level
{
	All,
	Form,
	Field,
	Block,
	Application,
}