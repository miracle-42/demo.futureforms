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


import { Context } from "./Context";
import { FormEvent, MenuComponent } from "forms42core";


export class Menu extends MenuComponent
{
   private rightmenu = null;
	private body:HTMLElement = null;
	private menuelem:HTMLElement = null;

   constructor(mouseevent:MouseEvent,event:FormEvent)
   {
      super(new Context());

      this.options.skiproot = true;
      this.rightmenu = "rightmenu";
      this.body = document.querySelector("body");

      this.menuelem = this.body.querySelector("." + this.rightmenu) ?
      this.body.querySelector("." + this.rightmenu): document.createElement("div");

      if (!this.menuelem.classList.contains(this.rightmenu))
      {
         this.menuelem.classList.value = this.rightmenu;
         this.menuelem = this.body.appendChild(this.menuelem);
      }

      this.target = this.menuelem;
      this.placeManagement(mouseevent);

      super.show();
   }

   public async hide(): Promise<void>
	{
      document.addEventListener("click", () => this.menuelem.style.display ="none");
   }

   private placeManagement(event:MouseEvent): void
   {
      let x:number = event.offsetX;
      let y:number = event.offsetY;
      let winWidth:number = window.innerWidth;
      let winHeight:number= window.innerHeight;
      let cmWidth:number = this.menuelem.offsetWidth;
      let cmHeight:number = this.menuelem.offsetHeight;

      x = x > winWidth - cmWidth ? winWidth - cmWidth : x;
      y = y > winHeight - cmHeight ? winHeight - cmHeight : y;

      this.menuelem.style.top = y + "px";
      this.menuelem.style.left = x + "px";
      this.menuelem.style.display = "block";
   }
}