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
import { Radio } from "./implementations/Radio.js";
import { Input } from "./implementations/Input.js";
import { Select } from "./implementations/Select.js";
import { Display } from "./implementations/Display.js";
import { CheckBox } from "./implementations/CheckBox.js";
import { Textarea } from "./implementations/Textarea.js";
export class FieldTypes {
    static implementations = FieldTypes.init();
    static init() {
        let map = new Map();
        map.set("input", Input);
        map.set("select", Select);
        map.set("textarea", Textarea);
        return (map);
    }
    static get(tag, type) {
        let impl = FieldTypes.implementations.get(tag?.toLowerCase());
        if (impl == null)
            return (Display);
        if (impl == Input && type?.toLowerCase() == "radio")
            return (Radio);
        if (impl == Input && type?.toLowerCase() == "checkbox")
            return (CheckBox);
        return (impl);
    }
}
