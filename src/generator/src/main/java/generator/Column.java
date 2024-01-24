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

package generator;

import java.util.HashMap;


public class Column
{
	public String 	name;
	public String 	type;
	public String 	shrt;
	public boolean pkey;
	public int 	   size;
	public int 	   scale;

	public Column(String name, String type, boolean pkey, int size, int scale)
	{
		this.name = name;
		this.type = type;
		this.pkey = pkey;
		this.size = size;
		this.scale = scale;
		this.shrt = shortname(name);
	}

	public String jtype(HashMap<String,String> map)
	{
		String type = map.get(this.type);

		if (type == null)
		{
			System.out.println("No mapping for datatype '"+this.type+"'. Add mapping in config");
			type = "string";
		}

		if (type.equals("number*"))
		{
			type = "integer";
			if (scale > 0) type = "decimal";
		}

		return(type);
	}

	public static String shortname(String name)
	{
		String shrt = null;

		if (name.indexOf('_') > 0)
		{
			shrt = "";

			for (String word : name.split("_"))
			{
				shrt += word.substring(0,1);
				if (word.equals("id")) shrt += word.substring(1,2);
			}
		}
		else
		{
			int len = name.length();

			if (len > 3) len = 3;
			shrt = name.substring(0,len);
		}

		return(shrt);
	}

	public String toString()
	{
		return(name+" "+type+"["+size+","+scale+"]");
	}
}
