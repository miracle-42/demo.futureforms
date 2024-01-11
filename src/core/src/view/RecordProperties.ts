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

import { Row } from "./Row.js";
import { Field } from "./fields/Field.js";
import { Record } from "../model/Record.js";
import { BasicProperties } from "./fields/BasicProperties.js";
import { FieldFeatureFactory } from "./FieldFeatureFactory.js";

export class RecordProperties
{
	// record -> field -> clazz -> props
	propmap$:Map<object,Map<string,Map<string,BasicProperties>>> =
		new Map<object,Map<string,Map<string,BasicProperties>>>();

	public clear() : void
	{
		this.propmap$.clear();
	}

	public get(record:Record, field:string, clazz:string) : BasicProperties
	{
		return(this.propmap$.get(record.id)?.get(field)?.get(clazz));
	}

	public set(record:Record, field:string, clazz:string, props:BasicProperties) : void
	{
		let rmap:Map<string,Map<string,BasicProperties>> = this.propmap$.get(record.id);

		if (rmap == null)
		{
			rmap = new Map<string,Map<string,BasicProperties>>();
			this.propmap$.set(record.id,rmap);
		}

		let fmap:Map<string,BasicProperties> = rmap.get(field);

		if (fmap == null)
		{
			fmap = new Map<string,BasicProperties>();
			rmap.set(field,fmap);
		}

		fmap.set(clazz,props);
	}

	public delete(record:Record, field:string, clazz:string) : void
	{
		if (!field) this.propmap$.delete(record.id);
		else this.propmap$.get(record.id)?.get(field)?.delete(clazz);
	}

	public reset(row:Row, field?:string, clazz?:string) : void
	{
		if (row == null)
			return;

		if (field != null)
		{
			let fld:Field = row.getField(field);

			fld?.getInstances().forEach((inst) =>
			{
				if (clazz == null || inst.properties.hasClass(clazz))
					inst.resetProperties();
			})
		}
		else
		{
			row.getFields().forEach((fld) =>
			{
				fld.getInstances().forEach((inst) =>
				{
					if (clazz == null || inst.properties.hasClass(clazz))
						inst.resetProperties();
				})
			})
		}
	}

	public apply(row:Row, record:Record, field?:string) : void
	{
		let rmap:Map<string,Map<string,BasicProperties>> = this.propmap$.get(record.id);

		if (rmap == null)
			return;

		if (field != null)
		{
			let fmap:Map<string,BasicProperties> = rmap.get(field);

			if (fmap != null)
			{
				let fld:Field = row.getField(field);
				let classes:string[] = [...fmap.keys()];

				fld?.getInstances().forEach((inst) =>
				{
					for (let i = 0; i < classes.length; i++)
					{
						if (classes[i] == null || inst.properties.hasClass(classes[i]))
							FieldFeatureFactory.replace(fmap.get(classes[i]),inst,null);
					}
				})
			}
		}
		else
		{
			row.getFields().forEach((fld) =>
			{
				let fmap:Map<string,BasicProperties> = rmap.get(fld.name);

				if (fmap != null)
				{
					let classes:string[] = [...fmap.keys()];

					fld?.getInstances().forEach((inst) =>
					{
						for (let i = 0; i < classes.length; i++)
						{
							if (classes[i] == null || inst.properties.hasClass(classes[i]))
								FieldFeatureFactory.replace(fmap.get(classes[i]),inst,null);
						}
					})
				}
			});
		}
	}
}