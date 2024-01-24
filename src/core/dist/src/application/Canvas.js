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
import { Framework } from './Framework.js';
import { Canvas as CanvasProperties } from './properties/Canvas.js';
export class Canvas {
    moveable$;
    resizable$;
    parent;
    zindex$ = 0;
    active = null;
    content = null;
    modal = null;
    canvas = null;
    container = null;
    component = null;
    get moveable() {
        return (this.moveable$);
    }
    get resizable() {
        return (this.resizable$);
    }
    set moveable(flag) {
        this.moveable$ = flag;
        this.canvas.style.position = flag ? "absolute" : "relative";
    }
    set resizable(flag) {
        this.resizable$ = flag;
        this.canvas.style.resize = flag ? "both" : "none";
        this.canvas.style.overflow = flag ? "hidden" : "auto";
    }
    get zindex() {
        return (this.zindex$);
    }
    set zindex(zindex) {
        if (zindex < this.zindex$)
            return;
        this.zindex$ = zindex;
        this.canvas.style.zIndex = (2 * this.zindex$) + "";
        this.modal.style.zIndex = (2 * this.zindex$ + 1) + "";
    }
    close() {
        this.canvas.remove();
    }
    remove() {
        if (this.parent != null)
            return;
        this.parent = this.canvas.parentElement;
        this.canvas.remove();
    }
    restore() {
        if (this.parent == null)
            return;
        this.parent.appendChild(this.canvas);
        this.parent = null;
        this.activate();
    }
    attach(parent) {
        this.canvas.remove();
        parent.appendChild(this.canvas);
    }
    getView() {
        return (this.canvas);
    }
    getContent() {
        return (this.content);
    }
    getComponent() {
        return (this.component);
    }
    getElementById(id) {
        return (this.content.querySelector("#" + id));
    }
    getElementByName(name) {
        let elements = [];
        let list = this.content.querySelectorAll("[name='" + name + "']");
        list.forEach((element) => { elements.push(element); });
        return (elements);
    }
    replace(page) {
        this.container.firstChild.remove();
        this.container.appendChild(page);
        this.content = this.container.firstChild;
        this.content.tabIndex = -1;
        this.content.style.width = "100%";
        this.content.style.height = "100%";
    }
    setComponent(component) {
        this.component = component;
        let page = component.getView();
        let layout = CanvasProperties.page;
        let template = document.createElement("template");
        template.innerHTML = layout;
        this.modal = template.content.querySelector("[name=modal]");
        this.canvas = template.content.querySelector("[name=canvas]");
        this.container = template.content.querySelector("[name=content]");
        this.modal.classList.value = CanvasProperties.ModalClasses;
        this.canvas.classList.value = CanvasProperties.CanvasClasses;
        this.container.classList.value = CanvasProperties.ContentClasses;
        this.modal.style.cssText = CanvasProperties.ModalStyle;
        this.canvas.style.cssText = CanvasProperties.CanvasStyle;
        this.container.style.cssText = CanvasProperties.ContentStyle;
        if (page == null)
            page = "";
        if (typeof page === 'string') {
            let root = document.createElement("div");
            root.innerHTML = page;
            page = Framework.prepare(root);
        }
        if (page.parentElement)
            page.replaceWith(this.canvas);
        this.container.appendChild(page);
        this.content = this.container.firstChild;
        this.canvas.addEventListener("mousedown", (event) => { this.dragstart(event); });
        this.content.tabIndex = -1;
        this.zindex = Canvas.newLayer;
        if (this.content.style) {
            this.content.style.width = "100%";
            this.content.style.height = "100%";
        }
        this.moveable = component.moveable;
        this.resizable = component.resizable;
    }
    block() {
        this.canvas.style.resize = "none";
        this.active = document.activeElement;
        this.modal.style.width = this.canvas.offsetWidth + "px";
        this.modal.style.height = this.canvas.offsetHeight + "px";
        if (this.active instanceof HTMLElement)
            this.active.blur();
    }
    unblock() {
        this.modal.style.width = "0";
        this.modal.style.height = "0";
        if (this.resizable)
            this.canvas.style.resize = "both";
        if (this.active instanceof HTMLElement)
            this.active.focus();
    }
    getViewPort() {
        return ({
            y: this.canvas.offsetTop,
            x: this.canvas.offsetLeft,
            width: this.canvas.offsetWidth,
            height: this.canvas.offsetHeight
        });
    }
    getParentViewPort() {
        return ({
            y: this.canvas.parentElement.offsetTop,
            x: this.canvas.parentElement.offsetLeft,
            width: this.canvas.parentElement.offsetWidth,
            height: this.canvas.parentElement.offsetHeight
        });
    }
    setViewPort(frame) {
        let x = frame.x;
        let y = frame.y;
        let width = frame.width;
        let height = frame.height;
        if (typeof x === "number")
            x = x + "px";
        if (typeof y === "number")
            y = y + "px";
        if (typeof width === "number")
            width = width + "px";
        if (typeof height === "number")
            height = height + "px";
        this.canvas.style.top = y;
        this.canvas.style.left = x;
        this.canvas.style.width = width;
        this.canvas.style.height = height;
    }
    /*
     * Drag code
     */
    moving = false;
    mouse = { x: 0, y: 0 };
    boundary = { x: 0, y: 0, w: 0, h: 0 };
    dragstart(event) {
        if (!this.moveable)
            return;
        if (!event.target.classList.contains(CanvasProperties.CanvasHandleClass))
            return;
        let corner = {
            x: +this.canvas.offsetLeft + +this.canvas.offsetWidth,
            y: +this.canvas.offsetTop + +this.canvas.offsetHeight
        };
        let parent = this.canvas.parentElement;
        this.boundary = { x: parent.offsetLeft, y: parent.offsetTop, w: parent.offsetWidth, h: parent.offsetHeight };
        let type = window.getComputedStyle(this.canvas.parentElement).position;
        if (type == "static")
            type = "";
        if (type == "fixed")
            type = "absolute";
        if (type == "sticky")
            type = "relative";
        if (type == "") {
            corner.y -= this.canvas.offsetTop;
            corner.x -= this.canvas.offsetLeft;
            this.boundary.w += this.boundary.x;
            this.boundary.h += this.boundary.y;
        }
        if (type == "relative") {
            this.boundary.x = 0;
            this.boundary.y = 0;
        }
        if (type == "absolute") {
            this.boundary.x = 0;
            this.boundary.y = 0;
            this.boundary.w = parent.parentElement.clientWidth;
            this.boundary.h = parent.parentElement.clientHeight;
        }
        this.moving = true;
        document.addEventListener('mouseup', this);
        document.addEventListener('mousemove', this);
        this.mouse = { x: event.clientX, y: event.clientY };
    }
    drag(event) {
        if (this.moving) {
            event.preventDefault();
            let offX = event.clientX - this.mouse.x;
            let offY = event.clientY - this.mouse.y;
            let elemY = this.canvas.offsetTop;
            let elemX = this.canvas.offsetLeft;
            let elemW = this.canvas.offsetWidth;
            let elemH = this.canvas.offsetHeight;
            let posX = elemX + offX;
            let posY = elemY + offY;
            let minX = this.boundary.x;
            let minY = this.boundary.y;
            let maxX = this.boundary.w - elemW;
            let maxY = this.boundary.h - elemH;
            if (posX < minX)
                posX = minX;
            if (posY < minY)
                posY = minY;
            if (posX > maxX)
                posX = maxX;
            if (posY > maxY)
                posY = maxY;
            this.canvas.style.top = posY + "px";
            this.canvas.style.left = posX + "px";
            this.mouse = { x: event.clientX, y: event.clientY };
        }
    }
    dragend() {
        this.moving = false;
        document.removeEventListener('mouseup', this);
        document.removeEventListener('mousemove', this);
    }
    handleEvent(event) {
        if (event.type == "mouseup")
            this.dragend();
        if (event.type == "mousemove")
            this.drag(event);
    }
    static layers$ = 0;
    activate() {
        this.zindex = Canvas.newLayer;
        this.content.blur();
    }
    static get newLayer() {
        return (++Canvas.layers$);
    }
}
