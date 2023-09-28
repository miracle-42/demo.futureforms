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

import { DataType } from "../DataType.js";
import { DataMapper, Tier } from "../DataMapper.js";
import { FieldProperties } from "../FieldProperties.js";
import { FieldFeatureFactory } from "../../FieldFeatureFactory.js";
import { BrowserEvent } from "../../../control/events/BrowserEvent.js";
import { FieldEventHandler } from "../interfaces/FieldEventHandler.js";
import { FieldImplementation, FieldState } from "../interfaces/FieldImplementation.js";

export class Textarea implements FieldImplementation, EventListenerObject
{
	private trim$:boolean = true;
	private state:FieldState = null;
	private datamapper:DataMapper = null;
	private properties:FieldProperties = null;
	private eventhandler:FieldEventHandler = null;

	private element:HTMLTextAreaElement = null;
   private event:BrowserEvent = BrowserEvent.get();

	public get trim() : boolean
	{
		return(this.trim$);
	}

	public set trim(flag:boolean)
	{
		this.trim$ = flag;
	}

	public setValidated() : void
	{
	}

	public get datatype() : DataType
	{
		return(DataType.string);
	}

	public set datatype(_type:DataType)
	{
		null;
	}

	public create(eventhandler:FieldEventHandler, _tag:string) : HTMLElement
	{
		this.element = document.createElement("textarea");
		this.eventhandler = eventhandler;
		return(this.element);
	}

	public apply(properties:FieldProperties, init:boolean) : void
	{
		this.properties = properties;
		this.datamapper = properties.mapper;
		if (init) this.addEvents(this.element);
		this.setAttributes(properties.getAttributes());
	}

	public setAttributes(attributes:Map<string,any>) : void
	{
		let value:string = attributes.get("trim");
		if (value) this.trim = value.trim().toLowerCase() == "true";
	}

	public clear() : void
	{
		this.element.value = "";
	}

	public getValue() : any
	{
		let value = this.element.value;

		if (this.trim)
			value = value?.trim();

		if (this.datamapper != null)
		{
			value = this.datamapper.getValue(Tier.Backend);
			if (value == null) this.element.value = "";
			return(value);
		}

		return(value);
	}

	public setValue(value:any) : boolean
	{
		if (this.trim && typeof value === "string")
			value = value?.trim();

		if (this.datamapper != null)
		{
			this.datamapper.setValue(Tier.Backend,value);
			value = this.datamapper.getValue(Tier.Frontend);
		}

		this.element.value = value;
		return(true);
	}

	public getIntermediateValue() : string
	{
		return(this.getValue());
	}

	public setIntermediateValue(value:string) : void
	{
		this.setValue(value);
	}

	public getElement() : HTMLElement
	{
		return(this.element);
	}

	public getFieldState() : FieldState
	{
		return(this.state);
	}

	public setFieldState(state:FieldState) : void
	{
		this.state = state;
		let enabled:boolean = this.properties.enabled;
		let readonly:boolean = this.properties.readonly;

		switch(state)
		{
			case FieldState.OPEN:
				if (enabled) FieldFeatureFactory.setEnabledState(this.element,this.properties,true);
				if (!readonly) FieldFeatureFactory.setReadOnlyState(this.element,this.properties,false);
				break;

			case FieldState.READONLY:
				if (enabled) FieldFeatureFactory.setEnabledState(this.element,this.properties,true);
				FieldFeatureFactory.setReadOnlyState(this.element,this.properties,true);
				break;

			case FieldState.DISABLED:
				FieldFeatureFactory.setEnabledState(this.element,this.properties,false);
				break;
			}
	}

	public async handleEvent(event:Event) : Promise<void>
	{
		let bubble:boolean = false;
		this.event.setEvent(event);

		if (this.event.type == "skip")
			return;

		if (this.event.type == "wait")
			await this.event.wait();

		if (this.event.waiting)
			return;

		if (this.event.type == "focus")
			bubble = true;

		if (this.event.type == "blur")
			bubble = true;

		if (this.event.type == "change")
			bubble = true;

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
			await this.eventhandler.handleEvent(this.event);
	}

    private addEvents(element:HTMLElement) : void
    {
        element.addEventListener("blur",this);
        element.addEventListener("focus",this);
        element.addEventListener("change",this);

        element.addEventListener("keyup",this);
        element.addEventListener("keydown",this);
        element.addEventListener("keypress",this);

        element.addEventListener("wheel",this);
        element.addEventListener("mouseup",this);
        element.addEventListener("mouseout",this);
        element.addEventListener("mousedown",this);
        element.addEventListener("mouseover",this);
        element.addEventListener("mousemove",this);

        element.addEventListener("drop",this);

		  element.addEventListener("drag",this);
		  element.addEventListener("dragend",this);
		  element.addEventListener("dragover",this);
		  element.addEventListener("dragstart",this);
		  element.addEventListener("dragenter",this);
		  element.addEventListener("dragleave",this);

        element.addEventListener("click",this);
        element.addEventListener("dblclick",this);
        element.addEventListener("contextmenu",this);
    }
}