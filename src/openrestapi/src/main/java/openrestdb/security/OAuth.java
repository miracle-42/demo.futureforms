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

package openrestdb.security;

import java.net.URL;
import java.util.ArrayList;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.util.logging.Level;
import javax.net.ssl.SSLContext;
import java.util.logging.Logger;
import openrestdb.config.Config;
import javax.net.ssl.TrustManager;
import openrestdb.client.HTTPClient;
import openrestdb.client.HTTPRequest;
import openrestdb.database.NameValuePair;


public class OAuth
{
  private final int port;
  private final String host;
  private final String path;
  private final String usrattr;
  private final SSLContext ctx;
  private final ArrayList<NameValuePair<Object>> headers;
  private final static Logger logger = Logger.getLogger("rest");

  private static OAuth instance = null;

  public static synchronized void init(Config config) throws Exception
  {
    if (instance == null)
      instance = new OAuth(config);
  }


  public static String getUserName(String token)
  {
    return(instance.verify(token));
  }


  private OAuth(Config config) throws Exception
  {
    String endp = config.getSecurity().oauthurl();
    this.usrattr = config.getSecurity().usrattr();
    this.headers = config.getSecurity().oaheaders();

    ctx = SSLContext.getInstance("TLS");
    FakeTrustManager tmgr = new FakeTrustManager();
    ctx.init(null,new TrustManager[] {tmgr},new java.security.SecureRandom());

    URL url = new URL(endp);

    this.host = url.getHost();
    this.port = url.getPort();
    this.path = url.getPath();
  }


  private String verify(String token)
  {
    try
    {
      HTTPClient client = new HTTPClient(host,port,ctx);
      HTTPRequest request = new HTTPRequest(host,path,token);

      for(NameValuePair<Object> header : headers)
        request.setHeader(header.getName(),header.getValue().toString());

      logger.info("OAuth connect to "+host+":"+port);
      client.connect();

      logger.info("OAuth send request");
      byte[] bytes = client.send(request.page());

      String payload = new String(bytes);
      logger.info("OAuth response \n"+payload);

      JSONTokener tokener = new JSONTokener(payload);
      JSONObject response = new JSONObject(tokener);


      String user = response.getString(usrattr);
      return(user);
    }
    catch (Exception e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);
      return(null);
    }
  }
}