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

import { BaseForm as Form } from './BaseForm';

export class Minimized implements EventListenerObject
{
    private list:HTMLElement = null;
    // private icon:HTMLImageElement = null;
    private span:HTMLSpanElement = null;
    private forms:Map<string,Form> = new Map<string,Form>();

    constructor()
    {
        this.list = document.getElementById("form-list");
        this.span = this.list.querySelector("#entry");
        this.span.remove();
    }

    public add(form:Form) : void
    {
        let span:HTMLElement = this.span.cloneNode(true) as HTMLElement;

        let icon:HTMLElement = span.children.item(0) as HTMLElement;
        let label:HTMLLabelElement = span.children?.item(1) as HTMLLabelElement;

        span.id = form.id;
        icon.id = form.id;

        label.textContent = form.title;
        icon.textContent = form.title.substring(0,3);

        icon.style.cssText = PageFooterStyle.IconStyle;
        span.style.cssText = PageFooterStyle.TooltipsStyle
        this.list.style.cssText = PageFooterStyle.ListStyle;
        label.style.cssText = PageFooterStyle.TooltipstextStyle;

        span.addEventListener("click",this);
        span.addEventListener("mouseover",this);


        this.list.appendChild(span);
        this.forms.set(form.id,form);
    }

    public handleEvent(event:MouseEvent): void
    {
        let entry:HTMLElement = event.target as HTMLElement;
        let label:HTMLLabelElement = entry.children?.item(1) as HTMLLabelElement;

        if (label == null)
        {
            label = entry.parentElement?.children?.item(1) as HTMLLabelElement;
            if (label == null) return;
        }


        if (event.type == "click")
        {
            let form:Form = this.forms.get(entry.id);

            form.show();
            entry.remove();

            this.forms.delete(entry.id);
        }

        if (event.type == "mouseover")
        {
            let labelrect:DOMRectReadOnly = label.getBoundingClientRect();
            let listrect:DOMRectReadOnly = this.list.getBoundingClientRect();

            if (labelrect.x < listrect.x)
                label.style.left = (listrect.x + labelrect.width/2)+"px";

        }
    }
}


export class PageFooterStyle
{
    public static IconStyle:string =
	`
        height:32px;
        display: flex;
        cursor: default;
        margin-top: 3px;
        font-weight: bold;
        margin-left: 1.5px;
        margin-right: 1.5px;
        align-items:  center;
        border: solid 1px black;
        justify-content: center;
    `;

    public static TooltipstextStyle:string =
    `
        left:45%;
        z-index: 1;
        bottom:100%;
        color: #fff;
        display:flex;
        padding: 5px;
        font-size: 15px;
        text-align: center;
        position: absolute;
        border-radius: 4px;
        transform: translateX(-50%);
    `

    public static TooltipsStyle =
    `
        position: relative;
    `

    public static ListStyle =
    `
        display:flex;
    `;
}