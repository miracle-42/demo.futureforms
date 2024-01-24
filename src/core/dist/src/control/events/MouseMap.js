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
/**
 * Map over mouse events
 */
export var MouseMap;
(function (MouseMap) {
    MouseMap[MouseMap["drop"] = 0] = "drop";
    MouseMap[MouseMap["click"] = 1] = "click";
    MouseMap[MouseMap["dblclick"] = 2] = "dblclick";
    MouseMap[MouseMap["contextmenu"] = 3] = "contextmenu";
    MouseMap[MouseMap["drag"] = 4] = "drag";
    MouseMap[MouseMap["dragend"] = 5] = "dragend";
    MouseMap[MouseMap["dragover"] = 6] = "dragover";
    MouseMap[MouseMap["dragstart"] = 7] = "dragstart";
    MouseMap[MouseMap["dragenter"] = 8] = "dragenter";
    MouseMap[MouseMap["dragleave"] = 9] = "dragleave";
})(MouseMap || (MouseMap = {}));
export class MouseMapParser {
    static parseBrowserEvent(event) {
        return (MouseMap[event.type]);
    }
}
