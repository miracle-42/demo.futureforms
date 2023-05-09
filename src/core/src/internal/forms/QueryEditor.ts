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

import { Form } from "../Form.js";
import { Classes } from "../Classes.js";
import { Block } from "../../public/Block.js";
import { Record } from "../../public/Record.js";
import { KeyMap } from "../../control/events/KeyMap.js";
import { Filters } from "../../model/filters/Filters.js";
import { Filter } from "../../model/interfaces/Filter.js";
import { Properties } from "../../application/Properties.js";
import { EventType } from "../../control/events/EventType.js";
import { FormEvent } from "../../control/events/FormEvent.js";
import { FieldProperties } from "../../public/FieldProperties.js";
import { Internals } from "../../application/properties/Internals.js";

export class QueryEditor extends Form
{
	private type:string = null;

	private values:Block = null;
	private options:Block = null;

	private fltprops:FieldProperties = null;
	private inclprops:FieldProperties = null;

	constructor()
	{
		super(QueryEditor.page);

		this.moveable = true;
		this.resizable = true;

		this.addEventListener(this.initialize,{type: EventType.PostViewInit});

		this.addEventListener(this.navigate,
		[
			{type: EventType.Key, key: KeyMap.nextfield},
			{type: EventType.Key, key: KeyMap.prevfield},
			{type: EventType.Key, key: KeyMap.nextblock},
			{type: EventType.Key, key: KeyMap.prevblock}
		]);
	}

	private async skip() : Promise<boolean>
	{
		return(this.close(true));
	}

	private async done() : Promise<boolean>
	{
		let value:any;
		let incl:boolean;

		await this.validate();
		let filter:Filter = null;

		let form:Form = this.parameters.get("form");
		let block:string = this.parameters.get("block");
		let field:string = this.parameters.get("field");

		switch(this.type)
		{
			case "x" :
				filter = Filters.Null(field);
				break;

			case "<" :
				value = this.options.getValue("value");
				incl = this.options.getValue("include");

				if (value != null)
				{
					form.setValue(block,field,value);
					filter = Filters.LT(field,incl);
					filter.constraint = value;
				}
				break;

			case ">" :
				value = this.options.getValue("value");
				incl = this.options.getValue("include");

				if (value != null)
				{
					form.setValue(block,field,value);
					filter = Filters.GT(field,incl);
					filter.constraint = value;
				}
				break;

			case ".." :
				let values:any[] = [];

				let data:any[][] = await this.values.getSourceData(false,true);
				data.forEach((row) => {if (row[0] != null) values.push(row[0])});

				if (values.length > 0)
				{
					form.setValue(block,field,values[0]);
					filter = Filters.AnyOf(field);
					filter.constraint = values;
				}
				break;

			case ":" :
				incl = this.options.getValue("include");
				let fr:any = this.options.getValue("value1");
				let to:any = this.options.getValue("value2");

				if (fr != null && to != null)
				{
					form.setValue(block,field,fr);
					filter = Filters.Between(field,incl);
					filter.constraint = [fr,to];
				}
				break;
		}

		if (filter != null)
			form.getBlock(block).filter.and(filter,field);

		return(this.skip());
	}

	private setOptions() : void
	{
		let rec:Record = this.options.getRecord();
		let opts:FieldProperties = rec.getProperties();

		let types:Map<string,string> = new Map<string,string>();

		types.set("x","Is null");
		types.set("..","Any off");
		types.set(":","Between");
		types.set("<","Less than");
		types.set(">","Greater than");

		opts.setValidValues(types);
		rec.setProperties(opts,"options");
	}

	private async setType() : Promise<boolean>
	{
		this.type = this.options.getValue("options");

		if (this.type == "x")
		{
			this.hideAll();
		}

		if (this.type == ":")
		{
			this.hideAll();
			this.showRange();
			this.options.goField("value1");
		}

		if (this.type == "..")
		{
			this.hideAll();
			this.showMulti();
			this.values.goField("value");
		}

		if (this.type == "<" || this.type == ">")
		{
			this.hideAll();
			this.showSingle();
			this.options.goField("value");
		}

		return(true);
	}

