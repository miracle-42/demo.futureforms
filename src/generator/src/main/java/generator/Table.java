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

import java.net.URI;
import java.util.HashMap;
import java.util.HashSet;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpRequest.BodyPublisher;


public class Table
{
	private String file;
	private Config config;
	private JSONObject def;
	private Column[] columns;


	public static boolean exists(String file) throws Exception
	{
		return(Utils.exists(Generator.path(file) + file + ".json"));
	}


	public static boolean delete(String file) throws Exception
	{
		return(Utils.delete(Generator.path(file) + file + ".json"));
	}


	public Table(Config config, String table, String file, boolean update) throws Exception
	{
		this.config = config;
		this.file = Generator.path(file) + file + ".json";

      String existing = Utils.load(this.file,true);
		if (existing != null) this.def = new JSONObject(existing);

		if (update)
		{
			this.describe(table);
			this.merge(table);
		}

		IDFactory.create(this.def);
	}


	public Column[] columns()
	{
		return(this.columns);
	}


	public JSONObject definition()
	{
		return(def);
	}


	private void merge(String table) throws Exception
	{
		JSONObject def = null;
		JSONArray map = new JSONArray();
		HashSet<String> ignore = new HashSet<String>();

		int pos = table.indexOf('.');
		if (pos >= 0) table = table.substring(pos+1);

		if (this.def == null)
		{
			def = new JSONObject();

			def.put("from",table);
			def.put("mapping",map);
			def.put("multirow",3);
			def.put("alias",Column.shortname(table));
			def.put("sort",this.columns[0].name);
		}
		else
		{
			def = this.def;

			if (!def.has("mapping")) def.put("mapping",map);
			else map = def.getJSONArray("mapping");

			if (!def.has("from")) def.put("from",table);
			if (!def.has("multirow")) def.put("multirow",3);
			if (!def.has("sort")) def.put("sort",this.columns[0].name);
			if (!def.has("alias")) def.put("alias",Column.shortname(table));

			for (int i = 0; i < map.length(); i++)
				ignore.add(map.getJSONObject(i).getString("name"));
		}

		for (int i = 0; i < columns.length; i++)
		{
			if (!ignore.contains(this.columns[i].name.toLowerCase()))
			{
				JSONObject entry = new JSONObject();
				String type = this.columns[i].jtype(config.mapper);

				entry.put("group",0);

				entry.put("case","");
				entry.put("type",type);
				entry.put("abbr",this.columns[i].shrt);

				if (this.columns[i].pkey)
				{
					entry.put("pkey",this.columns[i].pkey);
					entry.put("excl",this.columns[i].pkey);
				}

				entry.put("size",this.columns[i].size);
				entry.put("label",initcap(this.columns[i].name));
				entry.put("name",this.columns[i].name.toLowerCase());

				entry.put("query",true);
				entry.put("insert",true);
				entry.put("derived",false);
				entry.put("readonly",false);
				entry.put("disabled",false);

				map.put(entry);
			}
		}

		Utils.save(def.toString(2),this.file);
		this.def = def;
	}


	private void describe(String table) throws Exception
	{
		String data =
		"{\n"+
		"	\"disconnect\": false," +
		"  \"batch\": \n" +
		"   [\n" +
		"     {\n" +
		"       \"path\": \"/connect\",\n" +
		"       \"payload\":\n" +
		"        {\n" +
		"           \"auth.method\": \"database\",\n" +
		"           \"username\" : \"" + config.usr+"\",\n" +
		"           \"auth.secret\" : \"" + config.pwd+"\",\n" +
		"           \"scope\": \"dedicated\"\n" +
		"        }\n" +
		"      }\n" +
		"      ,\n" +
		"      {\n" +
		"       \"path\": \"/select\",\n" +
		"       \"payload\":\n" +
		"        {\n" +
		"           \"compact\": \"true\",\n" +
		"           \"describe\" : \"true\",\n" +
		"           \"sql\" : \"select * from "+table+" where 1 = 2\"\n" +
		"        }\n" +
		"      }\n" +
		"   ]\n" +
		"}\n";

		JSONObject json = callORDB("batch",data);

		JSONArray steps = json.getJSONArray("steps");
		JSONObject connect = steps.getJSONObject(0);

		if (!connect.getBoolean("success"))
		{
			System.out.println(json.toString(2));
			throw new Exception(json.getString("message"));
		}

		String dbtype = connect.getString("type");
		String sesid = connect.getString("session");

		json = steps.getJSONObject(1);

		if (!json.getBoolean("success"))
		{
			System.out.println(json.toString(2));
			throw new Exception(json.getString("message"));
		}

		JSONArray typs = json.getJSONArray("types");
		JSONArray cols = json.getJSONArray("columns");
		JSONArray prcs = json.getJSONArray("precision");

		String[] columns = new String[cols.length()];
		for (int i = 0; i < cols.length(); i++) columns[i] = cols.getString(i).toLowerCase();

		String[] types = new String[typs.length()];
		for (int i = 0; i < typs.length(); i++) types[i] = typs.getString(i).toLowerCase();

		int[][] precision = new int[prcs.length()][];
		for (int i = 0; i < prcs.length(); i++)
		{
			JSONArray entry = prcs.getJSONArray(i);

			precision[i] = new int[2];
			precision[i][0] = entry.getInt(0);
			precision[i][1] = entry.getInt(1);
		}

		this.columns = new Column[columns.length];
		HashSet<String> keys = getPrimaryKey(dbtype,sesid,table);

		for (int i = 0; i < this.columns.length; i++)
		{
			boolean pkey = keys.contains(columns[i]);
			this.columns[i] = new Column(columns[i],types[i],pkey,precision[i][0],precision[i][1]);
		}

		disconnect(sesid);
	}


