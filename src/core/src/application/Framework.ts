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

import { Tag } from './tags/Tag.js';
import { Class } from '../public/Class.js';
import { Logger, Type } from './Logger.js';
import { Properties } from './Properties.js';
import { MSGGRP } from '../messages/Internal.js';
import { Messages } from '../messages/Messages.js';
import { EventStack } from '../control/events/EventStack.js';
import { ComponentFactory } from './interfaces/ComponentFactory.js';


export class Framework
{
	private component:any = null;
	private static event$:any = null;
	private static taglib:Map<string,Tag> = null;
	private static attrlib:Map<string,Tag> = null;

	public eventhandler:EventHandler = null;
	public events:Map<Element,string[][]> = new Map<Element,string[][]>();

	public static getEvent() : any
	{
		return(Framework.event$);
	}

	public static setEvent(event:any) : void
	{
		Framework.event$ = event;
	}

	private static loadTaglib() : Map<string,Tag>
	{
		Framework.taglib = new Map<string,Tag>();
		Properties.TagLibrary.forEach((clazz,tag) => {Framework.addTag(tag.toLowerCase(),clazz);});
		return(Framework.taglib);
	}

	private static loadAttrlib() : Map<string,Tag>
	{
		Framework.attrlib = new Map<string,Tag>();
		Properties.AttributeLibrary.forEach((clazz,tag) => {Framework.addAttr(tag.toLowerCase(),clazz);});
		return(Framework.attrlib);
	}

	public static addTag(tag:string,clazz:Class<Tag>) : void
	{
		tag = tag.toLowerCase();

		let factory:ComponentFactory = Properties.FactoryImplementation;
		let impl:Tag = factory.createBean(clazz);

		Framework.taglib.set(tag,impl);
	}

	public static addAttr(tag:string,clazz:Class<Tag>) : void
	{
		tag = tag.toLowerCase();

		let factory:ComponentFactory = Properties.FactoryImplementation;
		let impl:Tag = factory.createBean(clazz);

		Framework.attrlib.set(tag,impl);
	}

	public static parse(component:any, doc:Element) : Framework
	{
		return(new Framework(component,doc));
	}

	public static prepare(element:string|HTMLElement) : HTMLElement
	{
		let remove:number[] = [];

		if (element == null)
			return(null);

		if (typeof element === 'string')
		{
			let template:HTMLElement = document.createElement('div');
			template.innerHTML = element;
			element = template;

			if (element.childNodes.length == 1)
				element = element.childNodes.item(0) as HTMLElement;
		}

		for(let i=0; i < element.childNodes.length; i++)
		{
			let node:Node = element.childNodes.item(i);
			if (node.nodeType == Node.TEXT_NODE && node.textContent.trim() == "")
				remove.unshift(i);
		}

		for(let i=0; i < remove.length; i++)
			element.childNodes.item(remove[i]).remove();

		return(element);
	}

	public static copyAttributes(fr:Element,to:Element) : void
	{
		if (fr == null || to == null) return;
		let attrnames:string[] = fr.getAttributeNames();

		for (let an = 0; an < attrnames.length; an++)
			to.setAttribute(attrnames[an],fr.getAttribute(attrnames[an]));
	}

	private constructor(component:any, doc:Element)
	{
		this.component = component;
		this.eventhandler = new EventHandler(component);

		Framework.loadTaglib();
		Framework.loadAttrlib();

		if (!Properties.ParseTags && !Properties.ParseEvents)
			return;

		this.parseDoc(doc);
		this.applyEvents();
	}

	private parseDoc(doc:Element) : void
	{
		if (doc == null)
			return;

		if (!doc.childNodes)
			return;

		this.addEvents(doc);

		let nodes:Node[] = [];
		doc.childNodes.forEach((node) => {nodes.push(node)});

		for (let i = 0; i < nodes.length; i++)
		{
			let element:Node = nodes[i];
			if (!(element instanceof HTMLElement)) continue;
			let impl:Implementation = this.getImplementation(element);

			if (impl != null)
			{
				this.apply(doc,impl);
				continue;
			}

			this.addEvents(element);
			this.parseDoc(element);
		}
	}

