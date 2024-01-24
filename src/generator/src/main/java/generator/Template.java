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

import java.util.List;
import org.jsoup.Jsoup;
import java.util.HashMap;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.Comparator;
import org.jsoup.nodes.Node;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.TextNode;
import org.jsoup.nodes.Document;
import generator.Table.IDFactory;
import org.jsoup.nodes.Attribute;
import org.jsoup.select.Elements;


public class Template
{
	private final Config config;
	private final static String attrnull = "org.jsoup.nodes.Attribute=null";

	public final Document dom;
	public final ArrayList<String> columns;
	public final ArrayList<Element> sections;
	public final HashMap<String,Field> fields;
	public final HashMap<String,Object> tabattrs;
	public final HashMap<String,Node> fieldnodes;
	public final HashMap<String,Object> tempattrs;
	public final HashMap<String,HashMap<String,Object>> colattrs;

	public Template(Config config, String file) throws Exception
	{
		this.config			= config;
		this.dom 			= this.load(file);
		this.columns		= new ArrayList<String>();
	 	this.sections 		= new ArrayList<Element>();
		this.fieldnodes 	= new HashMap<String,Node>();
		this.fields 		= new HashMap<String,Field>();
		this.tabattrs 		= new HashMap<String,Object>();
		this.tempattrs 	= new HashMap<String,Object>();
		this.colattrs 		= new HashMap<String,HashMap<String,Object>>();
	}


	public void merge(Table table, String file, boolean strict) throws Exception
	{
		extractFieldTags();
		extractTemplates();
		extractTableInfo(table);
		extractColumnInfo(table);

		createFieldNodes();

		Document doc = new Document("");
		this.columns.sort(new ColumnCompare(this));

		for (int i = 0; i < sections.size(); i++)
		{
			Merger merger = new Merger();
			Element section = sections.get(i);

			if (!section.tagName().equals("column-types"))
			{
				Node merged = merger.merge(this,section);
				if (merged != null) doc.appendChild(merged);
			}
		}

		int indent = config.style("indentation");
		file = Generator.path(file) + file + ".html";
		doc.outputSettings().indentAmount(indent).outline(true);

		String page = doc.toString();

		if (!strict) page = page.replaceAll("=\""+attrnull+"\"","");
		else page = page.replaceAll("=\""+attrnull+"\"","=\"true\"");

		page = page.replaceAll(" query=\"true\"","");
		page = page.replaceAll(" insert=\"true\"","");
		page = page.replaceAll(" derived=\"false\"","");
		page = page.replaceAll(" readonly=\"false\"","");
		page = page.replaceAll(" disabled=\"false\"","");

		if (!strict)
		{
			// Currently only non-strict adjustment
			page = page.replaceAll(" derived=\"true\""," derived");
		}

		page = page.replaceAll(" readonly=\"true\""," readonly");
		page = page.replaceAll(" disabled=\"true\""," disabled");

		Utils.save(page,file);
	}


	private void createFieldNodes()
	{
		HashMap<String,Object> colattrs = null;

		for (String name : this.columns)
		{
			colattrs = this.colattrs.get(name);
			String type = (String) colattrs.get("type");
			Field field = this.fields.get(type);

			if (field == null)
			{
				System.out.println("No definition found for "+name+" of type "+type);
				System.exit(-1);
			}

			Node node = field.node.clone();
			fieldnodes.put(name,node);

			replace(node,colattrs);
		}
	}


	public void replace(Node node, HashMap<String,Object> colattrs)
	{
		List<Attribute> attrs = node.attributes().asList();

		if (((Element) node).tagName().equals(Generator.REPLACE))
		{
			boolean replace = true;
			String tag = node.attributes().get("tag");

			if (isVariable(tag))
			{
				String resolved = replace(tag,colattrs);
				if (resolved.equals(tag)) replace = false;
				tag = resolved;
			}

			if (replace)
			{
				node.attributes().remove("tag");
				((Element) node).tagName(tag);
			}
		}

		for (Attribute attr : attrs)
		{
			String name = attr.getKey();
			String value = attr.getValue();

			if (colattrs != null && value.equals("{id}"))
			{
				boolean row = node.hasAttr("row");
				String col = (String) colattrs.get("name");

				if (((Element) node).tagName().equals("column"))
				{
					value = IDFactory.next(col,row);
				}
				else
				{
					value = IDFactory.curr(col,row);
				}
			}

			if (isVariable(name))
			{
				boolean byval = false;
				node.attributes().remove(name);

				if (name.startsWith("{{") && name.endsWith("}}"))
				{
					byval = true;
					name = name.substring(2);
					name = name.substring(0,name.length()-2);
					name = "{"+name.trim()+"}";
				}

				value = replace(name,colattrs);

				if (byval && !value.equals(name))
				{
					name = value;
					value = attrnull;
				}

				// var existed
				if (!value.equals(name) && name.length() > 0)
				{
					name = name.replaceAll("\\{","");
					name = name.replaceAll("\\}","");
					node.attributes().put(name,value);
				}
			}
			else
			{
				value = replace(value,colattrs);
				attr.setValue(value);
			}
		}

		List<Node> childs = node.childNodes();

		for (Node child : childs)
		{
			if (child instanceof TextNode)
			{
				String value = ((TextNode) child).text();
				String baseuri = ((TextNode) child).baseUri();

				if (value.trim().length() > 0)
				{
					value = replace(value,colattrs);
					TextNode repl = new TextNode(value,baseuri);
					child.replaceWith(repl);
				}
			}
			else
			{
				replace(child,colattrs);
			}
		}
	}


