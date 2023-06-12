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

import java.nio.ByteBuffer;


class HTTPBuffers
{
  ByteBuffer send;
  ByteBuffer data;
  ByteBuffer recv;
  ByteBuffer sslb;

  private final int size;
  private final int asize;
  private final int psize;
  private final boolean ssl;

  private static int SIZE = 4*1024;


  public static void setSize(int size)
  {
    SIZE = size;
  }


  public HTTPBuffers()
  {
    this.asize = 0;
    this.psize = 0;
    this.size = SIZE;
    this.ssl = false;
  }


  public HTTPBuffers(int asize, int psize)
  {
    this.ssl = true;
    this.size = SIZE;
    this.asize = asize;
    this.psize = psize;
  }


  public int size()
  {
    return(size);
  }


  public void alloc(boolean free) throws Exception
  {
    if (free) done();
    alloc();
  }


  public void alloc() throws Exception
  {
    this.data = ByteBuffer.allocateDirect(size);
    if (ssl) this.sslb = ByteBuffer.allocateDirect(psize);

    if (data == null || (ssl & sslb == null))
      throw new Exception("Unable to allocate ByteBuffer");
  }


  public void handshake() throws Exception
  {
    this.data = ByteBuffer.allocateDirect(asize);
    this.send = ByteBuffer.allocateDirect(psize);
    this.recv = ByteBuffer.allocateDirect(psize);

    if (data == null || send == null || recv == null)
      throw new Exception("Unable to allocate ByteBuffer");
  }


  public ByteBuffer done()
  {
    ByteBuffer data = this.data;

    this.data = null;
    this.sslb = null;
    this.send = null;
    this.recv = null;

    return(data);
  }
}