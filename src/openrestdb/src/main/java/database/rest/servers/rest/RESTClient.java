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

import java.util.ArrayList;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.logging.Logger;
import database.rest.config.Config;
import database.rest.servers.Server;
import database.rest.cluster.MailBox;
import database.rest.servers.http.HTTPChannel;
import java.util.concurrent.ConcurrentHashMap;


public class RESTClient implements RESTConnection
{
  private final short id;
  private final long started;

  private RESTWriter writer;
  private RESTReader reader;
  private HTTPChannel rchannel;
  private HTTPChannel wchannel;
  private volatile boolean up = false;

  private final Config config;
  private final Server server;
  private final MailBox mailbox;
  private final ConcurrentHashMap<Long,RESTComm> incoming;

  private final static Logger logger = Logger.getLogger("http");



  public RESTClient(Server server, short id, long started) throws Exception
  {
    this.id = id;
    this.started = started;

    this.server = server;
    this.config = server.config();
    this.mailbox = new MailBox(config,id);
    this.incoming = new ConcurrentHashMap<Long,RESTComm>();
  }


  public void init(HTTPChannel channel) throws Exception
  {
    for (int i = 0; i < 8; i++)
    {
      Thread.sleep(25);
      channel.socket().getOutputStream().flush();
      //Make absolute sure response is flushed
    }

    channel.configureBlocking(true);

    if (this.wchannel == null) this.wchannel = channel;
    else                       this.rchannel = channel;

    if (this.wchannel != null && this.rchannel != null)
    {
      this.writer = new RESTWriter(this);
      this.reader = new RESTReader(this);

      this.up = true;
      this.writer.start();
      this.reader.start();

      logger.info("External RESTEngine ready");
    }
  }


  public byte[] send(String host, byte[] data) throws Exception
  {
    long id = thread();
    int extend = mailbox.write(id,data);
    writer.write(new RESTComm(id,extend,host.getBytes(),data));

    RESTComm resp = null;

    synchronized(this)
    {
      while(true)
      {
        resp = incoming.get(id);

        if (resp != null) break;
        if (!up) throw new Exception("Lost connection to RESTServer");

        this.wait();
      }
    }

    if (resp.extend() < 0) data = resp.page();
    else data = mailbox.read(extend,resp.size);

    if (extend >= 0) mailbox.clear(extend);
    return(data);
  }


  private long thread()
  {
    return(Thread.currentThread().getId());
  }


  public short id()
  {
    return(id);
  }


  public long started()
  {
    return(started);
  }


  public boolean connected()
  {
    if (rchannel == null) return(false);
    if (wchannel == null) return(false);
    return(rchannel.connected());
  }


  public boolean up()
  {
    return(up);
  }


  @Override
  public String parent()
  {
    return("RESTClient");
  }


  @Override
  public void failed()
  {
    this.up = false;
    server.deregister(this);
    logger.severe("RESTClient failed, bailing out");
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
    logger.fine("Client Received "+calls.size()+" response(s)");
    for(RESTComm call : calls) incoming.put(call.id,call);
    synchronized(this) {this.notifyAll();}
  }
}