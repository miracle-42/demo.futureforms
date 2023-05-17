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


public class HTTPRequest
{
  private String body;
  private final String host;
  private final String path;
  private static final String nl = "\r\n";


  public HTTPRequest(String host, String path)
  {
    this.host = host;
    this.path = path;
  }


  public void setBody(String body)
  {
    this.body = body;
  }


  public byte[] page()
  {
    String header = (body == null) ? "GET " : "POST ";

    header += path + " HTTP/1.1"+nl;
    header += "Host: "+host+nl;
    header += "Connection: Keep-Alive" + nl;

    byte[] body = this.body == null ? null : this.body.getBytes();
    if (body != null) header += "Content-Length: "+body.length+nl;

    header += nl;
    byte[] head = header.getBytes();

    if (body == null) return(head);

    byte[] page = new byte[head.length + body.length];

    System.arraycopy(head,0,page,0,head.length);
    System.arraycopy(body,0,page,head.length,body.length);

    return(page);
  }
}