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
import { FormBacking } from "../FormBacking.js";
export class ImplAttribute {
    recursive = false;
    static id = 0;
    static MAX = 10;
    parse(_component, tag, attr) {
        let parent = tag.parentElement;
        let id = ImplAttribute.id++;
        let impl = tag.getAttribute(attr);
        let phldr = document.createElement(tag.tagName);
        phldr.setAttribute(attr, "" + id);
        setTimeout(() => { this.showform(parent, tag, impl, attr, id); }, 10);
        return (phldr);
    }
    async showform(parent, tag, impl, attr, id, attempts) {
        if (attempts == null)
            attempts = 0;
        if (parent == null)
            parent = document.body;
        let phldr = parent.querySelector("[" + attr + "='" + id + "']");
        if (phldr == null) {
            if (attempts >= ImplAttribute.MAX) {
                console.error("Unable to find placeholder for " + impl);
                return;
            }
            attempts++;
            setTimeout(() => { this.showform(parent, tag, impl, attr, id, attempts); }, 10 * attempts);
        }
        let instance = await FormBacking.createForm(impl, tag);
        phldr.replaceWith(instance.canvas.getView());
    }
}
