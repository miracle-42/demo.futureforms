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

import { Class } from '../types/Class.js';
import { Block } from '../public/Block.js';
import { Alert } from '../application/Alert.js';
import { Key } from '../model/relations/Key.js';
import { Form as ViewForm } from '../view/Form.js';
import { KeyMap } from '../control/events/KeyMap.js';
import { Framework } from '../application/Framework.js';
import { ListOfValues } from '../public/ListOfValues.js';
import { EventType } from '../control/events/EventType.js';
import { FormsModule } from '../application/FormsModule.js';
import { FormBacking } from '../application/FormBacking.js';
import { DateConstraint } from '../public/DateConstraint.js';
import { DataSource } from '../model/interfaces/DataSource.js';
import { EventFilter } from '../control/events/EventFilter.js';
import { TriggerFunction } from '../public/TriggerFunction.js';
import { Canvas, View } from '../application/interfaces/Canvas.js';
import { CanvasComponent } from '../application/CanvasComponent.js';
import { FormEvent, FormEvents } from '../control/events/FormEvents.js';


/*
 * This is an exact copy of the public form. Its sole purpose is to circumvent:
 * ReferenceError: Cannot access 'Form' before initialization
 * when calling internal forms from public forms
 */


export class Form implements CanvasComponent
{
	public moveable:boolean = false;
	public navigable:boolean = false;
	public resizable:boolean = false;
	public initiated:Date = new Date();
	public parameters:Map<any,any> = new Map<any,any>();

	constructor(page?:string|HTMLElement)
	{
		page = Framework.prepare(page);
		FormBacking.setBacking(this).page = page;
	}

	public get name() : string
	{
		return(this.constructor.name.toLowerCase());
	}

	public get canvas() : Canvas
	{
		return(FormBacking.getViewForm(this)?.canvas);
	}

	public get blocks() : Block[]
	{
		return(Array.from(FormBacking.getBacking(this).blocks.values()))
	}

	public hide() : void
	{
		this.canvas.remove();
	}

	public show() : void
	{
		this.canvas.restore();
		this.focus();
	}

	public async clear(force?:boolean) : Promise<boolean>
	{
		if (force) FormBacking.getModelForm(this)?.clear()
		return(FormBacking.getViewForm(this)?.clear(!force));
	}

	public focus() : void
	{
		FormBacking.getViewForm(this)?.focus();
	}

	public getCurrentBlock() : Block
	{
		return(this.getBlock(FormBacking.getViewForm(this).block.name));
	}

	public async reQuery(block:string) : Promise<boolean>
	{
		block = block?.toLowerCase();
		let blk:Block = this.getBlock(block);

		if (blk == null)
		{
			Alert.fatal("Block '"+block+"' does not exist","Re Query");
			return(false);
		}

		return(blk.reQuery());
	}

	public async enterQueryMode(block:string) : Promise<boolean>
	{
		block = block?.toLowerCase();
		let blk:Block = this.getBlock(block);

		if (blk == null)
		{
			Alert.fatal("Block '"+block+"' does not exist","Execute Query");
			return(false);
		}

		return(blk.enterQueryMode());
	}

	public async executeQuery(block:string) : Promise<boolean>
	{
		block = block?.toLowerCase();
		let blk:Block = this.getBlock(block);

		if (blk == null)
		{
			Alert.fatal("Block '"+block+"' does not exist","Enter Query Mode");
			return(false);
		}

		return(blk.executeQuery());
	}

	public showDatePicker(block:string, field:string) : void
	{
		block = block?.toLowerCase();
		field = field?.toLowerCase();
		FormBacking.getViewForm(this).showDatePicker(block,field);
	}

	public showListOfValues(block:string, field:string, force?:boolean) : void
	{
		block = block?.toLowerCase();
		field = field?.toLowerCase();
		FormBacking.getViewForm(this).showListOfValues(block,field,force);
	}

	public async sendkey(key:KeyMap, block?:string, field?:string, clazz?:string) : Promise<boolean>
	{
		return(FormBacking.getViewForm(this).sendkey(key,block,field,clazz));
	}

	public link(master:Key, detail:Key, orphanQueries?:boolean) : void
	{
		if (orphanQueries == null) orphanQueries = true;
		FormBacking.getBacking(this).setLink(master,detail, orphanQueries);
	}

	public goBlock(block:string) : void
	{
		this.getBlock(block)?.focus();
	}

	public goField(block:string, field:string, clazz?:string) : void
	{
		this.getBlock(block)?.goField(field,clazz);
	}

	public message(msg:string, title?:string) : void
	{
		Alert.message(msg,title);
	}

	public warning(msg:string, title?:string) : void
	{
		Alert.warning(msg,title);
	}

	public get valid() : boolean
	{
		if (FormBacking.getModelForm(this).eventTransaction.running() > 0)
			return(false);

		return(FormBacking.getViewForm(this).validated());
	}

