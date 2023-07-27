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

import { CanvasComponent } from '../CanvasComponent.js';

export interface View
{
	x       : string|number;
	y       : string|number;
	width   : string|number;
	height  : string|number;
}

/**
 * Forms must be placed on a canvas that provides basic
 * functionality across all types of forms. It is possible
 * to replace the default implementation of the Canvas, implementing
 * this interface and injecting the custom Canvas class.
 */
export interface Canvas
{
	zindex:number;
	moveable:boolean;
	resizable:boolean;

	close() : void;

	block() : void;
	unblock() : void;

	remove() : void;
	restore() : void;
	activate() : void;

	replace(page:HTMLElement) : void;
	attach(parent:HTMLElement) : void;

	getView() : HTMLElement;
	getContent() : HTMLElement;

	getViewPort() : View;
	getParentViewPort() : View;
	setViewPort(view:View) : void;

	getComponent() : CanvasComponent;
	setComponent(component:CanvasComponent) : void;

	getElementById(id:string) : HTMLElement;
	getElementByName(name:string) : HTMLElement[];
}