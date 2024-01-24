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
export var Type;
(function (Type) {
    Type[Type["metadata"] = 0] = "metadata";
    Type[Type["database"] = 1] = "database";
    Type[Type["htmlparser"] = 2] = "htmlparser";
    Type[Type["eventparser"] = 3] = "eventparser";
    Type[Type["classloader"] = 4] = "classloader";
    Type[Type["formbinding"] = 5] = "formbinding";
    Type[Type["eventhandling"] = 6] = "eventhandling";
    Type[Type["eventlisteners"] = 7] = "eventlisteners";
})(Type || (Type = {}));
/**
 * The Logger class is meant for debugging the code.
 */
export class Logger {
    static all = false;
    static metadata = false;
    static database = false;
    static htmlparser = false;
    static eventparser = false;
    static classloader = false;
    static formbinding = false;
    static eventhandling = false;
    static eventlisteners = false;
    static log(type, msg) {
        let flag = Type[type];
        if (Logger[flag] || Logger.all)
            console.log(msg);
    }
}
