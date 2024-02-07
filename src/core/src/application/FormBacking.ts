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

import { Form } from '../public/Form.js';
import { Class } from '../public/Class.js';
import { Block } from '../public/Block.js';
import { Properties } from './Properties.js';
import { FormsModule } from './FormsModule.js';
import { Canvas } from './interfaces/Canvas.js';
import { Key } from '../model/relations/Key.js';
import { FormMetaData } from './FormMetaData.js';
import { MSGGRP } from '../messages/Internal.js';
import { Messages } from '../messages/Messages.js';
import { Form as ViewForm } from '../view/Form.js';
import { Form as ModelForm } from '../model/Form.js';
import { Block as ViewBlock } from '../view/Block.js';
import { Connection } from '../database/Connection.js';
import { Block as ModelBlock } from '../model/Block.js';
import { ListOfValues } from '../public/ListOfValues.js';
import { Relation } from '../model/relations/Relation.js';
import { EventType } from '../control/events/EventType.js';
import { Form as InternalForm } from '../internal/Form.js';
import { DateConstraint } from '../public/DateConstraint.js';
import { EventStack } from '../control/events/EventStack.js';
import { ComponentFactory } from './interfaces/ComponentFactory.js';
import { FormEvent, FormEvents } from '../control/events/FormEvents.js';

export class FormBacking
{
	private static prev:Form = null;
	private static form:Form = null;

	private static nonav:Set<string> =
		new Set<string>();

	private static vforms:Map<Form,ViewForm> =
		new Map<Form,ViewForm>();

	private static mforms:Map<Form,ModelForm> =
		new Map<Form,ModelForm>();

	private static bdata:Map<Form,FormBacking> =
		new Map<Form,FormBacking>();

	public static async createForm(form:Class<Form|InternalForm>|string, page:HTMLElement, parameters?:Map<any,any>) : Promise<Form>
	{
		if (typeof form === "string")
		{
			let path:string = form;
			form = form.toLowerCase();
			form = FormsModule.getComponent(form);
			if (form == null) throw "@Application: No components mapped to path '"+path+"'";
		}

		let factory:ComponentFactory = Properties.FactoryImplementation;
		let canvasimpl:Class<Canvas> = Properties.CanvasImplementationClass;

		let canvas:Canvas = new canvasimpl();
		let instance:Form = await factory.createForm(form,parameters);

		await instance.setView(page);

		canvas.setComponent(instance);
		FormBacking.getViewForm(instance).canvas = canvas;

		await FormEvents.raise(FormEvent.FormEvent(EventType.OnNewForm,instance));
		await FormEvents.raise(FormEvent.FormEvent(EventType.PostViewInit,instance));

		return(instance);
	}

	public static async showform(form:Class<Form|InternalForm>|string, parent:Form|InternalForm, parameters?:Map<any,any>, container?:HTMLElement) : Promise<Form>
	{
		if (typeof form === "string")
		{
			let path:string = form;
			form = form.toLowerCase();
			form = FormsModule.getComponent(form);
			if (form == null) throw "@Application: No components mapped to path '"+path+"'";
		}

		let curr:Form = FormBacking.getCurrentForm();
		let currw:ViewForm = FormBacking.getViewForm(curr);

		// check if ok to leave curr
		if (!parent)
		{
			if (currw && !await currw.checkLeave(currw))
				return(null);
		}
		else
		{
			currw?.blur(true,true);
		}

		if (container == null)
			container = FormsModule.getRootElement();

		if (!(form.prototype instanceof Form) && !(form.prototype instanceof InternalForm))
			throw "@Application: Component mapped to '"+form+"' is not a form";

		EventStack.clear();

		let factory:ComponentFactory = Properties.FactoryImplementation;
		let canvasimpl:Class<Canvas> = Properties.CanvasImplementationClass;

		let canvas:Canvas = new canvasimpl();
		let instance:Form = await factory.createForm(form,parameters);

		if (!await FormEvents.raise(FormEvent.FormEvent(EventType.OnNewForm,instance)))
			return(null);

		canvas.setComponent(instance);
		container.appendChild(canvas.getView());

		FormBacking.getViewForm(instance).canvas = canvas;

		if (parent)
		{
			parent.canvas?.block();
			FormBacking.getBacking(instance).parent = parent;
			let backing:FormBacking = FormBacking.getBacking(parent);
			await FormEvents.raise(FormEvent.FormEvent(EventType.OnFormDisabled,parent));
			if (backing) backing.hasModalChild = true;
		}

		await FormEvents.raise(FormEvent.FormEvent(EventType.PostViewInit,instance));
		return(instance);
	}

