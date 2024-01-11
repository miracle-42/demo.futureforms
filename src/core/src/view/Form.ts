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

import { Status } from './Row.js';
import { Block } from './Block.js';
import { FieldDrag } from './FieldDrag.js';
import { Record } from '../model/Record.js';
import { DataType } from './fields/DataType.js';
import { Classes } from '../internal/Classes.js';
import { MSGGRP } from '../messages/Internal.js';
import { Messages } from '../messages/Messages.js';
import { Form as ModelForm } from '../model/Form.js';
import { Form as Internal } from '../internal/Form.js';
import { Logger, Type } from '../application/Logger.js';
import { Block as ModelBlock } from '../model/Block.js';
import { ListOfValues } from '../public/ListOfValues.js';
import { Form as InterfaceForm } from '../public/Form.js';
import { FieldInstance } from './fields/FieldInstance.js';
import { EventType } from '../control/events/EventType.js';
import { FormBacking } from '../application/FormBacking.js';
import { FormsModule } from '../application/FormsModule.js';
import { EventStack } from '../control/events/EventStack.js';
import { DateConstraint } from '../public/DateConstraint.js';
import { Canvas } from '../application/interfaces/Canvas.js';
import { FieldProperties } from '../public/FieldProperties.js';
import { BrowserEvent } from '../control/events/BrowserEvent.js';
import { KeyMap, KeyMapping } from '../control/events/KeyMap.js';
import { FlightRecorder } from '../application/FlightRecorder.js';
import { RowIndicator } from '../application/tags/RowIndicator.js';
import { FormEvent, FormEvents } from '../control/events/FormEvents.js';
import { MouseMap, MouseMapParser } from '../control/events/MouseMap.js';
import { FilterIndicator } from '../application/tags/FilterIndicator.js';
import { ApplicationHandler } from '../control/events/ApplicationHandler.js';

export class Form implements EventListenerObject
{
	public static current() : Form
	{
		return(FormBacking.getCurrentViewForm());
	}

	public static previous() : Form
	{
		return(FormBacking.getPreviousViewForm());
	}

	private focus$:boolean = null;
	private canvas$:Canvas = null;
	private modfrm$:ModelForm = null;
	private parent$:InterfaceForm = null;
	private curinst$:FieldInstance = null;
	private lastinst$:FieldInstance = null;
	private blocks$:Map<string,Block> = new Map<string,Block>();
	private indicators:Map<string,RowIndicator[]> = new Map<string,RowIndicator[]>();
	private fltindicators:Map<string,FilterIndicator[]> = new Map<string,FilterIndicator[]>();

	constructor(parent:InterfaceForm)
	{
		this.parent$ = parent;
		FormBacking.setViewForm(parent,this);
		this.modfrm$ = FormBacking.getModelForm(this.parent,true);
		Logger.log(Type.formbinding,"Create viewform: "+this.parent.name);
	}

	public get name() : string
	{
		return(this.parent.name);
	}

	public get parent() : InterfaceForm
	{
		return(this.parent$);
	}

	public get canvas() : Canvas
	{
		return(this.canvas$);
	}

	public set canvas(canvas:Canvas)
	{
		this.canvas$ = canvas;
		this.canvas$.getView().setAttribute("form",this.name);
		this.canvas$.getContent()?.addEventListener("focus",this);
		if (this.parent instanceof Internal) this.canvas$.getView().setAttribute("internal","true");
	}

	public get model() : ModelForm
	{
		return(this.modfrm$);
	}

	public get block() : Block
	{
		return(this.current?.field.block);
	}

	public get current() : FieldInstance
	{
		return(this.curinst$);
	}

	public set current(inst:FieldInstance)
	{
		this.curinst$ = inst;
	}

	public async clear(flush:boolean) : Promise<boolean>
	{
		if (flush && !await this.model.flush())
			return(false);

		this.blocks$.forEach((block) =>
		{
			if (block.model.ctrlblk)
			{
				block.clear(true,true,true);
			}
			else
			{
				block.model.clear(false);

				for (let i = 0; i < block.rows; i++)
					block.getRow(i).clear();
			}
		})

		return(true);
	}

