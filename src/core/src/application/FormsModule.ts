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

import { Alert } from './Alert.js';
import { Form } from '../public/Form.js';
import { Class } from '../public/Class.js';
import { Framework } from './Framework.js';
import { Components } from './Components.js';
import { FormBacking } from './FormBacking.js';
import { Canvas } from './properties/Canvas.js';
import { dates } from '../model/dates/dates.js';
import { Level, Messages } from '../messages/Messages.js';
import { Form as ViewForm } from '../view/Form.js';
import { Loading } from '../internal/forms/Loading.js';
import { Form as InternalForm } from '../internal/Form.js';
import { EventType } from '../control/events/EventType.js';
import { TriggerFunction } from '../public/TriggerFunction.js';
import { EventFilter } from '../control/events/EventFilter.js';
import { KeyMap, KeyMapping } from '../control/events/KeyMap.js';
import { DatabaseConnection } from '../public/DatabaseConnection.js';
import { FormEvent, FormEvents } from '../control/events/FormEvents.js';
import { ApplicationHandler } from '../control/events/ApplicationHandler.js';

/**
 * The starting point or boot-strap of a FutureForms application
 */
export class FormsModule
{
	private static root$:HTMLElement;
	private static flush$:FlushStrategy;
	private static showurl$:boolean = false;
	private static instance$:FormsModule = null;

	/** Static method to return the singleton */
	public static get<FormsModule>() : FormsModule
	{
		if (FormsModule.instance$ == null)
			FormsModule.instance$ = new FormsModule();
		return(FormsModule.instance$ as FormsModule);
	}

	/** Whether or not to display the active form in the url */
	public static get showurl() : boolean
	{
		return(FormsModule.showurl$);
	}

	/** Whether or not to display the active form in the url */
	public static set showurl(flag:boolean)
	{
		FormsModule.showurl$ = flag;
	}

	/** Flush when leaving row or block */
	public static get defaultFlushStrategy() : FlushStrategy
	{
		if (FormsModule.flush$ == null)
			FormsModule.flush$ = FlushStrategy.Block;

		return(FormsModule.flush$);
	}

	/** Flush when leaving row or block */
	public static set defaultFlushStrategy(strategy:FlushStrategy)
	{
		FormsModule.flush$ = strategy;
	}

	/** The root element to which 'popup' forms will be added (default document.body) */
	public static getRootElement() : HTMLElement
	{
		if (!FormsModule.root$) return(document.body);
		return(FormsModule.root$);
	}

	/** The root element to which 'popup' forms will be added (default document.body) */
	public static setRootElement(root:HTMLElement) : void
	{
		FormsModule.root$ = root;
	}

	/** Make a Form navigable directly via the URL */
	public static setURLNavigable(name:string, nav:boolean) : void
	{
		FormBacking.setURLNavigable(name,nav);
	}

	/** Get the latest javascript event */
	public static getJSEvent() : any
	{
		return(Framework.getEvent());
	}

	/** Map a component to string (or the name of the class) */
	public static mapComponent(clazz:Class<any>, path?:string) : void
	{
		if (clazz == null)
			return;

		if (path == null)
			path = clazz.name;

		path = path.toLowerCase();
		Components.classmap.set(path,clazz);
		Components.classurl.set(clazz.name.toLowerCase(),path);
	}

	/** Get the string a given class or class-name is mapped to */
	public static getFormPath(clazz:Class<any>|string) : string
	{
		if (clazz == null)
			return(null);

		if (typeof clazz != "string")
			clazz = clazz.name;

		return(Components.classurl.get(clazz.toLowerCase()));
	}

	/** Get the component a given path is mapped to */
	public static getComponent(path:string) : Class<any>
	{
		return(Components.classmap.get(path.toLowerCase()));
	}

	/** Update the internal KeyMap based on a new KeyMap */
	public static updateKeyMap(map:Class<KeyMap>) : void
	{
		KeyMapping.update(map);
	}

	/** Open the form defined in the URL */
	public static OpenURLForm() : boolean
	{
		let location:Location = window.location;
		let params:URLSearchParams = new URLSearchParams(location.search);

		if (params.get("form") != null)
		{
			let form:string = params.get("form");
			let clazz:Class<any> = FormsModule.getComponent(form);

			if (!FormBacking.getURLNavigable(form))
				return(false);

			if (clazz != null && clazz.prototype instanceof Form)
			{
				FormsModule.showform(clazz);
				return(true);
			}
		}

		return(false);
	}