	public static getCurrentForm() : Form
	{
		return(FormBacking.form);
	}

	public static getPreviousForm() : Form
	{
		return(FormBacking.prev);
	}

	public static getRunningForms(clazz?:Class<Form|InternalForm>) : Form[]
	{
		let forms:Form[] = [];
		forms.push(...FormBacking.vforms.keys());
		return(forms);
	}

	public static getChildForms(form:Form, clazz?:Class<Form|InternalForm>) : Form[]
	{
		let children:Form[] = [];

		FormBacking.bdata.forEach((bd,frm) =>
		{
			if (bd.parent == form)
			{
				if (!clazz || frm.constructor.name == clazz.name)
					children.push(frm);
			}
		})

		return(children);
	}

	public static getCurrentViewForm() : ViewForm
	{
		return(FormBacking.vforms.get(FormBacking.form));
	}

	public static getPreviousViewForm() : ViewForm
	{
		return(FormBacking.vforms.get(FormBacking.prev));
	}

	public static getCurrentModelForm() : ModelForm
	{
		return(FormBacking.mforms.get(FormBacking.form));
	}

	public static getPreviousModelForm() : ModelForm
	{
		return(FormBacking.mforms.get(FormBacking.prev));
	}

	public static setCurrentForm(form:Form|ViewForm|ModelForm) : void
	{
		let curr:Form = FormBacking.form;

		if (form instanceof ViewForm)
			form = form.parent;

		else

		if (form instanceof ModelForm)
			form = form.parent;

		if (curr != form)
		{
			FormBacking.form = form;
			if (form) FormBacking.prev = curr;
		}
	}

	public static getBacking(form:Form) : FormBacking
	{
		return(FormBacking.bdata.get(form));
	}

	public static setBacking(form:Form) : FormBacking
	{
		let back:FormBacking = new FormBacking(form);
		FormBacking.bdata.set(form,back);
		return(back);
	}

	public static removeBacking(form:Form) : void
	{
		FormBacking.cleanup(form);
		FormBacking.bdata.delete(form);
		if (form == FormBacking.form) FormBacking.form = null;
	}

	public static setURLNavigable(name:string, nav:boolean) : void
	{
		name = name?.toLowerCase();
		if (!nav) 	this.nonav.add(name);
		else 			this.nonav.delete(name);
	}

	public static getURLNavigable(name:string) : boolean
	{
		name = name?.toLowerCase();
		return(!this.nonav.has(name));
	}

	public static cleanup(form:Form) : void
	{
		FormMetaData.cleanup(form);
		FormBacking.mforms.delete(form);
		FormBacking.vforms.delete(form);
		FormBacking.getBacking(form).clearAutoGenerated();
		FormBacking.getBacking(form).removeAllEventListeners();
	}

	public static getViewForm(form:Form, create?:boolean) : ViewForm
	{
		let vfrm:ViewForm = FormBacking.vforms.get(form);
		if (vfrm == null && create) vfrm = new ViewForm(form);
		return(vfrm);
	}

	public static setViewForm(form:Form, view:ViewForm) : void
	{
		FormBacking.vforms.set(form,view);
	}

	public static getModelForm(form:Form, create?:boolean) : ModelForm
	{
		let mfrm:ModelForm = FormBacking.mforms.get(form);
		if (mfrm == null && create) mfrm = new ModelForm(form);
		return(mfrm);
	}