	private async navigate(event:FormEvent) : Promise<boolean>
	{
		if (this.type == "..")
		{
			if (event.block == "options")
			{
				this.values.goField("value");
				return(false);
			}
			else
			{
				let goopt:boolean = false;

				if (event.key == KeyMap.prevfield && this.values.record == 0) goopt = true;
				if (event.key == KeyMap.nextblock || event.key == KeyMap.prevblock) goopt = true;

				if (goopt)
				{
					this.options.goField("options");
					return(false);
				}

				if (event.key == KeyMap.prevfield)
				{
					this.values.prevrecord();
					return(false);
				}

				if (event.key == KeyMap.nextfield)
				{
					if (this.values.getValue("value"))
					{
						this.values.nextrecord();
					}
					else
					{
						this.options.goField("options");
					}

					return(false);
				}
			}
		}
		else
		{
			if (event.key == KeyMap.nextblock || event.key == KeyMap.prevblock)
				return(false);
		}

		return(true);
	}

	private async initialize() : Promise<boolean>
	{
		this.canvas.zindex = Classes.zindex;
		let view:HTMLElement = this.getView();

		this.values = this.getBlock("values");
		this.options = this.getBlock("options");

		this.setOptions();
		Internals.stylePopupWindow(view);

		let value:any = this.parameters.get("value");
		let fprops:FieldProperties = this.parameters.get("properties");

		this.fltprops = this.options.getDefaultPropertiesByClass("value","single-value")
		this.inclprops = this.options.getDefaultPropertiesByClass("include","single-value")

		this.fltprops
			.setClasses(fprops.getClasses())
			.setAttributes(fprops.getAttributes())
			.setAttribute(Properties.RecordModeAttr,"update")
			.setHidden(true);

		this.inclprops.setHidden(true).removeClass("single-value");

		this.addEventListener(this.done,{type: EventType.Key, key: KeyMap.enter});
		this.addEventListener(this.skip,{type: EventType.Key, key: KeyMap.escape});

		this.addEventListener(this.insert,{type: EventType.Key, key: KeyMap.insert, block: "values"});
		this.addEventListener(this.insert,{type: EventType.Key, key: KeyMap.insertAbove, block: "values"});

		this.addEventListener(this.setType,{type: EventType.WhenValidateField, block: "options", field: "options"});

		if (value != null)
		{
			this.values.setValue("value",value);
			this.options.setValue("value",value);
			this.options.setValue("value1",value);
		}

		this.hideAll();

		this.showMulti();
		this.type = "..";
		this.options.setValue("options","..");

		return(true);
	}

	private async insert(event:FormEvent) : Promise<boolean>
	{
		await this.values.insert(event.key == KeyMap.insertAbove);
		return(true);
	}

	private showSingle() : void
	{
		let view:HTMLElement = this.getView();
		let single:HTMLElement = view.querySelector('div[name="single-value"]');

		single.style.display = "block";

		this.fltprops.setHidden(false);
		this.inclprops.setHidden(false);

		this.fltprops.setClass("single-value");
		this.inclprops.setClass("single-value");

		this.options.setDefaultProperties(this.fltprops,"value","single-value");
		this.options.setDefaultProperties(this.inclprops,"include","single-value");

		this.fltprops.setHidden(true);
		this.inclprops.setHidden(true);

		this.fltprops.removeClass("single-value");
		this.inclprops.removeClass("single-value");
	}

