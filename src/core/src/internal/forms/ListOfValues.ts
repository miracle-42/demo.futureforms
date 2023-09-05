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
import { Case } from "../../public/Case.js";
import { Block } from "../../public/Block.js";
import { Alert } from "../../application/Alert.js";
import { KeyMap } from "../../control/events/KeyMap.js";
import { MouseMap } from "../../control/events/MouseMap.js";
import { FormEvent } from "../../control/events/FormEvent.js";
import { EventType } from "../../control/events/EventType.js";
import { Internals } from "../../application/properties/Internals.js";
import { ListOfValues as Properties } from "../../public/ListOfValues.js";


export class ListOfValues extends Form
{
	private form:Form = null;
	private last:string = null;
	private block:string = null;
	private results:Block = null;
	private columns:string[] = null;
	private props:Properties = null;
	private cancelled:boolean = true;

	public static DELAY:number = 300;

	constructor()
	{
		super("");

		this.moveable = true;
		this.resizable = true;

		this.addEventListener(this.initialize,{type: EventType.PostViewInit});
	}

	public accepted() : boolean
	{
		return(!this.cancelled);
	}

	private async skip() : Promise<boolean>
	{
		return(this.close());
	}

	private async done() : Promise<boolean>
	{
		this.cancelled = false;

		let source:string|string[] = this.props.sourcefields;
		let target:string|string[] = this.props.targetfields;

		if (this.form && this.block && source && target)
		{
			if (!Array.isArray(source))
				source = [source];

			if (!Array.isArray(target))
				target = [target];

			for (let i = 0; i < source.length && i < target.length; i++)
			{
				let value:any = this.results.getValue(source[i]);
				await this.form.getBlock(this.block)?.setAndValidate(target[i],value);
			}
		}

		return(await this.close());
	}

	private async onKeyStroke() : Promise<boolean>
	{
		setTimeout(() => {this.query()},ListOfValues.DELAY);
		return(true);
	}

	private query() : void
	{
		let flt:string = this.getValue("filter","criteria");
		if (flt == null) flt = "";

		if (this.props.filterPreProcesser != null)
			flt = this.props.filterPreProcesser(flt);

		if (flt.length < this.props.filterMinLength)
			return;

		if (flt != this.last)
		{
			this.last = flt;

			switch(this.props.filterCase)
			{
				case Case.upper: 		flt = flt?.toLocaleUpperCase(); 	break;
				case Case.lower: 		flt = flt?.toLocaleLowerCase(); 	break;
				case Case.initcap: 	flt = this.initcap(flt); 			break;
			}

			if (this.props.filterPrefix)
				flt = this.props.filterPrefix+flt;

			if (this.props.filterPostfix)
				flt += this.props.filterPostfix;

			if (this.props.filter)
			{
				if (!Array.isArray(this.props.filter)) this.props.filter = [this.props.filter];
				this.props.filter.forEach((filter) => {filter.constraint = flt});
			}

			if (this.props.bindvalue)
			{
				if (!Array.isArray(this.props.bindvalue)) this.props.bindvalue = [this.props.bindvalue];
				this.props.bindvalue.forEach((bindvalue) => {bindvalue.value = flt});
			}

			this.results.executeQuery();
		}
	}

	private async navigate(event:FormEvent) : Promise<boolean>
	{
		if (event.key == KeyMap.nextfield || event.key == KeyMap.prevfield)
		{
			if (event.block == "results") this.goBlock("filter");
			else 									this.goBlock("results");

			return(false);
		}

		if (event.key == KeyMap.nextrecord && event.block == "filter")
		{
			this.goBlock("results");
			return(false);
		}

		if (event.key == KeyMap.prevrecord && event.block == "results")
		{
			if (this.getBlock("results").getRecord()?.recno == 0)
			{
				this.goBlock("filter");
				return(false);
			}
		}

		return(true);
	}

