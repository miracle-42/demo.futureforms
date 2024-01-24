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

import java.net.URL;
import java.io.File;
import java.nio.file.Path;


public class Generator
{
	public static final String COLUMN = "column";
	public static final String REPLACE = "replace";
	public static final String GROUPS = "foreach-group";
	public static final String COLUMNS = "foreach-column";

	public static final String path = findAppHome();
	public static final String tables = path + File.separator + "tables" + File.separator;
	public static final String templates = path + File.separator + "templates" + File.separator;
	public static final String configfile = path + File.separator + "conf" + File.separator + "config.json";
	public static final String primarykey = path + File.separator + "conf" + File.separator + "primarykey.sql";

	public static final Config config = new Config();
	public static String path(String file) {return(Generator.tables + File.separator + file + File.separator);}


	public static void main(String[] args) throws Exception
	{
		String file = null;
		int len = args.length;

		boolean update = false;
		boolean strict = false;

		String program =
			Utils.nvl(System.getenv("GeneratorClass"),"generator");

		int arg = 0;
		while(arg < len)
		{
			if (args[arg].equals("-s") || args[arg].equals("--strict"))
			{
				len--;
				strict = true;

				for (int j = arg; j < args.length; j++)
					args[j] = j < args.length - 1 ? args[j+1] : null;

            continue;
			}

			if (args[arg].equals("-u") || args[arg].equals("--update"))
			{
				len--;
				update = true;

				for (int j = arg; j < args.length; j++)
					args[j] = j < args.length - 1 ? args[j+1] : null;

            continue;
			}

         if (args[arg].equals("-a") || args[arg].equals("--alias"))
			{
            if (args.length > arg)
            {
               len -= 2;
               file = args[arg+1];

               for (int j = arg; j < args.length; j++)
                  args[j] = j < args.length - 2 ? args[j+2] : null;

               continue;
            }
			}

			arg++;
		}

		if (len < 1 || len > 2)
		{
			System.out.println();
			System.out.println("Usage: "+program+" [options] table [template]");
			System.out.println();
			System.out.println("options:");
			System.out.println("         -a | --alias : table alias");
			System.out.println("         -u | --update : update table definition");
			System.out.println("         -s | --strict : generate more strict (xhtml) style");
			System.out.println();
			System.exit(-1);
		}

		String tab = args[0];
		String tpl = len > 1 ? args[1] : "default";

		if (file == null)
			file = tab;

		if (!tpl.endsWith(".html"))
			tpl += ".html";

		int pos = file.indexOf(".");
		if (pos > 0) file = file.substring(pos+1);

      if (!Table.exists(file))
         update = true;

		Table table = new Table(config,tab,file,update);

		if (table.definition() == null)
			throw new Exception("No definition found for "+tab);

		Template template = new Template(config,tpl);
		template.merge(table,file,strict);
	}


	private static String findAppHome()
	{
		String sep = File.separator;
		Object obj = new Object() { };

		String cname = obj.getClass().getEnclosingClass().getName();
		cname = "/" + cname.replace('.','/') + ".class";

		URL url = obj.getClass().getResource(cname);
		String path = url.getPath();

		if (url.getProtocol().equals("jar") || url.getProtocol().equals("code-source"))
		{
			path = path.substring(5); // get rid of "file:"
			path = path.substring(0,path.indexOf("!")); // get rid of "!class"
			path = path.substring(0,path.lastIndexOf("/")); // get rid jarname

			if (path.endsWith("/target")) path = path.substring(0,path.length()-7);
			if (path.endsWith("/project")) path = path.substring(0,path.length()-8);
		}
		else
		{
			path = path.substring(0,path.length()-cname.length());
			if (path.endsWith("/classes")) path = path.substring(0,path.length()-8);
			if (path.endsWith("/target")) path = path.substring(0,path.length()-7);
		}

		String escape = "\\";
		if (sep.equals(escape))
		{
			// Windows
			if (path.startsWith("/") && path.charAt(2) == ':')
			path = path.substring(1);

			path = path.replaceAll("/",escape+sep);
		}

		File cw = new File(".");
		Path abs = java.nio.file.Paths.get(path);
		Path base = java.nio.file.Paths.get(cw.getAbsolutePath());
		path = base.relativize(abs).toString();

		// Back until conf folder

		while(true)
		{
			String conf = path+sep+"conf";

			File test = new File(conf);
			if (test.exists()) break;

			int pos = path.lastIndexOf(sep);

			if (pos < 0)
			{
				path = base.toString();
				path = path.substring(0,path.length()-2);
				break;
			}

			path = path.substring(0,pos);
		}

		if (path.startsWith("."))
		{
			path = cw.getAbsolutePath() + sep + path;
			abs = java.nio.file.Paths.get(path).normalize();
			path = abs.toString();
		}

		return(path);
	}
}