	public getBlock(name:string) : Block
	{
		return(this.blocks$.get(name));
	}

	public getBlocks() : Block[]
	{
		let blocks:Block[] = [];

		this.blocks$.forEach((block) =>
			{blocks.push(block)})

		return(blocks);
	}

	public addBlock(block:Block) : void
	{
		this.blocks$.set(block.name,block);
		Logger.log(Type.formbinding,"Add block '"+block.name+"' to viewform: "+this.parent.name);
	}

	public getIndicators(block:string) : RowIndicator[]
	{
		let indicators:RowIndicator[] = this.indicators.get(block);
		if (indicators == null) return([]);
		return(indicators);
	}

	public addIndicator(ind:RowIndicator) : void
	{
		let block:string = ind.binding.toLowerCase();
		let indicators:RowIndicator[] = this.indicators.get(block);

		if (indicators == null)
		{
			indicators = [];
			this.indicators.set(block,indicators);
		}

		indicators.push(ind);
	}

	public setFilterIndicator(block:ModelBlock,flag:boolean)
	{
		block.view.setFilterIndicators(this.fltindicators.get(block.name),flag);
	}

	public addFilterIndicator(ind:FilterIndicator) : void
	{
		let block:string = ind.binding.toLowerCase();
		let fltindicators:FilterIndicator[] = this.fltindicators.get(block);

		if (fltindicators == null)
		{
			fltindicators = [];
			this.fltindicators.set(block,fltindicators);
		}

		fltindicators.push(ind);
	}

	public skip() : void
	{
		this.current?.skip();
	}

	public blur(ignore?:boolean, stay?:boolean) : void
	{
		this.current?.blur(ignore);
		// Should postfield trigger or not
		if (!stay) this.lastinst$ = this.current;
	}

	public async focus() : Promise<boolean>
	{
		let inst:FieldInstance = this.current;
		if (!inst && this.blocks$.size > 0) inst = this.blocks$.values().next().value.current;

		if (!inst) return(false);
		inst.focus();
	}

	public dragfields(header:HTMLElement) : void
	{
		let fd:FieldDrag = new FieldDrag(this,header);
		fd.start();
	}

	public async validate() : Promise<boolean>
	{
		let inst:FieldInstance = this.current;

		if (inst == null)
			return(true);

		if (!await inst.field.block.validate())
			return(false);

		return(this.model.flush());
	}

	public validated() : boolean
	{
		let valid:boolean = true;

		this.blocks$.forEach((blk) =>
		{
			if (!blk.validated)
				valid = false;
		})

		if (!valid)
		{
			this.focus();
			return(false);
		}

		return(true);
	}

	public async onCanvasFocus() : Promise<boolean>
	{
		let preform:Form = Form.current();

		if (preform && preform != this)
		{
			if (!await preform.validate())
			{
				preform.focus();
				return(false);
			}

			if (!await this.leaveForm(preform))
			{
				preform.focus();
				return(false);
			}

			if (!await this.enterForm(this))
			{
				preform.focus();
				return(false);
			}

			this.setURL();
			this.canvas.activate();
			FormBacking.setCurrentForm(this);
		}

		return(true);
	}

