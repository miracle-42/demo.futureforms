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

package database.rest.client;

import java.util.ArrayList;


public class HTTPRequest
{
  private String body;
  private String method;
  private final String host;
  private final String path;

  private ArrayList<String> headers =
    new ArrayList<String>();

  private static final String EOL = "\r\n";


  public HTTPRequest(String host, String path)
  {
    this(host,path,null);
  }


  public HTTPRequest(String host, String path, String body)
  {
    this.host = host;
    this.path = path;
    this.body = body;
  }


  public void setBody(String body)
  {
    this.body = body;
  }

  public void setMethod(String method)
  {
    this.method = method;
  }

  public void setHeader(String header, String value)
  {
    headers.add(header+": "+value);
  }


  public void setCookie(String cookie, String value)
  {
    setCookie(cookie,value,null);
  }


  public void setCookie(String cookie, String value, String path)
  {
    if (path == null)
      path = "/";

    if (value == null)
      value = "";

    setHeader("Set-Cookie",cookie+"="+value+"; path="+path);
  }


  public byte[] page()
  {
    String header = method;
    if (header == null) header = (body == null) ? "GET" : "POST";

    header += " "+path + " HTTP/1.1"+EOL+"Host: "+host+EOL;
    byte[] body = this.body == null ? null : this.body.getBytes();
    if (body != null) header += "Content-Length: "+body.length+EOL;

    for(String h : this.headers)
      header += h + EOL;

    header += EOL;
    byte[] head = header.getBytes();

    if (body == null) return(head);

    byte[] page = new byte[head.length + body.length];

    System.arraycopy(head,0,page,0,head.length);
    System.arraycopy(body,0,page,head.length,body.length);

    return(page);
  }
}