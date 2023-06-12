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

import java.io.InputStream;


public class SocketReader
{
  private int pos = 0;
  private int size = 0;
  private long total = 0;
  private final InputStream in;
  private final static int MAX = 8192;
  private final byte[] buffer = new byte[MAX];


  public SocketReader(InputStream in)
  {
    this.in = in;
  }


  public boolean empty()
  {
    return(pos >= size);
  }


  public long bytes()
  {
    return(total);
  }


  public byte read() throws Exception
  {
    if (this.pos < this.size)
      return(this.buffer[pos++]);

    this.pos = 0;
    this.size = in.read(buffer);
    if (size > 0) this.total += this.size;

    if (this.size == -1)
      throw new Exception("Socket closed");

    return(read());
  }


  public byte[] read(int size) throws Exception
  {
    int pos = 0;
    byte[] data = new byte[size];
    int available = this.size - this.pos;

    while(true)
    {
      if (available > 0)
      {
        if (available > size - pos)
          available = size - pos;

        System.arraycopy(this.buffer,this.pos,data,pos,available);

        pos += available;
        this.pos += available;
      }

      if (pos == size)
        break;

      this.pos = 0;
      this.size = in.read(buffer);
      if (size > 0) this.total += this.size;
      available = this.size - this.pos;

      if (this.size == -1)
        throw new Exception("Socket closed");
    }

    return(data);
  }
}