	public String replace(String value, HashMap<String,Object> colattrs)
	{
		int pos1 = 0;
		int pos2 = 0;

		if (value == null)
			return(attrnull);

		while(pos1 < value.length())
		{
			pos1 = value.indexOf("{",pos1);
			pos2 = value.indexOf("}",pos1+1);

			if (pos1 < 0 || pos2 < 0) break;

			Object val = null;
			String var = value.substring(pos1+1,pos2);

			if (colattrs != null)
				val = colattrs.get(var.toLowerCase());

			if (val == null)
				val = tabattrs.get(var.toLowerCase());

			if (val == null)
				val = tempattrs.get(var.toLowerCase());

			if (val != null)
			{
				value = value.substring(0,pos1) + val + value.substring(pos2+1);
				pos1 = pos2 + (val+"").length() - var.length() - 1;
			}
			else
			{
				pos1 = pos2 + 1;
			}
		}

		return(value.trim());
	}


	public Element copy(Element elem)
	{
		Element copy = new Element(elem.tagName());

		if (elem.children().isEmpty()) copy.appendText(elem.text());

		for (Attribute attr : elem.attributes().asList())
			copy.attributes().put(attr.getKey(),attr.getValue());

		return(copy);
	}


	private void extractTableInfo(Table table)
	{
		JSONObject tabdef = table.definition();

		String[] entries = JSONObject.getNames(tabdef);
		for (String entry : entries)
		{
			String attr = entry.toLowerCase();
			if (!attr.equals("mapping")) tabattrs.put(attr,tabdef.get(entry));
		}
	}

	private void extractColumnInfo(Table table)
	{
		JSONArray columns = table.definition().getJSONArray("mapping");

		for (int i = 0; i < columns.length(); i++)
		{
			JSONObject coldef = columns.getJSONObject(i);
			String[] entries = JSONObject.getNames(coldef);
			String name = coldef.getString("name").toLowerCase();
			HashMap<String,Object> colattrs = new HashMap<String,Object>();
			for (String entry : entries) colattrs.put(entry.toLowerCase(),coldef.get(entry));

			this.columns.add(name);
			this.colattrs.put(name,colattrs);
		}
	}


	private void extractFieldTags()
	{
		Elements sections = dom.getElementsByTag("column-types");

		for (int i = 0; i < sections.size(); i++)
		{
			Elements element = sections.get(i).getElementsByTag("column-type");

			for (int j = 0; j < element.size(); j++)
			{
				Node def = element.get(j);
				String[] types = def.attributes().get("types").split("[\\s,]");

				for (String type : types)
				{
					type = type.trim().toLowerCase();
					if (type.startsWith(",")) type = type.substring(1);
					if (type.endsWith(",")) type = type.substring(0,type.length()-1);
					this.fields.put(type,new Field(def));
				}
			}
		}
	}


	private void extractTemplates()
	{
		Elements elements = dom.children();

		for (int i = 0; i < elements.size(); i++)
		{
			Element elem = elements.get(i);

			if (!elem.tagName().equals("column-types"))
				sections.add(elem);
		}
	}


	private boolean isVariable(String var)
	{
		var = var.trim();

		if (var.startsWith("{") && var.endsWith("}"))
			return(var.indexOf(' ') < 0);

		return(false);
	}


	private Document load(String file) throws Exception
	{
		file = Generator.templates+file;
		return(Jsoup.parse(Utils.load(file,false)));
	}


	private static class ColumnCompare implements Comparator<String>
	{
		private Template templ;

		ColumnCompare(Template templ)
		{
			this.templ = templ;
		}

		public int compare(String a, String b)
		{
			Integer g1;
			Integer g2;

			HashMap<String,Object> c1;
			HashMap<String,Object> c2;

			c1 = templ.colattrs.get(a);
			c2 = templ.colattrs.get(b);

			g1 = (Integer) c1.get("group");
			g2 = (Integer) c2.get("group");

			if (g1 == null) g1 = 0;
			if (g2 == null) g1 = 0;

			return(g1-g2);
		}
	}
}