	public static setModelForm(form:Form, model:ModelForm) : void
	{
		FormBacking.mforms.set(form,model);
	}

	public static getViewBlock(block:Block|ModelBlock, create?:boolean) : ViewBlock
	{
		let form:ViewForm = null;

		if (block instanceof Block) form = FormBacking.getViewForm(block.form,create);
		else 								 form = FormBacking.getViewForm(block.form.parent,create);

		let blk:ViewBlock = form.getBlock(block.name);
		if (blk == null && create) blk = new ViewBlock(form,block.name);

		return(blk);
	}

	public static getModelBlock(block:Block|ViewBlock, create?:boolean) : ModelBlock
	{
		let form:ModelForm = null;

		if (block instanceof Block) form = FormBacking.getModelForm(block.form,create);
		else 								 form = FormBacking.getModelForm(block.form.parent,create);

		let blk:ModelBlock = form.getBlock(block.name);
		if (blk == null && create) blk = new ModelBlock(form,block.name);

		return(blk);
	}

	public static hasTransactions(connection?:Connection) : boolean
	{
		if (connection) return(connection.hasTransactions());

		let transactions:boolean = false;
		let dbconns:Connection[] = Connection.getAllConnections();

		for (let i = 0; i < dbconns.length; i++)
		{
			if (dbconns[i].hasTransactions())
			{
				transactions = true;
				break;
			}
		}

		return(transactions);
	}

	public static async commit() : Promise<boolean>
	{
		let failed:boolean = false;
		let forms:ModelForm[] = [...FormBacking.mforms.values()];
		let dbconns:Connection[] = Connection.getAllConnections();

		for (let i = 0; i < forms.length; i++)
		{
			if (!await forms[i].view.validate())
				return(false);

			if (!await forms[i].flush())
				return(false);
		}

		if (!await FormEvents.raise(FormEvent.AppEvent(EventType.PreCommit)))
			return(false);

		for (let i = 0; i < dbconns.length; i++)
		{
			if (dbconns[i].connected())
			{
				if (!await dbconns[i].commit())
					failed = true;
			}
		}

		if (!failed)
		{
			for (let i = 0; i < forms.length; i++)
				forms[i].synchronize();
		}

		if (!failed) Messages.info(MSGGRP.TRX,1);
		else 			 Messages.warn(MSGGRP.TRX,2);

		if (!failed)
		{
			if (!await FormEvents.raise(FormEvent.AppEvent(EventType.PostCommit)))
				return(false);
		}

		return(!failed);
	}

	public static async rollback() : Promise<boolean>
	{
		let failed:boolean = false;
		let forms:ModelForm[] = [...FormBacking.mforms.values()];
		let dbconns:Connection[] = Connection.getAllConnections();

		if (!await FormEvents.raise(FormEvent.AppEvent(EventType.PreRollback)))
			return(false);

		for (let i = 0; i < forms.length; i++)
		{
			if (forms[i].dirty)
			{
				forms[i].view.skip();
				forms[i].view.current = null;
			}
		}

		for (let i = 0; i < dbconns.length; i++)
		{
			if (dbconns[i].connected())
			{
				if (!await dbconns[i].rollback())
					failed = true;
			}
		}

		for (let i = 0; i < forms.length; i++)
		{
			if (!await forms[i].undo())
			{
				Messages.warn(MSGGRP.TRX,3,forms[i].name); // Failed to undo transactions for form %
				return(false);
			}

			forms[i].dirty = false;
		}

		if (failed) Messages.warn(MSGGRP.TRX,4); // Failed to roll back transactions
		else 			Messages.info(MSGGRP.TRX,5); // Transactions successfully rolled back

		if (!failed)
		{
			if (!await FormEvents.raise(FormEvent.AppEvent(EventType.PostRollback)))
				return(false);
		}

		return(!failed);
	}


