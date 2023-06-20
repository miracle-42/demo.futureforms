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

import java.net.Socket;
import java.util.ArrayList;
import java.io.InputStream;
import java.io.OutputStream;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLContext;


public class HTTPClient
{
  private int psize;
  private Socket socket;
  private final int port;
  private final String host;
  private final SSLContext ctx;


  public HTTPClient(String host, int port, SSLContext ctx)
  {
    this.ctx = ctx;
    this.host = host;
    this.port = port;
  }


  public byte[] send(byte[] page) throws Exception
  {
    InputStream in = socket.getInputStream();
    OutputStream out = socket.getOutputStream();
    SocketReader reader = new SocketReader(in);

    int w = 0;
    while(w < page.length)
    {
      int size = psize;

      if (size > page.length - w)
        size = page.length - w;

      byte[] chunk = new byte[size];
      System.arraycopy(page,w,chunk,0,size);

      w += size;
      out.write(chunk);
      out.flush();
    }

    ArrayList<String> headers = reader.getHeader();

    int cl = 0;
    boolean chunked = false;

    for(String header : headers)
    {
      if (header.startsWith("Content-Length"))
        cl = Integer.parseInt(header.split(":")[1].trim());

      if (header.startsWith("Transfer-Encoding") && header.contains("chunked"))
        chunked = true;
    }

    byte[] response = null;

    if (cl > 0) response = reader.getContent(cl);
    else if (chunked) response = reader.getChunkedContent();

    return(response);
  }


  public void connect() throws Exception
  {
    if (ctx == null)
    {
      this.socket = new Socket(host,port);
    }
    else
    {
      this.socket = ctx.getSocketFactory().createSocket(host,port);
      ((SSLSocket) socket).startHandshake();
    }

    this.socket.setSoTimeout(15000);
    this.socket.getOutputStream().flush();
  }
}