	private addEvents(element:Element) : void
	{
		if (element == null) return;
		if (!Properties.ParseEvents) return;
		let prefix:string = Properties.AttributePrefix;

		if (!element.getAttributeNames)
			return;

		let attrnames:string[] = element.getAttributeNames();

		for (let an = 0; an < attrnames.length; an++)
		{
			let attrvalue:string = element.getAttribute(attrnames[an]);
			if (attrvalue != null) attrvalue = attrvalue.trim();

			if (!Properties.RequireAttributePrefix)
			{
				if (attrnames[an].toLowerCase().startsWith("on") && attrvalue.startsWith("this."))
				{
					let events:string[][] = this.events.get(element);

					if (events == null)
					{
						events = [];
						this.events.set(element,events);
					}

					events.push([attrnames[an],attrvalue]);
					element.removeAttribute(attrnames[an]);

					Logger.log(Type.eventparser,"Add event: '"+attrvalue+"' for: "+attrnames[an]);
					continue;
				}
			}

			if (!attrnames[an].startsWith(prefix))
				continue;

			attrnames[an] = attrnames[an].substring(prefix.length);
			attrnames[an] = attrnames[an].toLowerCase();

			if (attrvalue != null)
			{
				let events:string[][] = this.events.get(element);

				if (events == null)
				{
					events = [];
					this.events.set(element,events);
				}

				events.push([attrnames[an],attrvalue]);
				element.removeAttribute(prefix+attrnames[an]);

				Logger.log(Type.eventparser,"Add event: '"+attrvalue+"' for: "+attrnames[an]);
			}
		}
	}

	private getImplementation(element:HTMLElement) : Implementation
	{
		let tag:Tag = null;
		let attr:string = null;
		let prefix:string = Properties.AttributePrefix;
		let name:string = element?.nodeName.toLowerCase();

		if (!element.getAttributeNames)
			return(null);

		if (Properties.ParseTags)
		{
			tag = Framework.taglib.get(name);
			let attrnames:string[] = element.getAttributeNames();

			for (let an = 0; tag == null && an < attrnames.length; an++)
			{
				let atrnm:string = attrnames[an].toLowerCase();

				if (!Properties.RequireAttributePrefix)
				{
					tag = Framework.attrlib.get(atrnm);
					if (tag != null) attr = atrnm;
				}

				if (tag == null)
				{
					if (attrnames[an].startsWith(prefix))
					{
						atrnm = attrnames[an].substring(prefix.length).toLowerCase();
						tag = Framework.attrlib.get(atrnm);
						if (tag != null) attr = atrnm;
					}
				}
			}
		}

		if (tag)
			return(new Implementation(element,tag,name,attr));

		return(null);
	}

	private getReplacement(impl:Implementation) : HTMLElement[]
	{
		let replace:HTMLElement|HTMLElement[]|string = impl.tag.parse(this.component,impl.element,impl.attr);
		Logger.log(Type.htmlparser,"Resolved tag: '"+impl.name+"' using class: "+impl.tag.constructor.name);

		if (replace == impl.element)
			return([]);

		if (replace == null)
		{
			if (impl.element.parentElement != null)
				impl.element.remove();

			return([]);
		}

		if (typeof replace === "string")
		{
			let template:HTMLDivElement = document.createElement('div');
			template.innerHTML = replace;
			replace = Framework.prepare(template);
		}

		if (!Array.isArray(replace))
			replace = [replace];

		if (!impl.recursive)
			return(replace);

		let nested:Map<number,HTMLElement[]> =
			new Map<number,HTMLElement[]>();

		for(let r=0; r < replace.length; r++)
		{
			let elements:HTMLElement[] = [replace[r]];
			let deep:Implementation = this.getImplementation(replace[r]);

			if (deep)
			{
				elements = this.getReplacement(deep);
				if (elements.length == 0) elements = [replace[r]];
			}

			nested.set(r,elements);
		}

		let nodes:HTMLElement[] = [];
		nested.forEach((nrep) => nodes.push(...nrep));

		return(nodes);
}

	private apply(doc:Element, impl:Implementation) : number
	{
		let replace:HTMLElement[] = this.getReplacement(impl);

		if (replace.length > 0)
		{
			for(let r=0; r < replace.length; r++)
				replace[r] = doc.insertBefore(replace[r],impl.element);

			impl.element.remove();

			if (impl.recursive)
			{
				for(let r=0; r < replace.length; r++)
					this.parseDoc(replace[r]);
			}
		}

		return(replace.length);
	}