	public async enter(inst:FieldInstance) : Promise<boolean>
	{
		let preform:Form = Form.current();
		let preinst:FieldInstance = this.current;
		let preblock:Block = this.current?.field.block;

		let nxtblock:Block = inst.field.block;
		let visited:boolean = nxtblock.visited;
		let recoffset:number = nxtblock.offset(inst);

		if (preform == this && inst == this.current)
			return(true);

		/**********************************************************************
			Go to form
		 **********************************************************************/

		let backing:FormBacking = FormBacking.getBacking(this.parent);

		// Check if 'I' have been closed
		if (backing == null) return(false);

		if (this != preform)
		{
			// When modal call, allow leaving former form in any state

			let modal:boolean = false;

			if (backing.wasCalled)
			{
				if (!preform || preform.parent == backing.parent)
					modal = true;
			}

			if (!modal)
			{
				if (preform != null)
				{
					preform.blur(true);

					if (!await this.checkLeave(preform))
					{
						FormBacking.setCurrentForm(null);
						preform.focus();
						return(false);
					}

					inst.focus(true);
				}
			}

			if (!await this.enterForm(this))
			{
				preform.focus();
				return(false);
			}
		}

		/**********************************************************************
			Leave this forms current record and block
		 **********************************************************************/

		if (preblock != null)
		{
			// PostField already fired on blur

			if (preblock != nxtblock)
			{
				if (!await preblock.validate())
				{
					this.focus();
					return(false);
				}

				if (!await this.leaveRecord(preblock))
				{
					this.focus();
					return(false);
				}

				if (!await this.leaveBlock(preblock))
				{
					this.focus();
					return(false);
				}
			}
			else if (recoffset != 0)
			{
				if (!await nxtblock.validateRow())
				{
					this.focus();
					return(false);
				}

				if (!await this.leaveRecord(preblock))
				{
					this.focus();
					return(false);
				}
			}
		}

		/**********************************************************************
			Enter this forms current block and record
		 **********************************************************************/

		if (nxtblock != preblock)
		{
			if (!await this.enterBlock(nxtblock,recoffset))
			{
				this.focus();
				return(false);
			}

			if (!await this.enterRecord(nxtblock,recoffset))
			{
				this.focus();
				return(false);
			}
		}
		else if (recoffset != 0)
		{
			if (!await this.enterRecord(nxtblock,recoffset))
			{
				this.focus();
				return(false);
			}
		}

		nxtblock.current = inst;
		FormBacking.setCurrentForm(this);
		nxtblock.setCurrentRow(inst.row,true);

		if (preform) this.parent.canvas.activate();

		// Prefield
		if (inst != preinst)
		{
			if (!await this.enterField(inst,0))
			{
				inst.blur(true);

				if (preform != this) preform.focus();
				else if (this.current) this.current.focus(true);

				return(false);
			}
		}

		if (preblock != nxtblock || recoffset != 0 || !visited)
		{
			if (nxtblock.getRecord(recoffset))
				await this.onRecord(nxtblock);
		}

		this.setURL();
		this.current = inst;

		return(true);
	}

	public async checkLeave(curr:Form) : Promise<boolean>
	{
		if (!await curr.validate())
			return(false);

		if (this.focus$ && !await curr.leaveField(null,0,true))
			return(false);

		if (!await this.leaveForm(curr))
			return(false);

		return(true);
	}

	public async leave(inst:FieldInstance) : Promise<boolean>
	{
		if (!await this.leaveField(inst))
		{
			Form.current().focus();
			return(false);
		}
		return(true);
	}

	public async enterForm(form:Form) : Promise<boolean>
	{
		FormBacking.setCurrentForm(form);
		if (!await this.setEventTransaction(EventType.PreForm)) return(false);
		let success:boolean = await this.fireFormEvent(EventType.PreForm,form.parent);
		this.model.endEventTransaction(EventType.PreForm,null,success);

		if (success)
		{
			form.focus$ = true;
			if (FormsModule.showurl) this.setURL();
		}
		else
		{
			FormBacking.setCurrentForm(null);
		}

		return(success);
	}

	public async enterBlock(block:Block, offset:number) : Promise<boolean>
	{
		if (!await this.setEventTransaction(EventType.PreBlock,block,offset)) return(false);
		let success:boolean = await this.fireBlockEvent(EventType.PreBlock,block.name);
		block.model.endEventTransaction(EventType.PreBlock,success);
		return(success);
	}

