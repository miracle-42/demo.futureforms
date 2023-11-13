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

package database.rest.handlers.rest;

import java.util.TreeSet;
import java.util.ArrayList;
import org.json.JSONObject;
import org.json.JSONTokener;
import database.rest.database.SQLParser;


public class Request
{
  public final String cmd;
  public final String path;
  public final String func;
  public final String sesid;
  public final String session;
  public final String returning;
  public final JSONObject payload;
  public final ArrayList<String> args;

  private static final TreeSet<String> function = new TreeSet<String>();
  private static final TreeSet<String> commands = new TreeSet<String>();

  static
  {
    function.add("ddl");
    function.add("map");
    function.add("call");
    function.add("batch");
    function.add("merge");
    function.add("fetch");
    function.add("script");
    function.add("select");
    function.add("insert");
    function.add("update");
    function.add("delete");
  }

  static
  {
    commands.add("ping");
    commands.add("exec");
    commands.add("status");
    commands.add("commit");
    commands.add("connect");
    commands.add("release");
    commands.add("rollback");
    commands.add("disconnect");
  }


  public Request(Rest rest, String path, String payload) throws Exception
  {
    this(rest,path,parse(payload));
  }


  public Request(Rest rest, String path, JSONObject payload) throws Exception
  {
    this.path = path;
    this.payload = payload;
    this.args = new ArrayList<String>();

    String cmd = null;
    String func = null;
    String sesid = null;
    String session = null;

    if (payload == null)
      payload = parse("{}");

    if (path.startsWith("/"))
      path = path.substring(1);

    String[] args = path.split("/");

    int pos = 0;
    for (int i = 0; i < args.length; i++)
    {
      if (function.contains(args[i]))
      {
        pos = i;
        cmd = "exec";
        func = args[i];
        break;
      }

      String spec = args[i];

      if (spec.equals("sql")) spec = "exec";
      if (spec.equals("execute")) spec = "exec";

      if (commands.contains(spec))
      {
        pos = i;
        cmd = spec;
        break;
      }
    }

    if (pos > 1 || cmd == null)
      throw new Exception("Unknown rest path: '/"+path+"'");

    if (func == null)
    {
      if (pos < args.length - 1)
      {
        if (function.contains(args[pos+1]))
          func = args[pos+1];
      }
    }

    if (func == null && cmd.equals("exec"))
      func = peek(rest,payload);

    if (func == null && cmd.equals("exec"))
      throw new Exception("Unknown rest path: '/"+path+"'");

    if (pos > 0) sesid = args[0];
    else sesid = get(payload,"session");

    if (sesid != null)
    {
      if (sesid.startsWith("*")) session = sesid;
      else                       session = rest.decode(sesid);
    }

    for (int i = pos+1; i < args.length; i++)
      this.args.add(args[i]);

    this.cmd = cmd;
    this.func = func;
    this.sesid = sesid;
    this.session = session;
    this.returning = get(payload,"returning");
  }


  public static JSONObject parse(String payload) throws Exception
  {
    if (payload == null)
      payload = "{}";

    try
    {
      JSONTokener tokener = new JSONTokener(payload);
      return(new JSONObject(tokener));
    }
    catch (Throwable e)
    {
      throw new Exception("Could not parse json payload: ["+payload+"]");
    }
  }


  public String nvlfunc()
  {
    if (func == null) return(cmd);
    else              return(func);
  }


  @Override
  public String toString()
  {
    String str = "";

    if (session == null) str += "[]/";
    else                 str += "[" + session + "]/";

    str += this.cmd;
    if (func != null) str += "/" + func;
    for(String arg : args) str += " <" + arg + ">";
    return(str);
  }


  private String get(JSONObject payload, String entry)
  {
    if (!payload.has(entry)) return(null);
    return(payload.get(entry)+"");
  }


  private String peek(Rest rest, JSONObject payload) throws Exception
  {
    if (payload.has("batch"))
      return("batch");

    if (payload.has("script"))
      return("script");

    String sql = rest.getStatement(payload);
    if (sql == null) return(null);

    sql = sql.trim();
    if (sql.length() > 6)
    {
      String cmd = sql.substring(0,7).toLowerCase();

      if (cmd.equals("merge " )) return("update");
      if (cmd.equals("upsert ")) return("update");
      if (cmd.equals("select ")) return("select");
      if (cmd.equals("insert ")) return("update");
      if (cmd.equals("update ")) return("update");
      if (cmd.equals("delete ")) return("update");
    }

    if (SQLParser.function(sql)) return("call");
    if (SQLParser.procedure(sql)) return("call");

    return("ddl");
  }
}