	public async validate() : Promise<boolean>
	{
		return(FormBacking.getViewForm(this).validate());
	}

	public getView() : HTMLElement
	{
		let view:HTMLElement = this.canvas?.getView();
		if (view != null) return(this.canvas.getView());
		else return(FormBacking.getBacking(this).page);
	}

	public getViewPort() : View
	{
		return(this.canvas.getViewPort());
	}

	public setViewPort(view:View) : void
	{
		this.canvas.setViewPort(view);
	}

	public getParentViewPort() : View
	{
		return(this.canvas.getParentViewPort());
	}

	public getBlock(block:string) : Block
	{
		return(FormBacking.getBacking(this).blocks.get(block?.toLowerCase()));
	}

	public setDataSource(block:string,source:DataSource) : void
	{
		FormBacking.getModelForm(this).setDataSource(block?.toLowerCase(),source);
	}

	public setListOfValues(lov:ListOfValues, block:string, field:string|string[]) : void
	{
		if (!Array.isArray(field))
			field = [field];

		for (let i = 0; i < field.length; i++)
			FormBacking.getBacking(this).setListOfValues(block,field[i],lov);
	}

	public setDateConstraint(datecstr:DateConstraint, block:string, field:string|string[]) : void
	{
		if (!Array.isArray(field))
			field = [field];

		for (let i = 0; i < field.length; i++)
			FormBacking.getBacking(this).setDateConstraint(block,field[i],datecstr);
	}

	public getValue(block:string, field:string) : any
	{
		return(this.getBlock(block)?.getValue(field));
	}

	public setValue(block:string, field:string, value:any) : void
	{
		this.getBlock(block)?.setValue(field,value);
	}

	public async flush() : Promise<boolean>
	{
		return(FormBacking.getModelForm(this).flush());
	}

	public async showform(form:Class<Form>|string, parameters?:Map<any,any>, container?:HTMLElement) : Promise<Form>
	{
		if (!await this.validate()) return(null);
		let cform:Form = await FormsModule.get().showform(form,parameters,container);
		return(cform);
	}

	public async callform(form:Class<Form>|string, parameters?:Map<any,any>, container?:HTMLElement) : Promise<Form>
	{
		this.canvas.block();

		FormBacking.getBacking(this).hasModalChild = true;
		let cform:Form = await FormsModule.get().showform(form,parameters,container);

		if (cform) FormBacking.getBacking(cform).parent = this;
		else       FormBacking.getBacking(this).hasModalChild = false;

		return(cform);
	}

	public reIndexFieldOrder() : void
	{
		FormBacking.getViewForm(this).rehash();
	}

	public startFieldDragging() : void
	{
		let label:HTMLElement = Framework.getEvent().target;
		FormBacking.getViewForm(this).dragfields(label);
	}

	public async setView(page:string|HTMLElement) : Promise<void>
	{
		let canvas:Canvas = this.canvas;
		let back:FormBacking = FormBacking.getBacking(this);

		if (page == null)
		{
			page = "";

			if (back.page == null)
				return;
		}

		if (canvas != null)
		{
			if (!this.validate())
			{
				Alert.warning("Form must be validated before layout can be changed","Validate");
				return;
			}

			if (FormBacking.getBacking(this).hasEventListeners())
				console.warn("Replacing view will remove all event listeners");

			FormBacking.cleanup(this);
		}

		page = Framework.prepare(page);
		Framework.parse(this,page);
		back.page = page;

		if (canvas != null)
		{
			canvas.replace(page);
			FormBacking.getViewForm(this,true).canvas = canvas;
		}

		await FormBacking.getViewForm(this,true).finalize();
		await FormBacking.getModelForm(this,true).finalize();
	}

	public async close(force?:boolean) : Promise<boolean>
	{
		let vform:ViewForm = FormBacking.getViewForm(this);

		if (vform == null)
			return(true);

		await FormBacking.getModelForm(this).wait4EventTransaction(EventType.OnCloseForm,null);

		if (!await FormEvents.raise(FormEvent.FormEvent(EventType.OnCloseForm,this)))
			return(false);

		if (!await this.clear(force))
			return(false);

		this.canvas.close();
		let parent:Form = FormBacking.getBacking(this).parent;

		if (parent != null)
		{
			parent.canvas.unblock();

			parent.focus();

			if (FormBacking.getBacking(parent))
				FormBacking.getBacking(parent).hasModalChild = false;
		}

		FormBacking.removeBacking(this);
		let success:boolean = await FormEvents.raise(FormEvent.FormEvent(EventType.PostCloseForm,this));

		return(success);
	}

	public removeEventListener(handle:object) : void
	{
		FormBacking.getBacking(this).removeEventListener(handle);
	}

	public addEventListener(method:TriggerFunction, filter?:EventFilter|EventFilter[]) : object
	{
		let handle:object = FormEvents.addListener(this,this,method,filter);
		FormBacking.getBacking(this).listeners.push(handle);
		return(handle);
	}
}