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

import java.util.HashMap;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import database.rest.servers.Server;
import java.nio.channels.SelectionKey;


public class HTTPRequest
{
  private long time = 0;
  private int header = -1;
  private int clength = -1;

  private String host = null;
  private String path = null;
  private String remote = null;
  private String method = null;
  private String version = null;
  private boolean parsed = false;
  private boolean redirect = false;

  private final Server server;
  private final SelectionKey key;
  private final HTTPWaiter waiter;
  private final HTTPChannel channel;

  private byte[] body = null;
  private byte[] request = new byte[0];

  private HashMap<String,String> headers =
    new HashMap<String,String>();

  private HashMap<String,String> cookies =
    new HashMap<String,String>();

  private final ArrayList<Pair<String,String>> query =
    new ArrayList<Pair<String,String>>();

  private final static String EOL = "\r\n";
  private long touched = System.currentTimeMillis();


  public HTTPRequest(Server server, String host, byte[] data) throws Exception
  {
    this.key = null;
    this.host = host;
    this.remote = host;
    this.waiter = null;
    this.channel = null;
    this.server = server;
    this.redirect = false;

    this.add(data);
  }


  public HTTPRequest(HTTPWaiter waiter, HTTPChannel channel, SelectionKey key)
  {
    this.key = key;
    this.waiter = waiter;
    this.channel = channel;
    this.host =  channel.remote();
    this.server = channel.server();
    this.redirect = channel.redirect();
  }


  public Server server()
  {
    return(server);
  }

  public long start()
  {
    return(time);
  }

  public String path()
  {
    return(path);
  }

  public String method()
  {
    return(method);
  }

  public String version()
  {
    return(version);
  }

  public String remote()
  {
    return(remote);
  }

  public String header()
  {
    return(new String(request,0,header));
  }

  public byte[] page()
  {
    return(request);
  }

  public byte[] nvlbody()
  {
    byte[] body = body();
    if (body != null) return(body);
    else              return(new byte[0]);
  }

  public byte[] body()
  {
    if (body != null) return(body);
    int blen = request.length - this.header - 4;

    if (blen > 0)
    {
      this.body = new byte[blen];
      System.arraycopy(request,this.header+4,this.body,0,blen);
    }

    return(body);
  }

  public void setBody(String scrambled)
  {
    this.body = scrambled.getBytes();
  }

  public String getQuery(String qstr)
  {
    for(Pair<String,String> entry : query)
    {
      if (entry.getKey().equals(qstr))
        return(entry.getValue());
    }
    return(null);
  }

  public String getHeader(String header)
  {
    return(headers.get(header));
  }

  public String getCookie(String cookie)
  {
    return(cookies.get(cookie));
  }

  public boolean redirect()
  {
    return(redirect);
  }

  public void respond(byte[] data) throws Exception
  {
    channel.write(data);
  }

  public SelectionKey key()
  {
    return(key);
  }

  public void unlist()
  {
    waiter.unlist(key);
  }

  boolean done()
  {
    return(clength >= 0);
  }

  boolean cancelled()
  {
    return(System.currentTimeMillis() - touched > 30000);
  }


  public HTTPChannel channel()
  {
    return(channel);
  }