	private async onFetch() : Promise<boolean>
	{
		let display:string = "";

		for (let i = 0; i < this.columns.length; i++)
		{
			let value:any = this.results.getValue(this.columns[i]);

			if (value != null)
			{
				if (i > 0) display += " ";
				display += value;
			}
		}

		this.results.setValue("display",display);
		return(true);
	}

	private async initialize() : Promise<boolean>
	{
		this.canvas.zindex = Classes.zindex;

		this.form = this.parameters.get("form");
		this.block = this.parameters.get("block");
		this.props = this.parameters.get("properties");

		if (this.props == null)
		{
			Alert.fatal("No ListOfValues properties passed","List Of Values");
			return(true);
		}

		if (this.props.datasource == null)
		{
			Alert.fatal("No datasource defined in ListOfValues","List Of Values");
			return(true);
		}

		if (this.props.displayfields == null)
		{
			Alert.fatal("No display fields defined in ListOfValues","List Of Values");
			return(true);
		}

		if (this.props.rows == null)
			this.props.rows = 8;

		if (this.props.filterMinLength == null)
			this.props.filterMinLength = 0;

		if (this.props.filter)
		{
			if (!Array.isArray(this.props.filter)) this.props.filter = [this.props.filter];
			this.props.filter.forEach((filter) => {this.props.datasource.addFilter(filter)})
		}

		this.props.datasource.addColumns(this.props.sourcefields);
		this.props.datasource.addColumns(this.props.displayfields);

		let page:string = ListOfValues.page;
		let css:string = this.props.cssclass;

		page = page.replace("CSS",css ? css : "lov");
		page = page.replace("ROWS",this.props.rows+"");

		await this.setView(page);
		let view:HTMLElement = this.getView();

		if (this.props.width)
		{
			view.querySelectorAll("input[name='display']").forEach((elem) =>
			{(elem as HTMLInputElement).style.width = this.props.width});
		}

		Internals.stylePopupWindow(view,this.props.title);

		this.goField("filter","criteria");
		this.results = this.getBlock("results");

		this.addListeners();

		this.results.qbeallowed = false;
		this.results.datasource = this.props.datasource;
		let cols:string|string[] = this.props.displayfields;

		if (Array.isArray(cols)) this.columns = cols;
		else 							 this.columns = [cols];

		if (this.props.filterInitialValueFrom)
		{
			let init:any = this.form.getValue(this.block,this.props.filterInitialValueFrom);
			if (init != null)	this.setValue("filter","criteria",init+"");
		}

		this.query();
		return(true);
	}

	private initcap(str:string) : string
	{
		let cap:boolean = true;
		let initcap:string = "";

		for (let i = 0; i < str.length; i++)
		{
			if (cap) initcap += str.charAt(i).toLocaleUpperCase();
			else initcap += str.charAt(i).toLocaleLowerCase();

			cap = false;

			if (str.charAt(i) == ' ')
				cap = true;
		}

		return(initcap);
	}

	private addListeners() : void
	{
		this.addEventListener(this.navigate,
		[
			{type: EventType.Key, key: KeyMap.nextfield},
			{type: EventType.Key, key: KeyMap.prevfield},
			{type: EventType.Key, key: KeyMap.nextrecord},
			{type: EventType.Key, key: KeyMap.prevrecord},
		]);

		this.addEventListener(this.done,{type: EventType.Key, key: KeyMap.enter});
		this.addEventListener(this.skip,{type: EventType.Key, key: KeyMap.escape});
		this.addEventListener(this.done,{type: EventType.Mouse, mouse: MouseMap.dblclick});

		this.addEventListener(this.onFetch,{type: EventType.OnFetch, block: "results"});
		this.addEventListener(this.onKeyStroke,{type: EventType.OnEdit, block: "filter"});
	}

	public static page:string =
	Internals.header +
	`
	<div name="popup-body">
		<div name="lov" class="CSS">
			<div name="search"><input name="criteria" from="filter"></div>
			<div name="results">
				<div name="row" foreach="row in 1..ROWS">
					<input name="display" from="results" row="$row" readonly derived>
				</div>
			</div>
		</div>
	</div>
	`
	+ Internals.footer;
}