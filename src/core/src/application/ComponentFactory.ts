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

import { Form } from '../public/Form.js';
import { Class } from '../public/Class.js';
import { FormBacking } from './FormBacking.js';
import { HTMLFragment } from './HTMLFragment.js';
import { Classes } from '../internal/Classes.js';
import { ComponentFactory as Factory } from './interfaces/ComponentFactory.js';

export class ComponentFactory implements Factory
{
	createBean(bean:Class<any>) : any {return(new bean())}
	createFragment(frag:Class<any>) : HTMLFragment {return(new frag())}

	async createForm(form:Class<Form>, parameters?:Map<any,any>) : Promise<Form>
	{
		let instance:Form = null;

		if (Classes.isInternal(form))	instance = new form();
		else									instance = new form();

		if (parameters != null) instance.parameters = parameters;

		let page:string|HTMLElement = FormBacking.getBacking(instance).page;

		if (page != null)
			await instance.setView(page);

		return(instance)
	}
}