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

package database.rest.servers.http;

import java.util.Date;
import java.util.ArrayList;
import java.text.SimpleDateFormat;


public class HTTPResponse
{
  private byte[] body;
  private byte[] page;
  private String header;
  private String response;
  private String mimetype;
  private boolean finished;
  private static int timeout;

  // Not threadsafe => allocate per response
  private final SimpleDateFormat format = new SimpleDateFormat("EEE, d MMM YYYY hh:mm:ss z");

  private final ArrayList<String> headers =
    new ArrayList<String>();

  private final static String EOL = "\r\n";
  private final static String server = "OpenRestDB";


  public static void init(int timeout)
  {
    HTTPResponse.timeout = timeout/1000;
  }


  public HTTPResponse()
  {
    setHeader("server",server);
    setHeader("Date",new Date());
    setHeader("Connection","Keep-Alive");
    setHeader("Keep-Alive","timeout="+timeout);
  }


  public HTTPResponse(byte[] data)
  {
    finished = true;
    this.page = data;

    int hlen = hlength(data);
    this.header = new String(data,0,hlen);

    this.body = new byte[data.length-hlen];
    System.arraycopy(data,hlen,body,0,body.length);
  }


  void finish()
  {
    if (finished)
      return;

    finished = true;

    if (body == null)
      body = new byte[0];

    if (mimetype == null)
      mimetype = "text/plain";

    setHeader("Content-Type",mimetype);
    setHeader("Content-Length",body.length);

    if (this.response == null) setResponse(200);
  }


  public void setResponse(int code)
  {
    this.response = HTTPCodes.get(code);
  }


  public void setContentType(String mimetype)
  {
    this.mimetype = mimetype;
  }


  public void setLastModified()
  {
    setLastModified(new Date());
  }


  public void setLastModified(Date date)
  {
    setHeader("Last-Modified",format.format(date));
    setHeader("ETag",Long.toHexString(date.getTime()));
  }


  public void setLastModified(String formatted, Date date)
  {
    setHeader("Last-Modified",formatted);
    setHeader("ETag",Long.toHexString(date.getTime()));
  }


  public void setLastModified(long time)
  {
    Date date = new Date();
    date.setTime(time);
    setLastModified(date);
  }


  public void setHeader(String header, Date value)
  {
    headers.add(header+": "+format.format(value));
  }


  public void setHeader(String header, int value)
  {
    headers.add(header+": "+value);
  }


  public void setHeader(String header, String value)
  {
    headers.add(header+": "+value);
  }


  public void setCookie(String cookie, String value)
  {
    Date expires = null;
    setCookie(cookie,value,expires,"/");
  }


  public void setCookie(String cookie, String value, Date expires, String path)
  {
    String expire = "";

    if (value == null)
      value = "";

    if (expires != null)
      expire = "; expires="+format.format(expires);

    setHeader("Set-Cookie",cookie+"="+value+expire+"; path="+path);
  }


  public void setCookie(String cookie, String value, int maxage)
  {
    setCookie(cookie,value,maxage,"/");
  }


  public void setCookie(String cookie, String value, int maxage, String path)
  {
    if (value == null) value = "";
    String expire = "; max-age="+maxage;
    setHeader("Set-Cookie",cookie+"="+value+expire+"; path="+path);
  }


  public void removeCookie(String cookie)
  {
    removeCookie(cookie,"/");
  }


  public void removeCookie(String cookie, String path)
  {
    Date date = new Date();
    date.setTime(0);
    setCookie(cookie,null,date,path);
  }



  public void setBody(String body)
  {
    if (body != null)
      setBody(body.getBytes());
  }


  public void setBody(byte[] body)
  {
    this.body = body;
  }


  public void setBody(byte[] body, int pos, int len)
  {
    this.body = new byte[len];
    System.arraycopy(body,pos,this.body,0,len);
  }


  public String header()
  {
    if (header != null)
      return(header);

    finish();

    header = response + EOL;
    for(String h : headers) header += h+EOL;

    header += EOL;
    return(header);
  }

  public byte[] nvlbody()
  {
    byte[] body = body();
    if (body != null) return(body);
    else              return(new byte[0]);
  }


  public byte[] body()
  {
    return(body);
  }


  public byte[] page()
  {
    if (!finished) finish();
    if (page != null) return(page);

    byte[] head = header().getBytes();
    this.page = new byte[head.length+this.body.length];

    System.arraycopy(head,0,page,0,head.length);
    System.arraycopy(this.body,0,page,head.length,this.body.length);

    return(page);
  }


  private int hlength(byte[] data)
  {
    for (int h = 0; h < data.length-3; h++)
    {
      if (data[h] == '\r' && data[h+1] == '\n' && data[h+2] == '\r' && data[h+3] == '\n')
        return(h+3);
    }

    return(data.length);
  }
}