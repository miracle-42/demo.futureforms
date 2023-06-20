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

import java.util.HashMap;
import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.logging.Logger;


public class SQLParser
{
  private final String sql;
  private final boolean func;
  private final ArrayList<BindValue> bindings;
  private final HashMap<String,BindValueDef> bindvalues;
  private final static Logger logger = Logger.getLogger("rest");

  private final static Pattern procedure = Pattern.compile("(\\w*\\.)?\\w*\\s*\\(.*\\)");
  private final static Pattern function = Pattern.compile("\\w*\\s*=\\s*(\\w*\\.)?\\w*\\s*\\(.*\\)");


  public static boolean function(String stmt)
  {
    if (stmt == null) return(false);
    Matcher matcher = function.matcher(stmt.trim());
    return(matcher.matches());
  }


  public static boolean procedure(String stmt)
  {
    if (stmt == null) return(false);
    Matcher matcher = procedure.matcher(stmt.trim());
    return(matcher.matches());
  }


  public SQLParser(HashMap<String,BindValueDef> bindvalues, String stmt)
  {
    this(bindvalues,stmt,false);
  }


  public String sql()
  {
    return(sql);
  }


  public ArrayList<BindValue> bindvalues()
  {
    return(bindings);
  }


  public SQLParser(HashMap<String,BindValueDef> bindvalues, String stmt, boolean procedure)
  {
    stmt = stmt.trim();
    this.bindvalues = bindvalues;
    StringBuffer nsql = new StringBuffer();
    this.bindings = new ArrayList<BindValue>();

    if (!procedure) func = false;
    else   func = function(stmt);

    if (func && !stmt.startsWith("&"))
    {
      if (!stmt.startsWith(":")) stmt = "&" + stmt;
      else                       stmt = "&" + stmt.substring(1);
    }

    StringBuffer sql = new StringBuffer(stmt);

    for (int i = 0; i < sql.length(); i++)
    {
      char c = sql.charAt(i);

      if (c == ':' || c == '&')
      {
        int len = extract(sql,i);
        BindValueDef bindv = validate(sql,i,len);

        if (bindv != null)
        {
          i += len;
          nsql.append('?');
          bindings.add(bindv.copy((i == 0 || c == '&')));
        }
        else
        {
          nsql.append(c);
        }
      }
      else
      {
        nsql.append(c);
      }
    }

    if (procedure)
    {
      String proc = nsql.toString();
      if (!func) this.sql = "call "+proc;
      else this.sql = "{" + proc.replace("=","= call") + "}";
    }
    else
    {
      this.sql = nsql.toString();
    }

    logger.finest(this.sql);
  }


  private BindValueDef validate(StringBuffer sql, int pos, int len)
  {
    if (len < 0) return(null);
    String name = sql.substring(pos+1,pos+1+len);
    return(this.bindvalues.get(name));
  }


  private int extract(StringBuffer sql, int pos)
  {
    int start = pos;

    if (pos > 0)
    {
      char pre = sql.charAt(pos-1);
      if (wordCharacter(pre)) return(-1);
      if (pre == ':' || pre == '&') return(-1);
    }

    pos++;

    while(pos < sql.length() && wordCharacter(sql.charAt(pos)))
      pos++;

    return(pos-1-start);
  }


  private boolean wordCharacter(char c)
  {
    if (c == '_') return(true);

    if (c >= '0' && c <= '9') return(true);
    if (c >= 'a' && c <= 'z') return(true);
    if (c >= 'A' && c <= 'Z') return(true);

    return(false);
  }
}