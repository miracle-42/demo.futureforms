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
import { Logger, Type } from '../Logger.js';
import { Components } from '../Components.js';
import { FormBacking } from '../FormBacking.js';
function isComponent(object) {
    return ('path' in object && 'class' in object);
}
/**
 *
 * @param components : A list of components and their mapping
 *
 * HTML is pure text and often FutureForms needs to know how to translate
 * a given path/name into a class. This is done by injecting the class and
 * a path/name into the FutureForms engine.
 *
 */
export const FormsPathMapping = (components) => {
    function define(_comp_) {
        components.forEach(element => {
            let path = null;
            let clazz = null;
            let navigable = false;
            if (isComponent(element)) {
                clazz = element.class;
                path = element.path.toLowerCase();
                navigable = element.navigable;
                if (navigable == null)
                    navigable = false;
            }
            else {
                navigable = false;
                clazz = element;
                path = element.name.toLowerCase();
            }
            Components.classmap.set(path, clazz);
            Components.classurl.set(clazz.name.toLowerCase(), path);
            FormBacking.setURLNavigable(path, navigable);
            Logger.log(Type.classloader, "Loading class: " + clazz.name + " into position: " + path);
        });
    }
    return (define);
};
