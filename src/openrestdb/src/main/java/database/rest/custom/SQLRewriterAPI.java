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

package database.rest.custom;

import java.util.HashMap;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.logging.Logger;
import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import database.rest.database.SQLParser;
import database.rest.handlers.rest.Rest;
import database.rest.handlers.rest.Request;
import database.rest.database.BindValueDef;
import database.rest.handlers.rest.Rest.SessionState;


public class SQLRewriterAPI
{
   private final Rest rest;
   private final SessionState state;
   private final static Logger logger = Logger.getLogger("rest");


   public SQLRewriterAPI(Rest rest)
   {
      this.rest = rest;
      this.state = rest.state();
   }

   public Logger logger()
   {
      return(SQLRewriterAPI.logger);
   }

   public String getType(JSONObject payload) throws Exception
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

         if (cmd.equals("merge " )) return("merge");
         if (cmd.equals("upsert ")) return("upsert");
         if (cmd.equals("select ")) return("select");
         if (cmd.equals("insert ")) return("insert");
         if (cmd.equals("update ")) return("update");
         if (cmd.equals("delete ")) return("delete");
      }

      if (SQLParser.function(sql)) return("function");
      if (SQLParser.procedure(sql)) return("procedure");

      return("ddl");
   }

   public JSONObject parse(String payload) throws Exception
   {
      return(Request.parse(payload));
   }

   public String getSQL(JSONObject payload) throws Exception
   {
      return(rest.getStatement(payload));
   }

   public ArrayList<String> getTables(PreparedStatement stmt) throws Exception
   {
      ArrayList<String> tables = new ArrayList<String>();
      if (stmt == null) return(tables);

      if (stmt.getMetaData() != null)
      {
         for (int i = 0; i < stmt.getMetaData().getColumnCount(); i++)
         {
            String table = stmt.getMetaData().getTableName(i+1);
            if (!tables.contains(table)) tables.add(table);
         }
      }

      return(tables);
   }

   public ArrayList<BindValue> getBindValues(JSONObject payload)
   {
      JSONArray bindv = new JSONArray();
      ArrayList<BindValue> bindvalues = new ArrayList<BindValue>();

      if (payload.has("bindvalues"))
         bindv = payload.getJSONArray("bindvalues");

      for (int i = 0; i < bindv.length(); i++)
      {
         JSONObject bvalue = bindv.getJSONObject(i);

         Object value = null;
         boolean outval = false;

         String name = bvalue.getString("name");
         String type = bvalue.getString("type");

         if (!bvalue.has("value")) outval = true;
         else value = bvalue.get("value");

         bindvalues.add(new BindValue(name,value,type,outval));
      }

      return(bindvalues);
   }

   public PreparedStatement parseSQL(JSONObject payload) throws Exception
   {
      String sql = getSQL(payload);
      ArrayList<BindValue> bindValues = getBindValues(payload);
      return(parseSQL(sql,bindValues));
   }

   public PreparedStatement parseSQL(String sql) throws Exception
   {
      return(state.session().prepare(sql,null));
   }

   public PreparedStatement parseSQL(String sql, ArrayList<BindValue> bindvalues) throws Exception
   {
      HashMap<String,BindValueDef> binds = new HashMap<String,BindValueDef>();

      for(BindValue b : bindvalues)
      {
         BindValueDef bv = new BindValueDef(b.name,b.getType(),b.outval);
         binds.put(bv.name,bv);
      }

      SQLParser parser = new SQLParser(binds,sql);
      return(state.session().prepare(parser.sql(),parser.bindvalues()));
   }

   public CallableStatement parseCall(JSONObject payload) throws Exception
   {
      String sql = getSQL(payload);
      ArrayList<BindValue> bindValues = getBindValues(payload);
      return(parseCall(sql,bindValues));
   }

   public CallableStatement parseCall(String sql) throws Exception
   {
      return(state.session().prepareCall(sql,null));
   }

   public CallableStatement parseCall(String sql, ArrayList<BindValue> bindvalues) throws Exception
   {
      HashMap<String,BindValueDef> binds = new HashMap<String,BindValueDef>();

      for(BindValue b : bindvalues)
      {
         BindValueDef bv = new BindValueDef(b.name,b.getType(),b.outval);
         binds.put(bv.name,bv);
      }

      SQLParser parser = new SQLParser(binds,sql);
      return(state.session().prepareCall(parser.sql(),parser.bindvalues()));
   }
}
