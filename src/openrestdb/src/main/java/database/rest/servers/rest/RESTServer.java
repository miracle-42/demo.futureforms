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

import java.util.Arrays;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.logging.Level;
import java.util.logging.Logger;
import database.rest.config.Config;
import database.rest.servers.Server;
import database.rest.cluster.MailBox;
import database.rest.pools.ThreadPool;
import java.nio.channels.SocketChannel;
import database.rest.client.HTTPRequest;
import database.rest.client.HTTPResponse;
import database.rest.servers.http.HTTPChannel;
import java.nio.channels.ClosedChannelException;


public class RESTServer implements RESTConnection
{
  private RESTReader reader = null;
  private RESTWriter writer = null;
  private HTTPChannel rchannel = null;
  private HTTPChannel wchannel = null;
  private volatile byte[] httpid = null;

  private ByteBuffer buffer = ByteBuffer.allocate(10);

  private final int port;
  private final short rid;
  private final Server server;
  private final Config config;
  private final MailBox mailbox;
  private final ThreadPool workers;

  private final static Logger logger = Logger.getLogger("rest");


  public RESTServer(Server server) throws Exception
  {
    this.server = server;
    this.config = server.config();
    this.mailbox = new MailBox(config,server.id());

    logger.info("RESTServer starting ...");

    int http = 1;
    this.port = config.getPorts().admin;
    if (config.getTopology().hot) http++;

    this.rid = (short) (server.id() - http);
    this.workers = new ThreadPool(config.getTopology().workers);

    serve();
  }


  public void respond(RESTComm response)
  {
    if (response.extend >= 0)
    {
      byte[] data = response.page();

      if (mailbox.fits(data))
      {
        response.set(null);
        mailbox.write(response.extend(),data);
      }
      else
      {
        long id = response.id();
        response = new RESTComm(id,-1,response.host,data);
      }
    }

    writer.write(response);
  }


  public Server server()
  {
    return(server);
  }


  public Config config()
  {
    return(config);
  }


  public boolean connected()
  {
    if (rchannel == null) return(false);
    if (wchannel == null) return(false);
    return(rchannel.connected());
  }


  private void serve()
  {
    int tries = 0;

    if (reader == null) logger.info("RESTServer connecting ...");
    else                logger.info("RESTServer reconnecting ...");

    while(!connect())
    {
      if (++tries > 256)
      {
        logger.severe("Unable to connect to HTTPServer, bailing out");
        server.shutdown(false);
        System.exit(-1);
      }

      if (tries % 16 == 0)
        logger.info("Unable to connect to HTTPServer");

      try {Thread.sleep(250);}
      catch (Exception e) {logger.log(Level.SEVERE,e.getMessage(),e);}
    }

    try
    {
      reader = new RESTReader(this);
      writer = new RESTWriter(this);

      reader.start();
      writer.start();
    }
    catch (Exception e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);
      logger.severe("Unable to start RESTServer, bailing out");
      System.exit(-1);
    }
  }


  private boolean connect()
  {
    try
    {
      SocketChannel rchannel = SocketChannel.open();
      this.rchannel = new HTTPChannel(server,rchannel,true);

      SocketChannel wchannel = SocketChannel.open();
      this.wchannel = new HTTPChannel(server,wchannel,true);
    }
    catch (Exception e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);
      logger.severe("Unable to start RESTServer, bailing out");
      System.exit(-1);
    }

    if (!connect(this.rchannel))
      return(false);

    byte[] readsig = this.httpid;
    // Make sure HTTPServer has not switched

    if (!connect(this.wchannel))
    {
      try {this.rchannel.close();}
      catch (Exception e) {;}

      return(false);
    }

    if (!Arrays.equals(readsig,this.httpid))
    {
      try {this.rchannel.close();}
      catch (Exception e) {;}

      try {this.wchannel.close();}
      catch (Exception e) {;}

      return(false);
    }

    logger.info("Connected to HTTPServer");
    return(true);
  }


  private boolean connect(HTTPChannel channel)
  {
    try
    {
      channel.configureBlocking(false);

      channel.connect(port);
      channel.configureBlocking(true);
      channel.socket().setSoTimeout(2000);

      HTTPRequest request = new HTTPRequest("localhost","/connect");
      request.setBody(server.id()+" "+server.started());

      logger.finest("Sending connect request to HTTPServer");
      channel.write(request.page());
      channel.socket().getOutputStream().flush();


      HTTPResponse response = new HTTPResponse();

      logger.finest("Waiting for response from HTTPServer");
      while(!response.finished())
      {
        ByteBuffer buf = channel.read();

        if (buf == null)
        {
          logger.warning("Missing reply from HTTPServer");
          return(false);
        }

        response.add(buf);
      }

      channel.socket().setSoTimeout(0);
      String[] args = new String(response.getBody()).split(" ");

      short id = Short.parseShort(args[0]);
      long started = Long.parseLong(args[1]);
      byte[] signature = signature(id,started);
      if (this.httpid == null) this.httpid = signature;

      if (!Arrays.equals(signature,this.httpid))
          logger.info("HTTPServer restarted or switched");

      this.httpid = signature;
    }
    catch (Exception e)
    {
      boolean skip = false;
      String message = e.getMessage();
      if (message == null) message = "Unknown error";

      if (e instanceof ClosedChannelException) skip = true;
      if (message.equals("Connection refused")) skip = true;

      if (!skip) logger.log(Level.WARNING,e.getMessage(),e);
      return(false);
    }

    return(true);
  }


  private byte[] signature(Short id, long started)
  {
    buffer.clear();
    buffer.putShort(id);
    buffer.putLong(started);
    byte[] signature = new byte[10];
    System.arraycopy(buffer.array(),0,signature,0,10);
    return(signature);
  }


  @Override
  public String parent()
  {
    return("RESTServer");
  }


  @Override
  public void failed()
  {
    logger.severe("RESTServer failed, reconnect");
    serve();
  }


  @Override
  public Logger logger()
  {
    return(logger);
  }


  @Override
  public InputStream reader() throws Exception
  {
    return(rchannel.socket().getInputStream());
  }


  @Override
  public OutputStream writer() throws Exception
  {
    return(wchannel.socket().getOutputStream());
  }


  @Override
  public void received(ArrayList<RESTComm> calls)
  {
    for(RESTComm http : calls)
    {
      byte[] page = http.page();

      if (http.extend >= 0)
      {
        page = mailbox.read(http.extend,http.size);
        http.add(page);
      }

      workers.submit(new RESTWorker(this,workers,http));
    }
  }
}