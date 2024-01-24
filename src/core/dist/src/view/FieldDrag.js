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
export class FieldDrag {
    form;
    header;
    cursor = null;
    column = null;
    current = false;
    target = null;
    instance = null;
    constructor(form, header) {
        this.form = form;
        this.header = header;
        this.cursor = header.style.cursor;
        this.instance = this.findInstance(header);
        if (this.instance?.row < 0)
            this.current = true;
        if (this.instance != null) {
            this.header.style.cursor = "auto";
            document.addEventListener("drag", this);
            document.addEventListener("dragend", this);
            document.addEventListener("dragover", this);
            document.addEventListener("dragleave", this);
            document.addEventListener("dragcancel", this);
            this.column = new Column(this.instance);
            this.column.createClone();
        }
    }
    start() {
    }
    handleEvent(event) {
        if (event.type == "dragend" || event.type == "dragcancel") {
            this.column.dropClone();
            this.header.style.cursor = this.cursor;
            document.removeEventListener("drag", this);
            document.removeEventListener("dragend", this);
            document.removeEventListener("dragover", this);
            document.removeEventListener("dragleave", this);
            document.removeEventListener("dragcancel", this);
            if (event.type == "dragend")
                this.move();
        }
        if (event.type == "drag") {
            this.column.setMouseEvent(event);
        }
        if (event.type == "dragleave") {
            this.header.style.cursor = "move";
        }
        if (event.type == "dragover") {
            this.target = null;
            if (event.target instanceof HTMLElement) {
                if (this.check(event.target)) {
                    event.preventDefault();
                    this.target = event.target;
                    this.header.style.cursor = "pointer";
                }
            }
        }
    }
    move() {
        let target = this.findInstance(this.target);
        if (target && target != this.instance) {
            let block = target.field.block;
            let instances1 = this.getinstances(this.header);
            let instances2 = this.getinstances(this.target);
            if (instances1.length == instances2.length) {
                let h1 = document.createElement("p");
                let h2 = document.createElement("p");
                this.target.replaceWith(h1);
                this.header.replaceWith(h2);
                h1.replaceWith(this.header);
                h2.replaceWith(this.target);
                for (let i = 0; i < instances1.length; i++)
                    block.swapInstances(instances1[i], instances2[i]);
            }
        }
    }
    check(header) {
        let current = false;
        let id = header.getAttribute("for");
        if (id == null)
            return (false);
        id = id.replaceAll(".", "\\.");
        let elem = document.querySelector("#" + id);
        if (elem == null)
            return (false);
        let block = this.instance.field.block;
        let instances = block.getFieldInstances(true);
        for (let i = 0; i < instances.length; i++) {
            if (instances[i].element == elem) {
                if (instances[i].row < 0)
                    current = true;
                if (current && this.current)
                    return (true);
                if (!current && !this.current)
                    return (true);
            }
        }
        return (false);
    }
    findInstance(header) {
        if (header == null)
            return (null);
        let id = header.getAttribute("for");
        id = this.getID(id);
        if (id == null)
            return (null);
        let elem = [];
        document.querySelectorAll("#" + id).forEach((e) => {
            if (e instanceof HTMLElement)
                elem.push(e);
        });
        if (elem.length == 0)
            return (null);
        let blocks = this.form.getBlocks();
        for (let b = 0; b < blocks.length; b++) {
            let instances = blocks[b].getFieldInstances(true);
            for (let i = 0; i < instances.length; i++) {
                for (let e = 0; e < elem.length; e++) {
                    if (instances[i].element == elem[e])
                        return (instances[i]);
                }
            }
        }
        return (null);
    }
    getID(id) {
        let illegal = id.replace(/[a-zA-Z0-9-]/g, "");
        if (illegal.length > 0) {
            console.log("id: '" + id + "' contains illegal characters '" + illegal + "'");
            return (null);
        }
        return (id);
    }
    getinstances(header) {
        let instances = [];
        let inst = this.findInstance(header);
        let name = inst.name;
        let block = inst.field.block;
        if (inst.row < 0) {
            instances.push(inst);
        }
        else {
            block.getFieldInstances(true).forEach((inst) => {
                if (inst.name == name && inst.row >= 0) {
                    instances.push(inst);
                }
            });
        }
        return (instances);
    }
}
class Column {
    inst;
    mouse = null;
    area = null;
    positions = null;
    clone = null;
    elements = null;
    constructor(inst) {
        this.inst = inst;
    }
    setMouseEvent(event) {
        if (this.mouse == null) {
            this.mouse = { x: event.clientX, y: event.clientY };
        }
        else {
            // When flying back X and Y is 0
            if (event.clientX > 0 || event.clientY > 0) {
                this.area.x += event.clientX - this.mouse.x;
                this.area.y += event.clientY - this.mouse.y;
                this.clone.style.top = this.area.y + "px";
                this.clone.style.left = this.area.x + "px";
                this.mouse = { x: event.clientX, y: event.clientY };
            }
        }
    }
    dropClone() {
        this.clone.remove();
    }
    createClone() {
        this.findElements();
        this.getPositions();
        this.clone = document.createElement("div");
        this.clone.style.zIndex = "2147483647";
        this.clone.style.width = this.area.w + "px";
        this.clone.style.height = this.area.h + "px";
        document.body.appendChild(this.clone);
        this.clone.style.position = "absolute";
        this.clone.style.top = this.area.y + "px";
        this.clone.style.left = this.area.x + "px";
        this.clone.setAttribute("name", "drag-fields");
        this.addClones();
    }
    addClones() {
        let drag = this.getElementArea(this.clone);
        for (let i = 0; i < this.positions.length; i++) {
            let elem = this.elements[i];
            let rect = this.positions[i];
            let posX = rect.x - drag.x;
            let posY = rect.y - drag.y;
            let clone = elem.cloneNode(true);
            this.clone.appendChild(clone);
            clone.style.top = posY + "px";
            clone.style.left = posX + "px";
            clone.style.position = "absolute";
        }
    }
    findElements() {
        if (this.elements != null)
            return;
        this.elements = [];
        let rows = 0;
        let block = this.inst.field.block;
        if (this.inst.row >= 0)
            rows = this.inst.field.block.rows;
        if (rows == 0) {
            this.elements.push(this.inst.element);
        }
        else {
            block.getFieldInstances(true).forEach((inst) => {
                if (inst.name == this.inst.name && inst.row >= 0) {
                    this.elements.push(inst.element);
                }
            });
        }
    }
    getPositions() {
        if (this.positions != null)
            return;
        this.positions = [];
        this.findElements();
        let box = { x1: Number.MAX_VALUE, y1: Number.MAX_VALUE, x2: 0, y2: 0 };
        this.elements.forEach((elem) => {
            let rect = this.getElementArea(elem);
            this.positions.push({ x: rect.x, y: rect.y });
            if (rect.x < box.x1)
                box.x1 = rect.x;
            if (rect.y < box.y1)
                box.y1 = rect.y;
            if (rect.x + rect.w > box.x2)
                box.x2 = rect.x + rect.w;
            if (rect.y + rect.h > box.y2)
                box.y2 = rect.y + rect.h;
        });
        this.area = { x: box.x1, y: box.y1, w: box.x2 - box.x1, h: box.y2 - box.y1 };
    }
    getElementArea(element) {
        let body = document.body;
        let delem = document.documentElement;
        let box = element.getBoundingClientRect();
        let scrollTop = window.pageYOffset || delem.scrollTop || body.scrollTop;
        let scrollLeft = window.pageXOffset || delem.scrollLeft || body.scrollLeft;
        let clientTop = delem.clientTop || body.clientTop || 0;
        let clientLeft = delem.clientLeft || body.clientLeft || 0;
        let y = box.top + scrollTop - clientTop;
        let x = box.left + scrollLeft - clientLeft;
        let mt = parseFloat(window.getComputedStyle(element).marginTop);
        let mb = parseFloat(window.getComputedStyle(element).marginBottom);
        let ml = parseFloat(window.getComputedStyle(element).marginLeft);
        let mr = parseFloat(window.getComputedStyle(element).marginRight);
        let w = element.offsetWidth + ml + mr;
        let h = element.offsetHeight + mt + mb;
        return ({ x: x, y: y, w: w, h: h });
    }
}
class Position {
    x;
    y;
}
class Rectangle {
    x;
    y;
    w;
    h;
}
