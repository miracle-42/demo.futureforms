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

import java.util.HashMap;
import java.nio.ByteBuffer;


public class HTTPResponse
{
  private int code = -1;
  private int header = -1;
  private int clength = -1;

  private byte[] body = null;
  private boolean finished = false;
  private byte[] response = new byte[0];
  private final static String EOL = "\r\n";

  private HashMap<String,String> headers =
    new HashMap<String,String>();

  private HashMap<String,String> cookies =
    new HashMap<String,String>();


  public boolean finished()
  {
    return (finished);
  }


  public byte[] getBody()
  {
    if (body != null) return(body);
    int blen = response.length - this.header - 4;

    if (blen > 0)
    {
      this.body = new byte[blen];
      System.arraycopy(response,this.header+4,this.body,0,blen);
    }

    return(body);
  }


  public void add(ByteBuffer buf) throws Exception
  {
    int read = buf.remaining();
    byte[] data = new byte[read]; buf.get(data);
    add(data,0,data.length);
  }


  public void add(byte[] data) throws Exception
  {
    add(data,0,data.length);
  }


  public void add(byte[] data, int pos, int len) throws Exception
  {
    int last = response.length;
    byte[] response = new byte[this.response.length+len];

    System.arraycopy(data,pos,response,last,len);
    System.arraycopy(this.response,0,response,0,last);

    this.response = response;

    if (response.length < 16)
      return;

    if (header < 0)
      forward(last);

    if (header < 0)
      return;

    if (code < 0)
      parse();

    if (clength < 0)
    {
      String cl = headers.get("Content-Length");

      if (cl == null) clength = 0;
      else clength = Integer.parseInt(cl);
    }

    if (response.length > header + clength + 4)
      throw new Exception("Received multiple requests without client waiting for response");

    finished = response.length == header + clength + 4;
  }


  void parse()
  {
    String header = new String(response,0,this.header);

    String[] lines = header.split(EOL);
    String[] resp = lines[0].split(" ");

    this.code = Integer.parseInt(resp[1]);

    for (int i = 1; i < lines.length; i++)
    {
      int pos = lines[i].indexOf(':');
      if (pos <= 0) continue;

      String key = lines[i].substring(0,pos).trim();
      String val = lines[i].substring(pos+1).trim();

      this.headers.put(key,val);
    }

    String hcookie = headers.get("Cookie");

    if (hcookie != null)
    {
      String[] cookies = hcookie.split(";");
      for (int i = 0; i < cookies.length; i++)
      {
        String[] nvp = cookies[i].split("=");

        String name = nvp[0].trim();
        String value = nvp.length > 1 ? nvp[1].trim() : "";
        this.cookies.put(name,value);
      }
    }
  }


  void forward(int last)
  {
    int start = 0;
    if (last > 3) start = last - 3;

    for (int h = start; h < response.length-3; h++)
    {
      if (response[h] == '\r' && response[h+1] == '\n' && response[h+2] == '\r' && response[h+3] == '\n')
      {
        header = h;
        return;
      }
    }
  }
}