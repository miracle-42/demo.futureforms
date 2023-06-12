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

package database.rest.handlers;

import java.net.URL;
import java.util.TreeSet;
import java.util.ArrayList;
import java.util.logging.Logger;
import database.rest.servers.http.HTTPRequest;
import database.rest.servers.http.HTTPResponse;
import database.rest.handlers.rest.JSONFormatter;


public class CrossOrigin
{
  private final static TreeSet<String> domains =
    new TreeSet<String>();

  private final static ArrayList<String> allowed =
    new ArrayList<String>();

  private final static Logger logger = Logger.getLogger("rest");
  private final static String methods = "GET, POST, PATCH, DELETE, PUT, OPTIONS, HEAD";


  public static void init(String host, ArrayList<String> domains)
  {
    int pos = host.indexOf(':');
    if (pos > 0) host = host.substring(0,pos);

    CrossOrigin.domains.add(host);

    for (String pattern : domains)
    {
      pattern = pattern.replace(".","\\.");
      pattern = pattern.replace("*",".*");

      CrossOrigin.allowed.add(".*\\."+pattern+"\\..*");
    }
  }


  public String allow(HTTPRequest request) throws Exception
  {
    String mode = request.getHeader("Sec-Fetch-Mode");

    if (mode == null || !mode.equalsIgnoreCase("cors"))
      return(null);

    String origin = request.getHeader("Origin");
    if (domains.contains(origin)) return(null);

    URL url = new URL(origin);
    origin = url.getHost();

    origin = "." + origin + ".";
    for(String pattern : allowed)
    {
      if (origin.matches(pattern))
      {
        domains.add(origin);
        return(null);
      }
    }

    JSONFormatter jfmt = new JSONFormatter();

    jfmt.success(false);
    jfmt.add("message","Origin \""+origin+"\" rejected by Cors");

    logger.severe("Origin \""+origin+"\" rejected by Cors");
    return(jfmt.toString());
  }


  public void addHeaders(HTTPRequest request, HTTPResponse response)
  {
    String mode = request.getHeader("Sec-Fetch-Mode");
    if (mode == null || !mode.equalsIgnoreCase("cors")) return;
    String method = request.getHeader("Access-Control-Request-Method");

    String origin = request.getHeader("Origin");
    response.setHeader("Access-Control-Allow-Headers","*");
    response.setHeader("Access-Control-Request-Headers","*");
    response.setHeader("Access-Control-Allow-Origin",origin);
    response.setHeader("Access-Control-Request-Method",method);
    response.setHeader("Access-Control-Allow-Methods",methods);
    response.setHeader("Access-Control-Allow-Credentials","true");
  }
}