	private HashSet<String> getPrimaryKey(String type, String session, String table) throws Exception
	{
		HashSet<String> columns = new HashSet<String>();
		String sql = this.config.getPrimaryKeySQL(type);

		String data =
		"{\n"+
		"	\"session\": \"" + session + "\"," +
		"	\"sql\": \"" + sql + "\"," +
		"	\"bindvalues\": [{\"name\": \"table\", \"value\": \"" + table + "\", \"type\": \"string\"}]" +
		"}\n";

		JSONObject json = callORDB("select",data);

		if (!json.getBoolean("success"))
		{
			System.out.println(json.toString(2));
			throw new Exception(json.getString("message"));
		}

		String cname = "column_name";
		JSONArray rows = json.getJSONArray("rows");
		if (!rows.getJSONObject(0).has(cname)) cname = cname.toUpperCase();

		for (int i = 0; i < rows.length(); i++)
			columns.add(rows.getJSONObject(i).getString(cname));

		return(columns);
	}


	private void disconnect(String session) throws Exception
	{
		String data =
		"{\n"+
		"	\"session\": \"" + session + "\"" +
		"}\n";

		callORDB("disconnect",data);
	}


	private JSONObject callORDB(String path, String data) throws Exception
	{
		URI uri = new URI(config.url+"/"+path);
		BodyPublisher body = HttpRequest.BodyPublishers.ofString(data);

		HttpClient client = HttpClient.newHttpClient();
		HttpRequest request = HttpRequest.newBuilder(uri).POST(body).build();

		HttpResponse<String> response = client.send(request,HttpResponse.BodyHandlers.ofString());
		JSONObject json = new JSONObject(new JSONTokener(response.body()));

		return(json);
	}


	private String initcap(String str)
	{
		str = str.trim();

		str = str.substring(0,1).toUpperCase()+
				str.substring(1).toLowerCase();

		int pos = str.indexOf('_');

		while (pos > 0)
		{
			str = str.substring(0,pos)+" "+
					str.substring(pos+1,pos+2).toUpperCase()+
					str.substring(pos+2);

			pos = str.indexOf('_',pos+3);
		}

		return(str);
	}


	public static class IDFactory
	{
		private static String alias;

		private static HashMap<String,Sequence> ids =
			new HashMap<String,Sequence>();


		public static void create(JSONObject def)
		{
			if (def == null) return;

			alias = def.getString("alias");
			JSONArray columns = def.getJSONArray("mapping");

			for (int i = 0; i < columns.length(); i++)
			{
				JSONObject entry = columns.getJSONObject(i);
				String name = entry.getString("name");
				String abbr = entry.getString("abbr");
				ids.put(name,new Sequence(abbr));
			}
		}

		public static String curr(Object name, boolean row)
		{
			Sequence seq = ids.get(name);
			if (seq == null) return("unknown-column-"+name);

			String id = alias+"-"+seq.pref+"-"+seq.next+"-";
			if (row) id += "$row"; else id += "0";

			return(id);
		}

		public static String next(Object name, boolean row)
		{
			Sequence seq = ids.get(name);
			if (seq == null) return("unknown-column-"+name);

			String id = alias+"-"+seq.pref+"-"+seq.next+"-";
			if (row) id += "$row"; else id += "0";

			seq.next++;
			return(id);
		}

		private static class Sequence
		{
			int next;
			String pref;

			Sequence(String pref)
			{
				this.next = 0;
				this.pref = pref;
			}
		}
	}
}
