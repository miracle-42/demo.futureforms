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

import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.Iterator;
import java.util.ArrayList;
import java.nio.ByteBuffer;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.nio.channels.Selector;
import database.rest.config.Config;
import database.rest.servers.Server;
import database.rest.pools.ThreadPool;
import java.nio.channels.SelectionKey;
import java.nio.channels.SocketChannel;
import java.util.concurrent.ConcurrentHashMap;


class HTTPWaiter extends Thread
{
  private final int timeout;
  private final Server server;
  private final Config config;
  private final Selector selector;
  private final ThreadPool workers;

  private final ArrayList<HTTPChannel> queue =
    new ArrayList<HTTPChannel>();

  private final HashSet<HTTPChannel> connected =
    new HashSet<HTTPChannel>();

  private final ConcurrentHashMap<SelectionKey,HTTPRequest> incomplete =
    new ConcurrentHashMap<SelectionKey,HTTPRequest>();

  private final static Logger logger = Logger.getLogger("http");


  HTTPWaiter(Server server, int id, boolean embedded) throws Exception
  {
    this.server = server;
    this.config = server.config();
    this.selector = Selector.open();
    this.timeout = config.getHTTP().timeout;

    this.setDaemon(true);
    this.setName("HTTPWaiter("+id+")");
    this.workers = new ThreadPool(config.getTopology().workers);

    this.start();
  }


  Server server()
  {
    return(server);
  }


  void unlist(SelectionKey key)
  {
    key.cancel();
  }


  void addClient(HTTPChannel client) throws Exception
  {
    synchronized(this)
    {queue.add(client);}
    selector.wakeup();
  }


  private void select() throws Exception
  {
    int ready = 0;

    while(ready == 0)
    {
      boolean add = false;

      synchronized(this)
      {
        for(HTTPChannel client : queue)
        {
          add = true;
          connected.add(client);

          try
          {
            if (client.channel().isOpen())
              client.channel().register(selector,SelectionKey.OP_READ,client);
          }
          catch (Exception e)
          {
            e.printStackTrace();
            connected.remove(client);
          }
        }

        queue.clear();
      }

      if (add) Thread.yield();
      ready = selector.select();
    }
  }


  @Override
  public void run()
  {
    long lmsg = System.currentTimeMillis();

    while(true)
    {
      try
      {
        select();

        Set<SelectionKey> selected = selector.selectedKeys();
        Iterator<SelectionKey> iterator = selected.iterator();

        if (workers.full() && (System.currentTimeMillis() - lmsg) > 5000)
        {
          lmsg = System.currentTimeMillis();
          logger.info("clients="+selector.keys().size()+" threads="+workers.threads()+" queue="+workers.size());
        }

        while(iterator.hasNext())
        {
          SelectionKey key = iterator.next();
          iterator.remove();

          if (key.isReadable() && key.isValid())
          {
            HTTPChannel client = (HTTPChannel) key.attachment();
            SocketChannel channel = (SocketChannel) key.channel();

            ByteBuffer buf = client.read();

            if (buf == null)
            {
              if (client.attempts() > 8)
              {
                key.cancel();
                channel.close();
              }

              continue;
            }

            int read = buf.remaining();

            if (read > 0)
            {
              boolean done = false;
              HTTPRequest request = incomplete.remove(key);
              if (request == null) request = new HTTPRequest(this,client,key);

              try
              {
                if (!request.add(buf)) incomplete.put(key,request);
                else done = true;
              }
              catch (Exception e)
              {
                logger.log(Level.SEVERE,e.getMessage(),e);
                error(channel,400,false);
                continue;
              }

              try
              {
                logger.finest("Request "+request.path()+" submit "+done);
                if (done) workers.submit(new HTTPWorker(workers,request));
              }
              catch (Exception e)
              {
                logger.log(Level.SEVERE,e.getMessage(),e);
                error(channel,500,false);
                continue;
              }
            }
          }
          else
          {
            logger.warning("Key is not readable");
          }
        }
      }
      catch (Exception e)
      {
        logger.log(Level.SEVERE,e.getMessage(),e);
      }
    }
  }


  void cleanout()
  {
    ArrayList<SelectionKey> cancelled = new ArrayList<SelectionKey>();

    for(Map.Entry<SelectionKey,HTTPRequest> entry : incomplete.entrySet())
      if (entry.getValue().cancelled()) cancelled.add(entry.getKey());

    for(SelectionKey key : cancelled)
    {
      incomplete.remove(key);
      logger.info("Removing incomplete request");

      try
      {
        ByteBuffer buf = ByteBuffer.allocate(1024);
        SocketChannel rsp = (SocketChannel) key.channel();
        buf.put(err400(false));
        buf.position(0);
        rsp.write(buf);
        rsp.close();
      }
      catch (Exception e) {;}
    }

    long now = System.currentTimeMillis();
    HTTPChannel[] open = connected.toArray(new HTTPChannel[0]);

    for(HTTPChannel client : open)
    {
      boolean timedout = now - client.touched() > timeout;
      boolean connected = client.channel().isConnected() || client.channel().isOpen();

      if (!connected || (timedout && !client.stayalive()))
      {
        this.connected.remove(client);
        if (timedout) logger.fine("Client KeepAlive timed out");

        if (connected && !client.ssl())
        {
          try {client.channel().close();}
          catch(Exception e) {;}
        }
      }
    }
  }


  public static final String EOL = "\r\n";


  public static void error(SocketChannel channel, int code, boolean rest)
  {
    ByteBuffer buf = ByteBuffer.allocate(1024);

    switch(code)
    {
      case 400:
        buf.put(err400(rest));
        break;

      case 500:
        buf.put(err500(rest));
        break;

      default:
        buf.put(err500(rest));
        break;
    }

    try
    {
      buf.position(0);
      channel.write(buf);
      channel.close();
    }
    catch (Exception e)
    {
      try {channel.close();}
      catch (Exception c) {;}
    }
  }


  public static byte[] err400(boolean rest)
  {
    String msg = "<b>Bad Request</b>";
    if (rest) msg = "{\"status\": \"failed\", \"message\": \"Bad Request\"}";

    String page = "HTTP/1.1 400 Bad Request" + EOL +
                  "Content-Type: text/html" + EOL +
                  "Content-Length: "+msg.length() + EOL + EOL + msg;

    return(page.getBytes());
  }


  public static byte[] err500(boolean rest)
  {
    String msg = "<b>Internal Server Error</b>";
    if (rest) msg = "{\"status\": \"failed\", \"message\": \"Internal Server Error\"}";

    String page = "HTTP/1.1 500 Internal Server Error" + EOL +
                  "Content-Type: text/html" + EOL +
                  "Content-Length: "+msg.length() + EOL + EOL + msg;

    return(page.getBytes());
  }
}