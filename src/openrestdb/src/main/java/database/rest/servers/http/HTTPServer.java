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

import java.util.Set;
import java.util.Iterator;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.net.InetSocketAddress;
import java.nio.channels.Selector;
import database.rest.config.Config;
import database.rest.servers.Server;
import database.rest.pools.ThreadPool;
import java.nio.channels.SelectionKey;
import java.nio.channels.SocketChannel;
import java.nio.channels.ServerSocketChannel;
import database.rest.handlers.file.Deployment;


public class HTTPServer extends Thread
{
  private final int port;
  private final int timeout;
  private final boolean ssl;
  private final Server server;
  private final Config config;
  private final boolean admin;
  private final boolean embedded;
  private final Selector selector;
  private final ThreadPool workers;
  private final HTTPServerType type;
  private final HTTPWaiterPool waiters;

  private int state = READY;
  public final static int READY     = 0;
  public final static int DISABLED  = 1;
  public final static int RUNNING   = 2;
  public final static int STOPPED   = 3;

  private final static Logger logger = Logger.getLogger("http");


  public HTTPServer(Server server, HTTPServerType type, boolean embedded) throws Exception
  {
    this.type = type;
    this.server = server;
    this.embedded = embedded;
    this.config = server.config();
    this.selector = Selector.open();
    this.timeout = config.getHTTP().timeout;

    config.getPKIContext(); // Initialize ssl
    HTTPBuffers.setSize(config.getHTTP().bufsize);

    switch(type)
    {
      case ssl    : this.port = config.getPorts().ssl;   ssl = true;  admin = false; break;
      case plain  : this.port = config.getPorts().plain; ssl = false; admin = false; break;
      case admin  : this.port = config.getPorts().admin; ssl = true;  admin = true;  break;
      default: port = -1; ssl = false; admin = false;
    }

    this.setDaemon(true);
    this.setName("HTTPServer("+type+")");
    this.workers = new ThreadPool(config.getTopology().workers);
    this.waiters = new HTTPWaiterPool(server,embedded,config.getTopology().waiters);

    HTTPReaper.start(logger,waiters,timeout);
  }


  public int state()
  {
    return(state);
  }


  public int port()
  {
    return(port);
  }


  Server server()
  {
    return(server);
  }


  Logger logger()
  {
    return(logger);
  }


  Config config()
  {
    return(config);
  }


  boolean admin()
  {
    return(type == HTTPServerType.admin);
  }


  boolean embedded()
  {
    return(embedded);
  }


  ThreadPool workers()
  {
    return(workers);
  }


  // Assign a waiter for the client
  void assign(HTTPChannel client)
  {
    try {waiters.getWaiter().addClient(client);}
    catch (Exception e) {logger.log(Level.SEVERE,e.getMessage(),e);}
  }


  private void select() throws Exception
  {
    while(selector.select() == 0)
      logger.warning("selector woke up empty handed");
  }


  public void run()
  {
    if (port <= 0)
    {
      state = DISABLED;
      return;
    }

    logger.info("Starting HTTPServer("+type+":"+port+")");

    try
    {
      Deployment.get().deploy();
      ServerSocketChannel server = ServerSocketChannel.open();

      server.configureBlocking(false);
      server.bind(new InetSocketAddress(port));
      server.register(selector,SelectionKey.OP_ACCEPT);

      state = RUNNING;

      while(true)
      {
        try
        {
          select();

          Set<SelectionKey> selected = selector.selectedKeys();
          Iterator<SelectionKey> iterator = selected.iterator();

          while(iterator.hasNext())
          {
            SelectionKey key = iterator.next();
            iterator.remove();

            if (key.isAcceptable())
            {
              SocketChannel channel = server.accept();
              logger.finest("Incoming request "+channel.getRemoteAddress());

              channel.configureBlocking(false);

              if (ssl)
              {
                // Don't block while handshaking
                SSLHandshake ses = new SSLHandshake(this,key,channel,admin);
                workers.submit(ses);
              }
              else
              {
                // Overkill to use threadpool
                HTTPChannel client = new HTTPChannel(this.server,workers,channel,ssl,admin);
                if (client.accept()) this.assign(client);
              }
            }
            else
            {
              logger.warning("Key is not acceptable");
            }
          }
        }
        catch (Exception e)
        {
          logger.log(Level.SEVERE,e.getMessage(),e);
        }
      }
    }
    catch (Exception e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);
    }

    state = STOPPED;
    logger.info("HTTPServer("+type+") stopped");

    try
    {
      if (!this.server.config().getTopology().hot)
        System.exit(0);
    }
    catch (Exception e) {;}
  }
}