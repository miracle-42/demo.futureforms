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

package database.rest.database;

import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import database.rest.config.DatabaseType;


public class DatabaseUtils
{
  private static DatabaseType dbtype = null;
  private static ArrayList<String> urlparts = null;


  public static void setType(DatabaseType dbtype)
  {
    DatabaseUtils.dbtype = dbtype;
  }


  public static DatabaseType getType()
  {
    return(DatabaseUtils.dbtype);
  }


  public static void setUrlParts(ArrayList<String> urlparts)
  {
    DatabaseUtils.urlparts = urlparts;
  }


  public static Database getInstance() throws Exception
  {
    return((Database) dbtype.clazz.getConstructor().newInstance());
  }


  public static ArrayList<String> parse(String url)
  {
    ArrayList<String> connstr = new ArrayList<String>();
    Pattern pattern = Pattern.compile("\\[(username|password)\\]");
    Matcher matcher = pattern.matcher(url.toLowerCase());

    int pos = 0;
    while(matcher.find())
    {
      int e = matcher.end();
      int b = matcher.start();

      if (b > pos)
        connstr.add(url.substring(pos,b));

      connstr.add(url.substring(b,e).toLowerCase());
      pos = e;
    }

    if (pos < url.length())
      connstr.add(url.substring(pos));

    return(connstr);
  }


  public static String bind(String username, String password)
  {
    String url = "";

    for(String part : urlparts)
    {
      if (part.equals("[username]")) url += username;
      else if (part.equals("[password]")) url += password;
      else url += part;
    }

    return(url);
  }
}