	/** Retrive the current active Form */
	public static getCurrentForm() : Form
	{
		return(FormBacking.getCurrentForm());
	}

	/** Retrive the current active HTMLElement */
	public static getCurrentField() : HTMLElement
	{
		let form:ViewForm = FormBacking.getViewForm(FormBacking.getCurrentForm());
		if (form.current?.hasFocus()) return(form.current.implementation.getElement());
		else return(null);
	}

	/** Emulate a user key-stroke */
	public static async sendkey(key:KeyMap|string) : Promise<boolean>
	{
		if (typeof key === "string") key = KeyMap.from(key);
		let form:ViewForm = FormBacking.getCurrentViewForm();

		if (form != null) return(form.keyhandler(key));
		return(ApplicationHandler.instance.keyhandler(key));
	}

	/** Whether a given DatabaseConnection has outstanding transactions */
	public static hasTransactions(connection?:DatabaseConnection) : boolean
	{
		return(FormBacking.hasTransactions(connection["conn$"]));
	}

	/** Issue commit on all DatabaseConnection's */
	public static async commit() : Promise<boolean>
	{
		return(FormBacking.commit());
	}

	/** Issue rollback on all DatabaseConnection's */
	public static async rollback() : Promise<boolean>
	{
		return(FormBacking.rollback());
	}

	/** Handle fine message */
	public static fine(grpno:number,errno:number,...args:any) : void
	{
		Messages.fine(grpno,errno,args);
	}

	/** Handle info message */
	public static info(grpno:number,errno:number,...args:any) : void
	{
		Messages.info(grpno,errno,args);
	}

	/** Handle warning message */
	public static warn(grpno:number,errno:number,...args:any) : void
	{
		Messages.warn(grpno,errno,args);
	}

	/** Handle severe message */
	public static severe(grpno:number,errno:number,...args:any) : void
	{
		Messages.severe(grpno,errno,args);
	}

	/** Popup a message */
	public static alert(msg:string, title:string, level?:Level) : void
	{
		if (!level)
			level = Level.info;

		switch(level)
		{
			case Level.info: Alert.message(msg,title); break;
			case Level.warn: Alert.warning(msg,title); break;
			case Level.severe: Alert.fatal(msg,title); break;
		}
	}

	/** Get all active forms */
	public static getRunningForms() : Form[]
	{
		return(FormBacking.getRunningForms());
	}

	/** Create a form based on the page */
	public static async createform(form:Class<Form|InternalForm>|string, page:HTMLElement, parameters?:Map<any,any>) : Promise<Form>
	{
		return(FormBacking.createForm(form,page,parameters));
	}

	/** Create and attach a form to the container (or root-element) */
	public static async showform(form:Class<Form|InternalForm>|string, parameters?:Map<any,any>, container?:HTMLElement) : Promise<Form>
	{
		return(FormBacking.showform(form,null,parameters,container));
	}

	/** Show the blocking 'loading' html */
	public static showLoading(message:string) : number
	{
		return(Loading.show(message));
	}

	/** Remove the blocking 'loading' html */
	public static hideLoading(thread:number) : void
	{
		Loading.hide(thread);
	}

	/** Raise a Custom Event */
	public static async raiseCustomEvent(source:any) : Promise<boolean>
	{
		let frmevent:FormEvent = FormEvent.AppEvent(EventType.Custom,source);
		return(FormEvents.raise(frmevent));
	}

	/** Remove an event-listener */
	public static removeEventListener(id:object) : void
	{
		FormEvents.removeListener(id);
	}

	/** Utility. Use with care since javascript is actually single-threaded */
	public static sleep(ms:number) : Promise<boolean>
	{
		return(new Promise(resolve => setTimeout(resolve,ms)));
	}

	constructor()
	{
		dates.validate();
		KeyMapping.init();
		Messages.language = "us";
		ApplicationHandler.init();
		FormsModule.instance$ = this;
	}

	/** Parse a given Element to find and process FutureForms elements */
	public parse(doc?:Element) : void
	{
		if (doc == null) doc = document.body;
		Framework.parse(this,doc);
	}

	/** Add an event-listener */
	public addEventListener(method:TriggerFunction, filter?:EventFilter|EventFilter[]) : object
	{
		return(FormEvents.addListener(null,this,method,filter));
	}

	/** Add an event-listener on a given Form */
	public addFormEventListener(form:Form|InternalForm, method:TriggerFunction, filter?:EventFilter|EventFilter[]) : object
	{
		return(FormEvents.addListener(form,this,method,filter));
	}
}

export enum FlushStrategy
{
	Row,
	Block
}