	public async enterRecord(block:Block, offset:number) : Promise<boolean>
	{
		if (block.model.getRecord(offset) == null) return(true);
		if (!await this.setEventTransaction(EventType.PreRecord,block,offset)) return(false);
		let success:boolean = await this.fireBlockEvent(EventType.PreRecord,block.name);
		block.model.endEventTransaction(EventType.PreRecord,success);
		return(success);
	}

	public async onRecord(block:Block) : Promise<boolean>
	{
		if (!block) return(true);
		if (!await this.model.checkEventTransaction(EventType.OnRecord,null)) return(false);
		let success:boolean = await this.fireBlockEvent(EventType.OnRecord,block.name);
		block.model.endEventTransaction(EventType.OnRecord,success);
		return(success);
	}

	public async onCreateRecord(block:Block, record:Record) : Promise<boolean>
	{
		if (!await this.setEventTransaction(EventType.OnCreateRecord,block,record)) return(false);
		let success:boolean = await this.fireBlockEvent(EventType.OnCreateRecord,block.name);
		block.model.endEventTransaction(EventType.OnCreateRecord,success);
		return(success);
	}

	public async enterField(inst:FieldInstance, offset:number, force?:boolean) : Promise<boolean>
	{
		if (inst == null)
			return(false);

		if (!force && inst == this.current)
			return(true);

		this.current = inst;
		this.lastinst$ = null;

		if (!force && inst?.field.row.status == Status.na)
			return(true);

		if (!await this.setEventTransaction(EventType.PreField,inst.field.block,offset)) return(false);
		let success:boolean = await this.fireFieldEvent(EventType.PreField,inst);
		inst.field.block.model.endEventTransaction(EventType.PreField,success);
		return(success);
	}

	public async leaveForm(form:Form) : Promise<boolean>
	{
		if (!form.focus$) return(true);
		if (!await this.setEventTransaction(EventType.PostForm)) return(false);
		let success:boolean = await this.fireFormEvent(EventType.PostForm,form.parent);
		this.endEventTransaction(EventType.PostBlock,success);
		if (success) form.focus$ = false;
		return(success);
	}

	public async leaveBlock(block:Block, offset?:number) : Promise<boolean>
	{
		if (!await this.setEventTransaction(EventType.PostBlock,block,offset)) return(false);
		let success:boolean = await this.fireBlockEvent(EventType.PostBlock,block.name);
		block.endEventTransaction(EventType.PostBlock,success);
		if (success) success = await block.model.flush();
		return(success);
	}

	public async leaveRecord(block:Block, offset?:number) : Promise<boolean>
	{
		if (block.model.getRecord(offset) == null) return(true);
		if (!await this.setEventTransaction(EventType.PostRecord,block,offset)) return(false);
		let success:boolean = await this.fireBlockEvent(EventType.PostRecord,block.name);
		block.endEventTransaction(EventType.PostRecord,success);
		return(success);
	}

	public async leaveField(inst?:FieldInstance, offset?:number, force?:boolean) : Promise<boolean>
	{
		if (inst == null)
			inst = this.current;

		if (!force && inst == this.lastinst$)
			return(true);

		if (inst?.field.row.status == Status.na)
			return(true);

		this.lastinst$ = inst;
		if (!inst) return(true);

		if (!await this.setEventTransaction(EventType.PostField,inst.field.block,offset)) return(false);
		let success:boolean = await this.fireFieldEvent(EventType.PostField,inst);
		inst.field.block.model.endEventTransaction(EventType.PostField,success);

		return(success);
	}

