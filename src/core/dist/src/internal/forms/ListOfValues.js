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
import { MSGGRP } from "../../messages/Internal.js";
import { Messages } from "../../messages/Messages.js";
import { KeyMap } from "../../control/events/KeyMap.js";
import { MouseMap } from "../../control/events/MouseMap.js";
import { EventType } from "../../control/events/EventType.js";
import { Internals } from "../../application/properties/Internals.js";
export class ListOfValues extends Form {
    form = null;
    last = null;
    block = null;
    results = null;
    columns = null;
    cancelled = true;
    lov = null;
    static DELAY = 300;
    constructor() {
        super("");
        this.moveable = true;
        this.resizable = true;
        this.addEventListener(this.initialize, { type: EventType.PostViewInit });
    }
    accepted() {
        return (!this.cancelled);
    }
    async skip() {
        return (this.close());
    }
    async done(event) {
        if (event.field == null)
            return (true);
        this.cancelled = false;
        let source = this.lov.sourcefields;
        let target = this.lov.targetfields;
        if (this.form && this.block && source && target) {
            if (!Array.isArray(source))
                source = [source];
            if (!Array.isArray(target))
                target = [target];
            for (let i = 0; i < source.length && i < target.length; i++) {
                let value = this.results.getValue(source[i]);
                await this.form.getBlock(this.block)?.setAndValidate(target[i], value);
            }
        }
        return (await this.close());
    }
    async onKeyStroke() {
        setTimeout(() => { this.query(); }, ListOfValues.DELAY);
        return (true);
    }
    query() {
        let flt = this.getValue("filter", "criteria");
        if (flt == null)
            flt = "";
        if (this.lov.filterPreProcesser != null)
            flt = this.lov.filterPreProcesser(flt);
        if (flt.length < this.lov.filterMinLength)
            return;
        if (flt != this.last) {
            this.last = flt;
            switch (this.lov.filterCase) {
                case Case.upper:
                    flt = flt?.toLocaleUpperCase();
                    break;
                case Case.lower:
                    flt = flt?.toLocaleLowerCase();
                    break;
                case Case.initcap:
                    flt = this.initcap(flt);
                    break;
            }
            if (this.lov.filterPrefix)
                flt = this.lov.filterPrefix + flt;
            if (this.lov.filterPostfix)
                flt += this.lov.filterPostfix;
            if (this.lov.filter) {
                if (!Array.isArray(this.lov.filter))
                    this.lov.filter = [this.lov.filter];
                this.lov.filter.forEach((filter) => { filter.constraint = flt; });
            }
            if (this.lov.bindvalue) {
                if (!Array.isArray(this.lov.bindvalue))
                    this.lov.bindvalue = [this.lov.bindvalue];
                this.lov.bindvalue.forEach((bindvalue) => { bindvalue.value = flt; });
            }
            this.results.executeQuery();
        }
    }
    async navigate(event) {
        if (event.key == KeyMap.nextfield || event.key == KeyMap.prevfield) {
            if (event.block == "results")
                this.goBlock("filter");
            else
                this.goBlock("results");
            return (false);
        }
        if (event.key == KeyMap.nextrecord && event.block == "filter") {
            this.goBlock("results");
            return (false);
        }
        if (event.key == KeyMap.prevrecord && event.block == "results") {
            if (this.getBlock("results").getRecord()?.recno == 0) {
                this.goBlock("filter");
                return (false);
            }
        }
        return (true);
    }
    async onFetch() {
        let display = "";
        for (let i = 0; i < this.columns.length; i++) {
            let value = this.results.getValue(this.columns[i]);
            if (value != null) {
                if (i > 0)
                    display += " ";
                display += value;
            }
        }
        this.results.setValue("display", display);
        return (true);
    }
    async initialize() {
        this.canvas.zindex = Classes.zindex;
        this.lov = this.parameters.get("lov");
        this.form = this.parameters.get("form");
        this.block = this.parameters.get("block");
        if (this.lov == null) {
            Messages.severe(MSGGRP.FORM, 4); // ListOfValues does not exist
            return (true);
        }
        if (this.lov.datasource == null) {
            Messages.severe(MSGGRP.FORM, 5); // ListOfValues does not exist
            return (true);
        }
        if (this.lov.displayfields == null) {
            Messages.severe(MSGGRP.FORM, 6); // No display fields defined
            return (true);
        }
        if (this.lov.rows == null)
            this.lov.rows = 8;
        if (this.lov.filterMinLength == null)
            this.lov.filterMinLength = 0;
        this.lov.datasource.addColumns(this.lov.sourcefields);
        this.lov.datasource.addColumns(this.lov.displayfields);
        let page = ListOfValues.page;
        let css = this.lov.cssclass;
        page = page.replace("ROWS", this.lov.rows + "");
        page = page.replace("CSS", css ? "class='" + css + "'" : "");
        await this.setView(page);
        let view = this.getView();
        if (this.lov.width) {
            view.querySelectorAll("input[name='display']").forEach((elem) => { elem.style.width = this.lov.width; });
        }
        Internals.stylePopupWindow(view, this.lov.title);
        await this.goField("filter", "criteria");
        this.results = this.getBlock("results");
        this.addListeners();
        this.results.qbeallowed = false;
        this.results.datasource = this.lov.datasource;
        let cols = this.lov.displayfields;
        if (Array.isArray(cols))
            this.columns = cols;
        else
            this.columns = [cols];
        if (this.lov.filterInitialValueFrom) {
            let init = this.form.getValue(this.block, this.lov.filterInitialValueFrom);
            if (init != null)
                this.setValue("filter", "criteria", init + "");
        }
        this.focus();
        this.query();
        return (false);
    }
    initcap(str) {
        let cap = true;
        let initcap = "";
        for (let i = 0; i < str.length; i++) {
            if (cap)
                initcap += str.charAt(i).toLocaleUpperCase();
            else
                initcap += str.charAt(i).toLocaleLowerCase();
            cap = false;
            if (str.charAt(i) == ' ')
                cap = true;
        }
        return (initcap);
    }
    addListeners() {
        this.addEventListener(this.navigate, [
            { type: EventType.Key, key: KeyMap.nextfield },
            { type: EventType.Key, key: KeyMap.prevfield },
            { type: EventType.Key, key: KeyMap.nextrecord },
            { type: EventType.Key, key: KeyMap.prevrecord },
        ]);
        this.addEventListener(this.done, { type: EventType.Key, key: KeyMap.enter });
        this.addEventListener(this.skip, { type: EventType.Key, key: KeyMap.escape });
        this.addEventListener(this.done, { type: EventType.Mouse, mouse: MouseMap.dblclick });
        this.addEventListener(this.onFetch, { type: EventType.OnFetch, block: "results" });
        this.addEventListener(this.onKeyStroke, { type: EventType.OnEdit, block: "filter" });
    }
    static page = Internals.header +
        `
	<div name="popup-body">
		<div name="list-of-values" CSS>
			<div name="search"><input name="criteria" from="filter" autocomplete="off"></div>
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
