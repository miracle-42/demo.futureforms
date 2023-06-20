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

import java.io.InputStream;
import java.util.ArrayList;
import java.io.ByteArrayOutputStream;


public class SocketReader
{
  private int pos = 0;
  private int size = 0;
  private final InputStream in;
  private final static int MAX = 8192;
  private final byte[] buffer = new byte[MAX];


  public SocketReader(InputStream in)
  {
    this.in = in;
  }


  public ArrayList<String> getHeader() throws Exception
  {
    int i = 0;
    int match = 0;
    int start = 0;
    byte[] buf = new byte[MAX];
    ArrayList<String> lines = new ArrayList<String>();

    while(match < 4 && i < MAX)
    {
      buf[i] = read();
      boolean use = false;

      if ((match == 0 || match == 2) && buf[i] == 13) use = true;
      if ((match == 1 || match == 3) && buf[i] == 10) use = true;

      if (use) match++;
      else
      {
        match = 0;
        if (buf[i] == 10) match++;
      }

      if (match == 2)
      {
        String line = new String(buf,start,i-start-1);
        lines.add(line);
        start = i+1;
      }

      i++;
    }

    byte[] header = new byte[i-4];
    System.arraycopy(buf,0,header,0,header.length);

    return(lines);
  }


  public byte[] getContent(int bytes) throws Exception
  {
    int pos = 0;
    byte[] body = new byte[bytes];

    while(pos < body.length)
    {
      int avail = this.size-this.pos;
      int amount = body.length - pos;
      if (avail < amount) amount = avail;

      if (amount == 0)
      {
        this.pos = 0;
        this.size = in.read(buffer);
        continue;
      }

      System.arraycopy(this.buffer,this.pos,body,pos,amount);

      pos += amount;
      this.pos += amount;
    }

    return(body);
  }


  public byte[] getChunkedContent() throws Exception
  {
    int csize = 0;
    ByteArrayOutputStream out = new ByteArrayOutputStream();

    while(true)
    {
      byte[] bx = readline(true);
      String hex = new String(bx);
      csize = Integer.parseInt(hex,16);

      if (csize == 0) break;

      byte[] chunk = getContent(csize+2);
      out.write(chunk,0,csize);
    }

    return(out.toByteArray());
  }

  public byte[] readline(boolean strip) throws Exception
  {
    int match = 0;
    boolean use = false;
    ByteArrayOutputStream out = new ByteArrayOutputStream();

    while(match < 2)
    {
      byte b = read();

      if (b == 13 && match == 0) use = true;
      if (b == 10 && match == 1) use = true;

      if (use) match++;
      else
      {
        match = 0;
        if (b == 10) match++;
      }

      out.write(b);
    }

    byte[] line = out.toByteArray();

    if (strip)
    {
      byte[] stripped = new byte[line.length-2];
      System.arraycopy(line,0,stripped,0,stripped.length);
      line = stripped;
    }

    return(line);
  }


  private byte read() throws Exception
  {
    if (pos < size) return(buffer[pos++]);

    pos = 0;
    size = in.read(buffer);

    if (size == -1)
      throw new Exception("Socket closed");

    return(read());
  }
}