	private applyEvents() : void
	{
		if (Properties.ParseEvents && this.component != null)
		{
			this.events.forEach((event,element) =>
			{
				for (let i = 0; i < event.length; i++)
				{
					let func:DynamicCall = new DynamicCall(this.component,event[i][1]);
					let ename:string = this.eventhandler.addEvent(element,event[i][0],func);
					element.addEventListener(ename,this.eventhandler);
				}
			});
		}
	}
}


export class DynamicCall
{
	public path:string[];
	public method:string;
	public args:string[] = [];
	public component:any = null;

	constructor(component:any, signature:string)
	{
		this.parse(signature);
		this.component = component;
	}

	private parse(signature:string) : void
	{
		if (signature.startsWith("this."))
			signature = signature.substring(5);

		let pos1:number = signature.indexOf("(");
		let pos2:number = signature.indexOf(")");

		this.path = signature.substring(0,pos1).split(".");
		let arglist:string = signature.substring(pos1+1,pos2).trim();

		let arg:string = "";
		let quote:string = null;
		this.method = this.path.pop();

		for(let i=0; i < arglist.length; i++)
		{
			let c:string = arglist.charAt(i);

			if (c == "," && quote == null)
			{
				if (arg.length > 0)
				{
					this.args.push(arg);
					arg = "";
				}

				continue;
			}

			if (c == "'" || c == '"')
			{
				if (quote != null && c == quote)
				{
					quote = null;
					continue;
				}

				else

				if (quote == null)
				{
					quote = c;
					continue;
				}
			}

			arg += c;
		}

		if (arg.trim().length > 0)
			this.args.push(arg);
	}

	public async invoke(event:any) : Promise<void>
	{
		Framework.setEvent(event);
		let comp:any = this.component;

		for(let i = 0; i < this.path.length; i++)
		{
			if (!this.component[this.path[i]])
			{
				let msgno:number = 1;
				if (!(this.path[i] in this.component)) msgno = 2; // Attribute null or missing
				Messages.severe(MSGGRP.FRAMEWORK,msgno,this.path[i],this.component.constructor.name);
				return;
			}

			comp = this.component[this.path[i]];
		}

		try
		{
			switch(this.args.length)
			{
				case 0: await comp[this.method](); break;
				case 1: await comp[this.method](this.args[0]); break;
				default: await comp[this.method](...this.args); break;
			}
		}
		catch (error)
		{
			Messages.severe(MSGGRP.FRAMEWORK,3,this.method,this.component.constructor.name,error); // Failed to invoke method
		}
	}

	public toString() : string
	{
		return(this.component.constructor.name+" "+this.method);
	}
}


class EventHandler implements EventListenerObject
{
	private events:Map<Element,Map<string,DynamicCall>> =
		new Map<Element,Map<string,DynamicCall>>();

	constructor(private component:any) {}

	public addEvent(element:Element,event:string,handler:DynamicCall) : string
	{
		if (event.startsWith("on")) event = event.substring(2);
		let events:Map<string,DynamicCall> = this.events.get(element);

		if (events == null)
		{
			events = new Map<string,DynamicCall>();
			this.events.set(element,events);
		}

		events.set(event,handler);
		return(event);
	}

	public getEvent(element:Element,event:string) : DynamicCall
	{
		let events:Map<string,DynamicCall> = this.events.get(element);
		if (events == null) return(null);
		return(events.get(event));
	}

	public handleEvent(event:Event): void
	{
		let elem:Element = event.target as Element;
		let method:DynamicCall = this.getEvent(elem,event.type);

		if (method == null)
		{
			while (elem != null && method == null && elem.parentElement != document.body.parentElement)
			{
				elem = elem.parentElement;
				method = this.getEvent(elem,event.type);
			}
		}

		if (method != null)
		{
			EventStack.queue(method,event);
		}
		else if (elem != null)
		{
			Messages.severe(MSGGRP.FRAMEWORK,4,event.type); // Cannot find event type
		}
	}
}


class Implementation
{
	constructor(public element:any, public tag:Tag, public name:string, public attr:string) {}
	get recursive() : boolean
	{
		if (this.tag.recursive == null)
			return(true);

		return(this.tag.recursive);
	}
}