  void parse()
  {
    if (parsed) return;

    parsed = true;
    String header = new String(request,0,this.header);

    String[] lines = header.split(EOL);
    for (int i = 1; i < lines.length; i++)
    {
      int pos = lines[i].indexOf(':');
      if (pos <= 0) continue;

      String key = lines[i].substring(0,pos).trim();
      String val = lines[i].substring(pos+1).trim();

      this.headers.put(key,val);
    }

    int pos = this.path.indexOf('?');

    if (pos >= 0)
    {
      String query = this.path.substring(pos+1);
      this.path = this.path.substring(0,pos);
      String[] parts = query.split("&");

      for(String part : parts)
      {
        pos = part.indexOf('=');
        if (pos < 0) this.query.add(new Pair<String,String>(part,null));
        else this.query.add(new Pair<String,String>(part.substring(0,pos),part.substring(pos+1)));
      }
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

    remote = getClientIpAddr(this);
    if (remote == null) remote = host;
  }


  public boolean add(ByteBuffer buf) throws Exception
  {
    int read = buf.remaining();
    byte[] data = new byte[read]; buf.get(data);
    return(add(data,0,data.length));
  }


  public boolean add(byte[] data) throws Exception
  {
    return(add(data,0,data.length));
  }


  public boolean add(byte[] data, int pos, int len) throws Exception
  {
    time = System.nanoTime();
    int last = request.length;
    byte[] request = new byte[this.request.length+len];

    System.arraycopy(data,pos,request,last,len);
    System.arraycopy(this.request,0,request,0,this.request.length);

    this.request = request;

    if (request.length < 8)
      return(false);

    if (method == null)
      method = getMethod();

    if (method == null)
      return(false);

    if (header < 0)
    {
      if (method.equals("GET")) this.bckward(last);
      else                      this.forward(last);
    }

    if (header < 0)
      return(false);

    if (clength < 0)
    {
      path = getPath();
      version = getVersion();

      if (method.equals("GET"))
      {
        clength = 0;
      }
      else
      {
        parse();
        String cl = headers.get("Content-Length");

        if (cl == null) clength = 0;
        else clength = Integer.parseInt(cl);
      }
    }

    if (request.length > header + clength + 4)
      throw new Exception("Received multiple requests without client waiting for response");

    return(request.length == header + clength + 4);
  }


  private String getPath()
  {
    if (method == null)
      return(null);

    int b = method.length()+1;

    for (int i = b; i < request.length; i++)
    {
      if (request[i] == ' ')
      {
        String path = new String(request,b,i-b);

        if (path.length() > 1 && path.endsWith("/"))
          path = path.substring(0,path.length()-1);

        if (path.length() == 0)
          path = "/";

        return(path);
      }
    }

    return(null);
  }


  private String getMethod()
  {
    for (int i = 0; i < request.length; i++)
    {
      if (request[i] == ' ')
        return(new String(request,0,i));
    }

    return(null);
  }


  private String getVersion()
  {
    if (path == null)
      return(null);

    int e = 0;
    int b = 2 + method.length() + path.length();

    for (int h = b; h < request.length-1; h++)
    {
      if (request[h] == '\r' && request[h+1] == '\n')
      {
        e = h-1;

        for (int i = h-1; i > 0; i--)
        {
          if (request[i] == ' ')
          {
            b = i+1;
            break;
          }
        }

        // Skip HTTP/ (5 bytes)

        if (e-b-4 < b + 5) return(null);
        return(new String(request,b+5,e-b-4));
      }
    }

    return(null);
  }


  public static String getClientIpAddr(HTTPRequest request)
  {
    String ip = request.getHeader("X-Forwarded-For");

    if (ip == null || ip.length() == 0 || ip.equalsIgnoreCase("unknown"))
      ip = request.getHeader("Proxy-Client-IP");

    if (ip == null || ip.length() == 0 || ip.equalsIgnoreCase("unknown"))
      ip = request.getHeader("WL-Proxy-Client-IP");

    if (ip == null || ip.length() == 0 || ip.equalsIgnoreCase("unknown"))
      ip = request.getHeader("HTTP_X_FORWARDED_FOR");

    if (ip == null || ip.length() == 0 || ip.equalsIgnoreCase("unknown"))
      ip = request.getHeader("HTTP_X_FORWARDED");

    if (ip == null || ip.length() == 0 || ip.equalsIgnoreCase("unknown"))
      ip = request.getHeader("HTTP_X_CLUSTER_CLIENT_IP");

    if (ip == null || ip.length() == 0 || ip.equalsIgnoreCase("unknown"))
      ip = request.getHeader("HTTP_CLIENT_IP");

    if (ip == null || ip.length() == 0 || ip.equalsIgnoreCase("unknown"))
      ip = request.getHeader("HTTP_FORWARDED_FOR");

    if (ip == null || ip.length() == 0 || ip.equalsIgnoreCase("unknown"))
      ip = request.getHeader("HTTP_FORWARDED");

    if (ip == null || ip.length() == 0 || ip.equalsIgnoreCase("unknown"))
      ip = request.getHeader("HTTP_VIA");

    if (ip == null || ip.length() == 0 || ip.equalsIgnoreCase("unknown"))
      ip = request.getHeader("REMOTE_ADDR");

    if (ip == null || ip.length() == 0 || ip.equalsIgnoreCase("unknown"))
      ip = null;

    return(ip);
  }


  /**
   *
   * Returns the length of the header (pos+1)
   *
   */
  void forward(int last)
  {
    int start = 0;
    if (last > 3) start = last - 3;

    for (int h = start; h < request.length-3; h++)
    {
      if (request[h] == '\r' && request[h+1] == '\n' && request[h+2] == '\r' && request[h+3] == '\n')
      {
        header = h;
        return;
      }
    }
  }


  /**
   *
   * Returns the length of the header (pos+1)
   *
   */
  void bckward(int last)
  {
    for (int h = request.length-1; h >= 3 && h >= last-3; h--)
    {
      if (request[h-3] == '\r' && request[h-2] == '\n' && request[h-1] == '\r' && request[h] == '\n')
      {
        header = h - 3;
        return;
      }
    }
  }


  @Override
  public String toString()
  {
    return(new String(request));
  }


  public static class Pair<K,V>
  {
    private final K key;
    private final V value;


    public Pair(K key, V value)
    {
      this.key = key;
      this.value = value;
    }

    public K getKey()
    {
      return(key);
    }

    public V getValue()
    {
      return(value);
    }
  }
}