	public sendkey(key:KeyMap, block?:string, field?:string, clazz?:string) : boolean
	{
		block = block?.toLowerCase();
		field = field?.toLowerCase();

		let brwevent:BrowserEvent = BrowserEvent.get().clone();
		brwevent.setKeyEvent(key);

		if (this.current)
		{
			if (!field) field = this.current.field.name;
			if (!block) block = this.current.field.block.name;
		}

		if (!block || !field)
		{
			// Unable to locate field or block
			Messages.warn(MSGGRP.FRAMEWORK,17,block+"."+field);
			return(false);
		}

		if (this.current)
		{
			// If field matches current field instance, then use that
			if (field == this.current.field.name && block == this.current.field.block.name)
			{
				if (!clazz || (clazz && !this.current.properties.hasClass(clazz)))
				{
					EventStack.send(this.current,brwevent);
					return(true);
				}
			}
		}

		let blk:Block = this.getBlock(block.toLowerCase());
		let match:FieldInstance[] = blk?.getInstancesByClass(field,clazz);

		if (!match || match.length == 0)
		{
			// Unable to locate field or block
			Messages.warn(MSGGRP.FRAMEWORK,17,block+"."+field);
			return(false);
		}

		EventStack.send(match[0],brwevent);
		return(true);
	}

	public async keyhandler(key:KeyMap, inst?:FieldInstance) : Promise<boolean>
	{
		let success:boolean = false;
		if (key == null) return(true);

		let block:Block = inst?.field.block;
		let mblock:ModelBlock = inst?.field.block.model;

		if (key == KeyMap.dump)
		{
			FlightRecorder.dump();
			return(true);
		}

		if (inst == null)
		{
			if (key == KeyMap.lov)
				inst = this.current;

			if (key == KeyMap.calendar)
				inst = this.current;

			if (key == KeyMap.delete)
				inst = this.current;

			if (key == KeyMap.refresh)
				inst = this.current;

			if (key == KeyMap.lastquery)
				inst = this.current;

			if (key == KeyMap.enterquery)
				inst = this.current;

			if (key == KeyMap.executequery)
				inst = this.current;

			if (key == KeyMap.insert || KeyMap.insertAbove)
				inst = this.current;

			block = inst?.field.block;
			mblock =	inst?.field.block.model;
		}

		if (key == KeyMap.enter)
		{
			if (mblock && mblock.querymode) key = KeyMap.executequery;
			else if (this.current?.field.block.model.querymode) key = KeyMap.executequery;
		}

		let frmevent:FormEvent = FormEvent.KeyEvent(this.parent,inst,key);

		if (!await FormEvents.raise(frmevent))
			return(false);

		if (key == KeyMap.clearform)
			return(this.clear(false));

		if (inst != null)
		{
			let qmode:boolean = mblock?.querymode;

			if (key == KeyMap.clearblock)
				return(inst.field.block.model.clear(true));

			if (KeyMapping.isRowNav(key))
			{
				success = await block.navigateRow(key,inst);
				return(success);
			}

			if (KeyMapping.isBlockNav(key))
			{
				success = await block.navigateBlock(key,inst);
				return(success);
			}

			if (KeyMapping.isFormNav(key))
			{
				success = await this.navigateForm(key,inst);;
				return(success);
			}

			if (key == KeyMap.escape)
			{
				if (inst.field.row.status == Status.qbe)
				{
					this.model.cancelQueryMode(inst.field.block.model);
					return(success);
				}

				if (inst.field.row.status == Status.new || inst.field.row.status == Status.insert)
					key = KeyMap.delete;
			}

			if (key == KeyMap.enter)
			{
				if (inst.field.block.empty())
					return(true);

				success = await block.validateRow();
				if (success) success = await block.model.flush();

				return(success);
			}

			if (key == KeyMap.refresh)
			{
				if (qmode)
					return(false);

				if (inst.field.block.empty())
					return(true);

				await mblock.refresh(0,true);
				return(true);
			}

			if (key == KeyMap.lastquery)
			{
				if (qmode) mblock.showLastQuery();
				return(true);
			}

			if (key == KeyMap.enterquery)
			{
				if (qmode) return(true);

				if (!inst.field.block.model.queryallowed)
					return(false);

				success = await this.model.enterQuery(inst.field.block.model);
				return(success);
			}

			if (key == KeyMap.executequery)
			{
				if (mblock.queryallowed)
				{
					success = await this.model.executeQuery(mblock,false,true);
					return(success);
				}
			}

			if (key == KeyMap.queryeditor)
			{
				if (!qmode) return(false);

				if (!inst.qbeProperties.advquery)
					return(true);

				let params:Map<string,any> = new Map<string,any>();

				params.set("form",this.parent);
				params.set("field",inst.name);
				params.set("block",inst.block);
				params.set("value",inst.getValue());
				params.set("type",DataType[block.fieldinfo.get(inst.name).type]);
				params.set("properties",new FieldProperties(inst.defaultProperties));

				await this.parent.callform(Classes.AdvancedQueryClass,params);
				return(true);
			}

			if (key == KeyMap.insert)
			{
				if (qmode) return(false);

				let ok:boolean = mblock.insertallowed;

				mblock.getMasterBlocks().forEach((blk) =>
					{if (blk.empty) ok = false;})

				if (!mblock.ctrlblk && ok)
					await mblock.insert(false);

				return(true);
			}

			if (key == KeyMap.insertAbove)
			{
				if (qmode) return(false);

				let ok:boolean = mblock.insertallowed;

				mblock.getMasterBlocks().forEach((blk) =>
				{if (blk.empty) ok = false;})

				if (!mblock.ctrlblk && ok)
					mblock.insert(true);

				return(true);
			}

			if (key == KeyMap.delete)
			{
				if (qmode) return(false);

				if (inst.field.row.status == Status.na)
					return(false);

				let ok:boolean = mblock.deleteallowed;

				if (inst.field.row.status == Status.new)
					ok = true;

				if (inst.field.row.status == Status.insert)
					ok = true;

				if (!mblock.ctrlblk && ok)
					mblock.delete();

				return(true);
			}

			// Allow Lov and Calendar to map to same key
			if (key?.signature == KeyMap.lov.signature)
			{
				if (mblock.empty && !qmode)
					return(true);

				let backing:FormBacking = FormBacking.getBacking(this.parent);
				let lov:ListOfValues = backing.getListOfValues(inst.block,inst.name);

				if (lov != null)
				{
					if (qmode && lov.inQueryMode == false)
						return(true);

					if (!qmode && inst.properties.readonly && !lov.inReadOnlyMode)
						return(true);

					if (await this.showListOfValues(inst.block,inst.name))
						return(true);
				}
			}

			// As with Lov
			if (key?.signature == KeyMap.calendar.signature)
			{
				if (mblock.empty && !qmode)
					return(true);

				if (inst.properties.readonly)
					return(true);

				if (await this.showDatePicker(inst.block,inst.name))
					return(true);
			}
		}

		if (!await ApplicationHandler.instance.keyhandler(key))
			return(false);

		return(true);
	}

