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

import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.logging.Logger;
import database.rest.servers.Server;
import database.rest.handlers.rest.Rest;
import database.rest.handlers.rest.Request;


public class AuthenticatorAPI
{
   private final String host;
   private final Server server;
   private final static Logger logger = Logger.getLogger("rest");


   public AuthenticatorAPI(Server server, String host)
   {
      this.host = host;
      this.server = server;
   }

   public Logger logger()
   {
      return(AuthenticatorAPI.logger);
   }

   public JSONObject parse(String payload) throws Exception
   {
      return(Request.parse(payload));
   }

   public JSONObject createPayload(String session, String sql, ArrayList<BindValue> bindvalues) throws Exception
   {
      JSONObject payload = new JSONObject();

      payload.put("session",session);
      payload.put("sql",cleanup(sql));

      if (bindvalues != null && bindvalues.size() > 0)
      {
         JSONArray binds = new JSONArray();

         for(BindValue b : bindvalues)
         {
            JSONObject bindv = new JSONObject();

            bindv.put("name",b.name);
            bindv.put("type",b.getType());

            if (!b.outval) bindv.put("value",b.value);
            binds.put(bindv);
         }

         payload.put("bindvalues",binds);
      }

      return(payload);
   }

   public String connect() throws Exception
   {
      return(connect(null));
   }

   public String connect(String user) throws Exception
   {
      Rest rest = new Rest(server,true,host);
      return(rest.connect(user));
   }

   public boolean disconnect(String sesid) throws Exception
   {
      Rest rest = new Rest(server,true,host);
      String response = rest.execute("disconnect","{\"session\": \""+sesid+"\"}",false);

      JSONObject rsp = parse(response);
      return(rsp.getBoolean("success"));
   }

   public JSONObject execute(JSONObject payload) throws Exception
   {
      return(execute(payload.toString(2)));
   }

   public JSONObject execute(String payload) throws Exception
   {
      Rest rest = new Rest(server,true,host);
      String response = rest.execute("exec",payload,false);
      return(parse(response));
   }

   public String createSharedSecret(String data) throws Exception
   {
      return(Encryption.encrypt(secret(),data));
   }

   public String createSharedSecret(byte[] data) throws Exception
   {
      return(Encryption.encrypt(secret(),data));
   }

   public String decryptSharedSecret(String data) throws Exception
   {
      return(new String(Encryption.decrypt(secret(),data)));
   }

   private String secret() throws Exception
   {
      return(server.config().getSecurity().secret());
   }

   private String cleanup(String sql)
   {
      sql = sql.replaceAll("'","\"");
      sql = sql.replaceAll("\n"," ");

      while (sql.indexOf("\" ") >= 0)
         sql = sql.replace("\" ","\"");

      sql = sql.replaceAll("\" "," ");

      while (sql.indexOf("  ") >= 0)
         sql = sql.replaceAll("  "," ");

      return(sql.trim());
   }
}
