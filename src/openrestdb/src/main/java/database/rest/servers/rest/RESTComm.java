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

package database.rest.servers.rest;

import java.nio.ByteBuffer;


class RESTComm
{
  final long  id;
  final int   size;
  final short hsize;
  final int   extend;

  byte[] http;
  byte[] page;
  byte[] host;
  byte[] header;

  public final static int HEADER = 18;
  private final ByteBuffer buffer = ByteBuffer.allocate(HEADER);


  RESTComm(long id, int extend, byte[] host, byte[] page)
  {
    this.id = id;
    this.host = host;
    this.page = page;
    this.extend = extend;
    this.size = page.length;
    this.hsize = (short) host.length;

    buffer.putLong(id);
    buffer.putInt(extend);
    buffer.putShort(hsize);
    buffer.putInt(size);

    this.header = buffer.array();

    if (extend >= 0)
    {
      http = new byte[HEADER + hsize];
      System.arraycopy(header,0,http,0,HEADER);
      System.arraycopy(host,0,http,HEADER,hsize);
    }
    else
    {
      http = new byte[HEADER + hsize + size];
      System.arraycopy(header,0,http,0,HEADER);
      System.arraycopy(host,0,http,HEADER,hsize);
      System.arraycopy(page,0,http,HEADER+hsize,size);
    }
  }


  RESTComm(byte[] head)
  {
    buffer.put(head);
    buffer.flip();

    this.id     = buffer.getLong();
    this.extend = buffer.getInt();
    this.hsize  = buffer.getShort();
    this.size   = buffer.getInt();

    this.http = null;
    this.page = null;
    this.header = head;
  }


  long id()
  {
    return(id);
  }


  byte[] host()
  {
    return(host);
  }


  int hsize()
  {
    return(hsize);
  }


  void setHost(byte[] host)
  {
    this.host = host;
  }


  int need()
  {
    if (extend < 0) return(size);
    return(0);
  }


  void add(byte[] data)
  {
    this.page = data;
  }


  void set(byte[] data)
  {
    this.page = data;
  }


  int extend()
  {
    return(extend);
  }


  byte[] bytes()
  {
    if (http == null)
    {
      if (extend >= 0)
      {
        http = new byte[HEADER + hsize];
        System.arraycopy(header,0,http,0,HEADER);
        System.arraycopy(host,0,http,HEADER,hsize);
      }
      else
      {
        http = new byte[HEADER + hsize + size];
        System.arraycopy(header,0,http,0,HEADER);
        System.arraycopy(host,0,http,HEADER,hsize);
        System.arraycopy(page,0,http,HEADER+hsize,size);
      }
    }

    return(http);
  }


  byte[] page()
  {
    return(page);
  }


  @Override
  public String toString()
  {
    if (page == null) return("id="+id+" extend="+extend+" size="+size);
    return("id="+id+" extend="+extend+" size="+size+System.lineSeparator()+"<"+new String(page)+">"+System.lineSeparator());
  }
}