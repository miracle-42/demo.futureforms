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
import { Form } from '../../public/Form.js';
import { FormMetaData } from '../FormMetaData.js';

/**
 *
 * Annotations provides a short and easy way to inject code.
 *
 * The following:
 *
 * @block("employee")
 * private emp:Block;
 *
 * Will create and inject a block into the variable emp
 */
export const block = (block:string) =>
{
	function define(form:Form, attr:string)
	{
		block = block?.toLowerCase();
		FormMetaData.get(form,true).blockattrs.set(attr,block);
		Logger.log(Type.metadata,"Setting variable "+attr+" on form: "+form.name+" to block: "+block);
	}

	return(define);
}