	private showRange() : void
	{
		let view:HTMLElement = this.getView();
		let range:HTMLElement = view.querySelector('div[name="range-values"]');

		range.style.display = "block";

		this.fltprops.setHidden(false);
		this.inclprops.setHidden(false);

		this.fltprops.setClass("range-values");
		this.inclprops.setClass("range-values");

		this.options.setDefaultProperties(this.fltprops,"value1","range-values");
		this.options.setDefaultProperties(this.fltprops,"value2","range-values");
		this.options.setDefaultProperties(this.inclprops,"include","range-values");

		this.fltprops.setHidden(true);
		this.inclprops.setHidden(true);

		this.fltprops.removeClass("range-values");
		this.inclprops.removeClass("range-values");
	}

	private showMulti() : void
	{
		let view:HTMLElement = this.getView();
		let multi:HTMLElement = view.querySelector('div[name="multi-value"]');

		multi.style.display = "block";

		this.fltprops.setHidden(false);
		this.fltprops.setClass("multi-value");

		this.values.setInsertProperties(this.fltprops,"value","multi-value");
		this.values.setDefaultProperties(this.fltprops,"value","multi-value");

		this.fltprops.setHidden(true);
		this.fltprops.removeClass("multi-value");
	}

	private hideAll() : void
	{
		let view:HTMLElement = this.getView();

		let multi:HTMLElement = view.querySelector('div[name="multi-value"]');
		let range:HTMLElement = view.querySelector('div[name="range-values"]');
		let single:HTMLElement = view.querySelector('div[name="single-value"]');

		multi.style.display = "none";
		range.style.display = "none";
		single.style.display = "none";

		this.fltprops.setClass("single-value");
		this.inclprops.setClass("single-value");

		this.options.setDefaultProperties(this.fltprops,"value","single-value");
		this.options.setDefaultProperties(this.inclprops,"include","single-value");

		this.fltprops.removeClass("single-value");
		this.inclprops.removeClass("single-value");

		this.fltprops.setClass("range-values");
		this.inclprops.setClass("range-values");

		this.options.setDefaultProperties(this.fltprops,"value1","range-values");
		this.options.setDefaultProperties(this.fltprops,"value2","range-values");
		this.options.setDefaultProperties(this.inclprops,"include","range-values");

		this.fltprops.removeClass("range-values");
		this.inclprops.removeClass("range-values");

		this.fltprops.setClasses("multi-value");
		this.values.setDefaultProperties(this.fltprops,"value","multi-value");
		this.fltprops.removeClass("multi-value");
	}

	public static page:string =
		Internals.header +
		`
		<div name="popup-body">
			<div name="query">
				<div name="type">
					<table name="type" style="width:100%">
						<tr>
							<td style="text-align: center">
								<select name="options" from="options"></select>
							</td>
						</tr>
					</table>
				</div>
				<span style="display: block; height: 8px"></span>
				<div name="single-value">
					<table>
						<tr>
							<td>
								<input name="value" from="options" class="single-value">
							</td>
							<td>
								Incl : <input type="checkbox" name="include" from="options" boolean value="true" class="single-value">
							</td>
						</tr>
					</table>
				</div>
				<div name="range-values">
					<table>
						<tr>
							<td>
								<input name="value1" from="options" class="range-values">
							</td>
							<td>
								<input name="value2" from="options" class="range-values">
							</td>
							<td>
								Incl : <input type="checkbox" name="include" from="options" boolean value="true" class="range-values">
							</td>
						</tr>
					</table>
				</div>
				<div name="multi-value">
					<table style="margin-left: auto; margin-right: auto;">
						<tr>
							<td>
								<input name="value" from="values" row="0" class="multi-value">
							</td>
						</tr>
						<tr>
							<td>
								<input name="value" from="values" row="1" class="multi-value">
							</td>
						</tr>
						<tr>
							<td>
								<input name="value" from="values" row="2" class="multi-value">
							</td>
						</tr>
					</table>
				</div>
			</div>
		</div>
		<div name="lowerright">
			<div name="buttonarea">
				<button onClick="this.done()">Ok</button>
				<button onClick="this.close()">Close</button>
			</div>
		</div>
		`
	+ Internals.footer;
}