	public async mousehandler(mevent:MouseMap, event:Event, inst?:FieldInstance) : Promise<boolean>
	{
		if (mevent == null)
			return(true);

		let frmevent:FormEvent = FormEvent.MouseEvent(this.parent,mevent,inst);

		if (!await FormEvents.raise(frmevent))
			return(false);

		if (!await ApplicationHandler.instance.mousehandler(mevent))
			return(false);

		return(true);
	}

	public async showDatePicker(block:string, field:string, row?:number) : Promise<boolean>
	{
		let blk:Block = this.getBlock(block);
		let type:DataType = blk.fieldinfo.get(field)?.type;

		if (!blk)
			return(false);

		if (!this.model.getBlock(block)?.getRecord())
			return(false);

		if (type == DataType.date || type == DataType.datetime)
		{
			if (!await blk.goRow(row)) return(false);
			let value:Date = blk.model.getValue(field);
			let params:Map<string,any> = new Map<string,any>();
			let backing:FormBacking = FormBacking.getBacking(this.parent);
			let datecstr:DateConstraint = backing.getDateConstraint(block,field)

			params.set("field",field);
			params.set("block",block);
			params.set("value",value);
			params.set("form",this.parent);
			params.set("constraint",datecstr);
			this.parent.callform(Classes.DatePickerClass,params);

			return(true);
		}

		return(false);
	}

