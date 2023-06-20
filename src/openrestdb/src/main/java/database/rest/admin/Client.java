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

package database.rest.admin;

import java.net.Socket;
import java.util.ArrayList;
import java.io.InputStream;
import java.io.OutputStream;
import javax.net.ssl.SSLSocket;
import database.rest.client.HTTPRequest;
import database.rest.client.SocketReader;
import database.rest.security.PKIContext;


public class Client
{
  private Socket socket;
  private final int port;
  private final String host;
  private final boolean ssl;

  private static int psize;
  private static int timeout;
  private static PKIContext pki;

  public static void setConfig(PKIContext pki, int psize, int timeout)
  {
    Client.pki = pki;
    Client.psize = psize;
    Client.timeout = timeout;
  }


  public Client(String host, int port, boolean ssl) throws Exception
  {
    this.ssl  = ssl;
    this.host = host;
    this.port = port;
  }


  public byte[] send(String cmd) throws Exception
  {
    return(send(cmd,null));
  }


  public byte[] send(String cmd, String message) throws Exception
  {
    HTTPRequest request = new HTTPRequest(host,"/"+cmd);
    request.setBody(message);

    InputStream in = socket.getInputStream();
    OutputStream out = socket.getOutputStream();
    SocketReader reader = new SocketReader(in);

    byte[] page = request.page();

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
    if (!ssl)
    {
      this.socket = new Socket(host,port);
    }
    else
    {
      this.socket = pki.getSSLContext().getSocketFactory().createSocket(host,port);
      ((SSLSocket) socket).startHandshake();
    }

    this.socket.setSoTimeout(timeout);
    this.socket.getOutputStream().flush();
  }
}