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

import java.util.logging.Level;
import java.util.logging.Logger;
import database.rest.servers.Server;
import database.rest.pools.ThreadPool;
import java.nio.channels.SelectionKey;
import java.nio.channels.SocketChannel;


class SSLHandshake extends Thread
{
  private final Logger logger;
  private final boolean admin;
  private final HTTPServer httpserv;
  private final SocketChannel channel;


  SSLHandshake(HTTPServer httpserv, SelectionKey key, SocketChannel channel, boolean admin) throws Exception
  {
    this.admin = admin;
    this.channel = channel;
    this.httpserv = httpserv;
    this.logger = httpserv.logger();
  }


  @Override
  public void run()
  {
    try
    {
      Server server = httpserv.server();
      ThreadPool workers = httpserv.workers();
      HTTPChannel client = new HTTPChannel(server,workers,channel,true,admin);

      if (client.accept())
        httpserv.assign(client);

      httpserv.workers().done();
    }
    catch (Exception e)
    {
      httpserv.workers().done();
      logger.log(Level.SEVERE,e.getMessage(),e);
    }
  }
}