	public async showListOfValues(block:string, field:string, row?:number, force?:boolean) : Promise<boolean>
	{
		let blk:Block = this.getBlock(block);
		let params:Map<string,any> = new Map<string,any>();
		let backing:FormBacking = FormBacking.getBacking(this.parent);
		let lov:ListOfValues = backing.getListOfValues(block,field);

		if (!blk)
			return(false);

		if (!blk.model?.getRecord())
			return(false);

		if (lov != null)
		{
			if (!force)
			{
				// Only 1 LOV can be running
				if (FormBacking.getChildForms(this.parent,Classes.ListOfValuesClass).length > 0)
					return(false);
			}

			if (!await blk.goRow(row))
				return(false);

			params.set("lov",lov);
			params.set("field",field);
			params.set("block",block);
			params.set("form",this.parent);
			this.parent.callform(Classes.ListOfValuesClass,params);

			return(true);
		}

		return(false);
	}

	public async navigateForm(key:KeyMap, inst:FieldInstance) : Promise<boolean>
	{
		let next:Block = null;

		switch(key)
		{
			case KeyMap.nextblock :
			{
				let blks:Block[] = [...this.blocks$.values()];

				let nxt:boolean = false;
				next = blks[blks.length-1];

				for (let i = 0; i < blks.length; i++)
				{
					if (nxt)
					{
						next = blks[i];
						break;
					}

					if (blks[i] == inst.field.block)
						nxt = true;
				}

				break;
			}

			case KeyMap.prevblock :
			{
				let blks:Block[] = [...this.blocks$.values()];

				next = blks[0];
				let nxt:boolean = false;

				for (let i = blks.length-1; i >= 0; i--)
				{
					if (nxt)
					{
						next = blks[i];
						break;
					}

					if (blks[i] == inst.field.block)
						nxt = true;
				}

				break;
			}
		}

		if (next) next.focus();
		return(next != null);
	}

	private async setEventTransaction(event:EventType, block?:Block, recoff?:Record|number) : Promise<boolean>
	{
		let record:Record = null;
		if (recoff == null) recoff = 0;

		if (block != null)
		{
			if (typeof(recoff) !== "number")	record = recoff;
			else record = block.model.getRecord(recoff);
		}

		return(this.model.setEventTransaction(event,block?.model,record));
	}

	private endEventTransaction(event:EventType, apply:boolean) : void
	{
		this.model.endEventTransaction(event,null,apply);
	}

	private event:BrowserEvent = BrowserEvent.get();
	public async handleEvent(event:Event) : Promise<void>
	{
      let bubble:boolean = false;
		this.event.setEvent(event);

		if (this.event.type == "focus")
			await this.onCanvasFocus();

		if (this.event.type == "skip")
			return;

		if (this.event.type == "wait")
			await this.event.wait();

		if (this.event.waiting)
			return;

		if (this.event.accept || this.event.cancel)
			bubble = true;

		if (this.event.bubbleMouseEvent)
			bubble = true;

		if (this.event.onScrollUp)
			bubble = true;

		if (this.event.onScrollDown)
			bubble = true;

		if (this.event.onCtrlKeyDown)
			bubble = true;

		if (this.event.onFuncKey)
			bubble = true;

		this.event.preventDefault();

		if (bubble)
		{
			if (this.event.type.startsWith("key"))
			{
				let key:KeyMap = KeyMapping.parseBrowserEvent(this.event);
				await this.keyhandler(key);
			}
			else
			{
				let mevent:MouseMap = MouseMapParser.parseBrowserEvent(this.event);
				await this.mousehandler(mevent,event);
			}
		}
	}

