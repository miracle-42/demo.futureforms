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
import { Messages } from '../messages/Messages.js';
import { Canvas as CanvasImpl } from './Canvas.js';
import { ComponentFactory as FactoryImpl } from './ComponentFactory.js';
import { FormTag } from './tags/FormTag.js';
import { Include } from './tags/Include.js';
import { Foreach } from './tags/Foreach.js';
import { RowIndicator } from './tags/RowIndicator.js';
import { FromAttribute } from './tags/FromAttribute.js';
import { ImplAttribute } from './tags/ImplAttribute.js';
import { FilterIndicator } from './tags/FilterIndicator.js';
export var ScrollDirection;
(function (ScrollDirection) {
    ScrollDirection[ScrollDirection["Up"] = 0] = "Up";
    ScrollDirection[ScrollDirection["Down"] = 1] = "Down";
})(ScrollDirection || (ScrollDirection = {}));
/**
 * These are global properties used in different parts of the code.
 * If, for some reason, the tags, style classes etc conflicts with other usage,
 * anything can be changed.
 */
export class Properties {
    static baseurl = "/";
    static ParseTags = true;
    static ParseEvents = true;
    static IncludeTag = "include";
    static FormTag = "FutureForms";
    static BindAttr = "from";
    static RecordModeAttr = "mode";
    static ImplAttr = "implementation";
    static ForeachAttr = "foreach";
    static DateDelimitors = "./-: ";
    static TimeFormat = "HH:mm:ss";
    static DateFormat = "DD-MM-YYYY";
    static AttributePrefix = "$";
    static RequireAttributePrefix = false;
    static IndicatorType = "row-indicator";
    static FilterIndicatorType = "filter-indicator";
    static Classes = {
        Invalid: "invalid",
        RowIndicator: "active",
        FilterIndicator: "active"
    };
    /** Interceptor for message handling */
    static get MessageHandler() {
        return (Messages.MessageHandler);
    }
    /** Interceptor for message handling */
    static set MessageHandler(handler) {
        Messages.MessageHandler = handler;
    }
    static CanvasImplementationClass = CanvasImpl;
    static FactoryImplementation = new FactoryImpl();
    static MouseScrollDirection = ScrollDirection.Up;
    static TagLibrary = new Map([
        [Properties.FormTag, FormTag],
        [Properties.IncludeTag, Include]
    ]);
    static FieldTypeLibrary = new Map([
        [Properties.IndicatorType, RowIndicator],
        [Properties.FilterIndicatorType, FilterIndicator]
    ]);
    static AttributeLibrary = new Map([
        [Properties.ForeachAttr, Foreach],
        [Properties.BindAttr, FromAttribute],
        [Properties.ImplAttr, ImplAttribute]
    ]);
}
