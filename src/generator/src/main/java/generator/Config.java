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
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.io.FileInputStream;


public class Config
{
	public final String usr;
	public final String pwd;
	public final String url;
	public final HashMap<String,String> mapper;
	public final HashMap<String,String> pkeysql;
	public final HashMap<String,Object> styles;

	public Config()
	{
		String[] entries = null;
		JSONObject config = null;

		this.styles = new HashMap<String,Object>();
		this.mapper = new HashMap<String,String>();
		this.pkeysql = new HashMap<String,String>();

		this.mapper.put("string","string");
		this.mapper.put("varchar","string");
		this.mapper.put("varchar2","string");

		this.mapper.put("date","date");
		this.mapper.put("datetime","date");

		this.mapper.put("int","integer");
		this.mapper.put("long","integer");
		this.mapper.put("short","integer");
		this.mapper.put("integer","integer");
		this.mapper.put("smallint","integer");

		this.mapper.put("float","decimal");
		this.mapper.put("double","decimal");

		this.mapper.put("number","number*");
		this.mapper.put("numeric","number*");

		try
		{
			FileInputStream in = new FileInputStream(Generator.configfile);
			config = new JSONObject(new JSONTokener(in));
			in.close();
		}
		catch (Exception e)
		{
			e.printStackTrace();
			System.exit(-1);
		}

		this.usr = config.getString("usr");
		this.pwd = config.getString("pwd");
		this.url = config.getString("url");

		JSONObject mapper = config.getJSONObject("mapper");
		entries = JSONObject.getNames(mapper);

		for (int i = 0; i < entries.length; i++)
			this.mapper.put(entries[i],mapper.getString(entries[i]));

		JSONArray styles = config.getJSONArray("styling");

		for (int i = 0; i < styles.length(); i++)
		{
			JSONObject entry = styles.optJSONObject(i);
			entries = JSONObject.getNames(entry);
			this.styles.put(entries[i].toLowerCase(),entry.get(entries[i]));
		}

		loadPrimaryKeySQL();
	}

	@SuppressWarnings("unchecked")
	public <T> T style(String name)
	{
		return((T) styles.get(name.toLowerCase()));
	}


	public String getPrimaryKeySQL(String type)
	{
		return(pkeysql.get(type.toLowerCase()));
	}


	private void loadPrimaryKeySQL()
	{
		String content = null;

		try
		{
			byte[] data = new byte[4094];
			FileInputStream in = new FileInputStream(Generator.primarykey);

			int read = in.read(data);
			content = new String(data,0,read);

			in.close();
		}
		catch (Exception e)
		{
			e.printStackTrace();
			System.exit(-1);
		}

		getSections(content);
	}


	private void getSections(String content)
	{
		Pattern pattern = Pattern.compile("(.*?)\\[(.*?)\\]");
		Matcher matcher = pattern.matcher(content.replaceAll("\n"," ").trim());

		while(matcher.find())
		{
			String section = content.substring(matcher.start(),matcher.end()-1);

			int pos = section.indexOf("[");
			section = section.replaceAll("\n"," ");

			String type = section.substring(0,pos).trim();
			String stmt = section.substring(pos+1).trim();

			pkeysql.put(type.toLowerCase(),stmt);
		}
	}
}