	public rehash(block?:string) : void
	{
		let ordered:Instance[] = [];
		let form:HTMLElement = this.parent.getView();
		let index:Map<HTMLElement,Instance> = new Map<HTMLElement,Instance>();

		if (block)
		{
			// Register HTMLElements for given block
			this.getBlock(block)?.getFieldInstances(true).forEach((inst) =>
			{
				{index.set(inst.element,{block: inst.block, row: inst.row, inst: inst})}
			})
		}
		else
		{
		// Register all HTMLElements
		this.getBlocks().forEach((blk) =>
			{
				blk.getFieldInstances(true).forEach((inst) =>
				{index.set(inst.element,{block: inst.block, row: inst.row, inst: inst})})
			});
		}

		// Get all elements in new order
		this.getElements(form,index,ordered);

		ordered = ordered.sort((a,b) =>
		{
			if (a.block != b.block)
			{
				if (a.block > b.block) return(1);
				return(-1);
			}

			if (a.row != b.row)
				return(a.row - b.row);

			return(0);
		});

		block = null;

		let row:number = null;
		let fields:FieldInstance[] = null;
		let blockmap:Map<number,FieldInstance[]> = null;

		let formmap:Map<string,Map<number,FieldInstance[]>> =
			new Map<string,Map<number,FieldInstance[]>>();

		for (let i = 0; i < ordered.length; i++)
		{
			if (ordered[i].block != block)
			{
				row = null;
				block = ordered[i].block;
				blockmap = new Map<number,FieldInstance[]>();

				formmap.set(block,blockmap);
			}

			if (ordered[i].row != row)
			{
				fields = [];
				row = ordered[i].row;
				blockmap.set(row,fields);
			}

			fields.push(ordered[i].inst);
		}

		formmap.forEach((blkmap,blk) =>
		{
			blkmap.forEach((instances,row) =>
			{this.getBlock(blk)?.getRow(row)?.setInstances(instances);})
		})
	}

	private getElements(element:HTMLElement, index:Map<HTMLElement,Instance>, ordered:Instance[]) : void
	{
		let inst:Instance = null;
		let elem:HTMLElement = null;

		for (let i = 0; i < element.childNodes.length; i++)
		{
			elem = element.childNodes.item(i) as HTMLElement;

			inst = index.get(elem);
			if (inst) ordered.push(inst);
			else this.getElements(elem,index,ordered);
		}
	}

	public setURL(close?:boolean) : void
	{
		if (!FormsModule.showurl)
			return;

		let location:Location = window.location;
		let params:URLSearchParams = new URLSearchParams(location.search);
		let path:string = location.protocol + '//' + location.host + location.pathname;

		if (!(this.parent instanceof InterfaceForm))
			close = true;

		if (close)
		{
			window.history.replaceState('','',path);
			return;
		}

		let map:string = FormsModule.getFormPath(this.parent.name);
		let nav:boolean = FormBacking.getURLNavigable(map);

		if (map != null && nav)
		{
			params.set("form",map)
			window.history.replaceState('','',path+"?"+params);
		}
	}

	public async finalize() : Promise<void>
	{
		this.blocks$.forEach((blk) => {blk.finalize();});
		this.addEvents(this.parent.getView());
		this.indicators.clear();
	}

	private async fireFormEvent(type:EventType, form:InterfaceForm) : Promise<boolean>
	{
		let frmevent:FormEvent = FormEvent.FormEvent(type,form);
		return(FormEvents.raise(frmevent));
	}

	private async fireBlockEvent(type:EventType, block:string) : Promise<boolean>
	{
		let frmevent:FormEvent = FormEvent.BlockEvent(type,this.parent,block);
		return(FormEvents.raise(frmevent));
	}

	private async fireFieldEvent(type:EventType, inst:FieldInstance) : Promise<boolean>
	{
		let frmevent:FormEvent = FormEvent.FieldEvent(type,inst);
		return(FormEvents.raise(frmevent));
	}

	private addEvents(element:HTMLElement) : void
	{
		element.addEventListener("keyup",this);
		element.addEventListener("keydown",this);
		element.addEventListener("keypress",this);

		element.addEventListener("click",this);
		element.addEventListener("dblclick",this);
		element.addEventListener("contextmenu",this);
	}
}

class Instance
{
	row:number;
	block:string;
	inst:FieldInstance;
}