	private parent$:Form = null;
	private links$:Relation[] = [];
	private page$:HTMLElement = null;
	private listeners$:object[] = [];
	private autoblocks$:Block[] = [];
	private haschild$:boolean = false;

	private blocks$:Map<string,Block> =
		new Map<string,Block>();

	private lovs$:Map<string,Map<string,ListOfValues>> =
		new Map<string,Map<string,ListOfValues>>();

	private datectr$:Map<string,Map<string,DateConstraint>> =
		new Map<string,Map<string,DateConstraint>>();

	constructor(public form:Form) {}

	public get page() : HTMLElement
	{
		return(this.page$);
	}

	public set page(page:HTMLElement)
	{
		this.page$ = page;
	}

	public get parent() : Form
	{
		return(this.parent$);
	}

	public set parent(form:Form)
	{
		this.parent$ = form;
	}

	public get blocks() : Map<string,Block>
	{
		return(this.blocks$);
	}

	public get wasCalled() : boolean
	{
		return(this.parent$ != null);
	}

	public get parentForm() : Form
	{
		return(this.parent$);
	}

	public get hasModalChild() : boolean
	{
		return(this.haschild$);
	}

	public set hasModalChild(flag:boolean)
	{
		this.haschild$ = flag;
	}

	public get listeners() : object[]
	{
		return(this.listeners$);
	}

	public set listeners(listeners:object[])
	{
		this.listeners$ = listeners;
	}

	public getListOfValues(block:string, field:string) : ListOfValues
	{
		block = block?.toLowerCase();
		field = field?.toLowerCase();
		return(this.lovs$.get(block)?.get(field));
	}

	public removeListOfValues(block:string, field:string) : void
	{
		block = block?.toLowerCase();
		field = field?.toLowerCase();
		this.lovs$.get(block)?.delete(field);
	}

	public setListOfValues(block:string, field:string, lov:ListOfValues) : void
	{
		block = block?.toLowerCase();
		field = field?.toLowerCase();

		let lovs:Map<string,ListOfValues> = this.lovs$.get(block);

		if (lovs == null)
		{
			lovs = new Map<string,ListOfValues>();
			this.lovs$.set(block,lovs);
		}

		lovs.set(field,lov);
	}

	public getDateConstraint(block:string, field:string) : DateConstraint
	{
		block = block?.toLowerCase();
		field = field?.toLowerCase();
		return(this.datectr$.get(block)?.get(field));
	}

	public setDateConstraint(block:string, field:string, constr:DateConstraint) : void
	{
		block = block?.toLowerCase();
		field = field?.toLowerCase();

		let cstrs:Map<string,DateConstraint> = this.datectr$.get(block);

		if (cstrs == null)
		{
			cstrs = new Map<string,DateConstraint>();
			this.datectr$.set(block,cstrs);
		}

		cstrs.set(field,constr);
	}

	public setAutoGenerated(block:Block) : void
	{
		this.autoblocks$.push(block);
	}

	public get links() : Relation[]
	{
		return(this.links$);
	}

	public setLink(master:Key, detail:Key, orphanQueries:boolean) : void
	{
		this.links$.push({master: master, detail: detail, orphanQueries: orphanQueries});
	}

	public clearAutoGenerated() : void
	{
		this.autoblocks$.forEach((block) =>
		{
			this.lovs$.delete(block.name);
			this.blocks.delete(block.name);
			this.datectr$.delete(block.name);
		})
	}

	public hasEventListeners() : boolean
	{
		if (this.listeners.length > 1) return(true);
		if (this.listeners.length == 0) return(true);

		if (FormEvents.getListener(this.listeners[0]).filter?.type == EventType.PostViewInit)
			return(false);

		return(true);
	}

	public removeEventListener(handle:object) : void
	{
		let pos:number = this.listeners.indexOf(handle);
		this.listeners.splice(pos,1);
		FormEvents.removeListener(handle);
	}

	public removeAllEventListeners() : void
	{
		this.listeners.forEach((handle) => {FormEvents.removeListener(handle)});
		this.listeners = [];
	}
}