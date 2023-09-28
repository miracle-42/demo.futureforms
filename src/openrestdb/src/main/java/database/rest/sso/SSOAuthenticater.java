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

package database.rest.sso;

import database.rest.admin.Client;
import database.rest.config.SSOConfig;


public class SSOAuthenticater
{
  private final Client client;

  public static void main(String[] args) throws Exception
  {
    if (args.length != 2)
    {
      System.out.println("Usage: server:port username");
      System.exit(-1);
    }

    SSOAuthenticater auth = new SSOAuthenticater(args[0]);
    System.out.println(auth.authenticate(args[1]));
  }


  public SSOAuthenticater(String url) throws Exception
  {
    SSOConfig config = new SSOConfig();
    Client.setConfig(config.pkictx,1024,20000);

    if (url.startsWith("http://"))
      url = url.substring(7);

    if (url.startsWith("https://"))
      url = url.substring(8);

    int pos = url.indexOf(':') + 1;
    if (pos < 0) throw new Exception("Server must include port [localhost:443]");

    String host = url.substring(0,pos-1);
    int port = Integer.parseInt(url.substring(pos));

    this.client = new Client(host,port,true);
    this.client.connect();
  }


  public String authenticate(String username) throws Exception
  {
    byte[] response = client.send("authenticate",username);
    return(new String(response));
  }
}