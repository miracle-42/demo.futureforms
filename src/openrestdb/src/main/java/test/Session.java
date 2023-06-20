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

package test;

import java.net.Socket;
import java.util.ArrayList;
import java.io.InputStream;
import java.io.OutputStream;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLContext;
import javax.net.ssl.X509TrustManager;
import database.rest.client.SocketReader;
import database.rest.security.FakeTrustManager;


public class Session
{
  private final int port;
  private final int psize;
  private final String host;
  private final Socket socket;


  public Session(String host, int port, boolean ssl) throws Exception
  {
    this.host = host;
    this.port = port;
    Socket socket = null;

    try
    {
      if (!ssl)
      {
        socket = new Socket(host,port);
      }
      else
      {
        SSLContext ctx = SSLContext.getInstance("TLS");
        ctx.init(null,new X509TrustManager[] {new FakeTrustManager()}, new java.security.SecureRandom());
        socket = ctx.getSocketFactory().createSocket(host,port);
        ((SSLSocket) socket).startHandshake();
      }

      socket.setSoTimeout(30000);
      socket.getOutputStream().flush();
    }
    catch (Exception e)
    {
      e.printStackTrace();
      System.exit(-1);
    }

    this.socket = socket;
    this.psize = socket.getSendBufferSize();
  }


  public void invoke(String url, String message) throws Exception
  {
    HTTPRequest request = new HTTPRequest(host,url);
    request.setBody(message);

    InputStream in = socket.getInputStream();
    OutputStream out = socket.getOutputStream();
    SocketReader reader = new SocketReader(in);

    int w = 0;
    byte[] page = request.page();

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
    for(String header : headers)
    {
      if (header.startsWith("Content-Length"))
        cl = Integer.parseInt(header.split(":")[1].trim());
    }

    String response = null;
    if (cl > 0) response = new String(reader.getContent(cl));
  }


  public void close()
  {
    try {socket.close();}
    catch (Exception e) {;}
  }
}