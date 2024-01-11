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

import { Class } from '../public/Class.js';

import { Messages } from '../messages/Messages.js';
import { MessageHandler } from '../messages/MessageHandler.js';

import { Canvas as CanvasImpl } from './Canvas.js';
import { Canvas as CanvasType } from './interfaces/Canvas.js';

import { ComponentFactory } from './interfaces/ComponentFactory.js';
import { ComponentFactory as FactoryImpl } from './ComponentFactory.js';

import { Tag } from './tags/Tag.js';
import { FormTag } from './tags/FormTag.js';
import { Include } from './tags/Include.js';
import { Foreach } from './tags/Foreach.js';
import { RowIndicator } from './tags/RowIndicator.js';
import { FromAttribute } from './tags/FromAttribute.js';
import { ImplAttribute } from './tags/ImplAttribute.js';
import { FilterIndicator } from './tags/FilterIndicator.js';

export enum ScrollDirection
{
	Up,
	Down
}

export interface ClassNames
{
	Invalid:string;
	RowIndicator:string;
	FilterIndicator:string;
}

/**
 * These are global properties used in different parts of the code.
 * If, for some reason, the tags, style classes etc conflicts with other usage,
 * anything can be changed.
 */
export class Properties
{
	public static baseurl:string = "/";

	public static ParseTags:boolean = true;
	public static ParseEvents:boolean = true;

	public static IncludeTag:string = "include";
	public static FormTag:string = "FutureForms";

	public static BindAttr:string = "from";
	public static RecordModeAttr:string = "mode";

	public static ImplAttr:string = "implementation";

	public static ForeachAttr:string = "foreach";

	public static DateDelimitors:string = "./-: ";
	public static TimeFormat:string = "HH:mm:ss";
	public static DateFormat:string = "DD-MM-YYYY";

	public static AttributePrefix:string = "$";
	public static RequireAttributePrefix:boolean = false;

	public static IndicatorType:string = "row-indicator";
	public static FilterIndicatorType:string = "filter-indicator";

	public static Classes:ClassNames =
	{
		Invalid: "invalid",
		RowIndicator:"active",
		FilterIndicator:"active"
	};

	/** Interceptor for message handling */
	public static get MessageHandler() : MessageHandler
	{
		return(Messages.MessageHandler);
	}

	/** Interceptor for message handling */
	public static set MessageHandler(handler:MessageHandler)
	{
		Messages.MessageHandler = handler;
	}

	public static CanvasImplementationClass:Class<CanvasType> = CanvasImpl;
	public static FactoryImplementation:ComponentFactory = new FactoryImpl();

	public static MouseScrollDirection:ScrollDirection = ScrollDirection.Up;

	public static TagLibrary : Map<string,Class<Tag>> =

	new Map<string,Class<Tag>>
	(
			[
				[Properties.FormTag,FormTag],
				[Properties.IncludeTag,Include]
			]
	);


	public static FieldTypeLibrary : Map<string,Class<Tag>> =
	new Map<string,Class<Tag>>
	(
			[
				[Properties.IndicatorType,RowIndicator],
				[Properties.FilterIndicatorType,FilterIndicator]
			]
	);


	public static AttributeLibrary : Map<string,Class<Tag>> =
	new Map<string,Class<Tag>>
	(
			[
				[Properties.ForeachAttr,Foreach],
				[Properties.BindAttr,FromAttribute],
				[Properties.ImplAttr,ImplAttribute]
			]
	);
}