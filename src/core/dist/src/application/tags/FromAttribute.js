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
import { Form } from "../../public/Form.js";
import { Properties } from "../Properties.js";
import { Form as InternalForm } from "../../internal/Form.js";
import { FieldInstance } from "../../view/fields/FieldInstance.js";
export class FromAttribute {
    recursive = false;
    parse(component, tag, attr) {
        if (component == null)
            throw "@Field: component is null";
        if (!(component instanceof Form) && !(component instanceof InternalForm))
            throw "@Field: Fields cannot be placed on non-forms " + component.constructor.name;
        let binding = tag.getAttribute(attr);
        if (binding == null) {
            attr = Properties.AttributePrefix + attr;
            tag.setAttribute(Properties.BindAttr, tag.getAttribute(attr));
        }
        let type = tag.getAttribute("type")?.toLowerCase();
        let forwcl = Properties.FieldTypeLibrary.get(type);
        if (forwcl != null) {
            let forw = new forwcl();
            let response = forw.parse(component, tag, attr);
            this.recursive = forw.recursive;
            return (response);
        }
        if (attr != Properties.BindAttr)
            tag.removeAttribute(attr);
        let field = new FieldInstance(component, tag);
        return (field.element);
    }
}
