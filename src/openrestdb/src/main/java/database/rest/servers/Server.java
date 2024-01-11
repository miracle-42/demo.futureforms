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

package database.rest.servers;

import java.util.Date;
import java.io.PrintStream;
import java.util.ArrayList;
import java.util.Collections;
import java.net.ServerSocket;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.io.FileOutputStream;
import database.rest.config.Config;
import java.io.BufferedOutputStream;
import database.rest.cluster.Cluster;
import database.rest.control.Process;
import database.rest.pools.ThreadPool;
import database.rest.cluster.Statistics;
import database.rest.cluster.PreAuthTable;
import database.rest.database.PoolManager;
import database.rest.cluster.ProcessMonitor;
import database.rest.cluster.PreAuthTable.*;
import database.rest.servers.http.HTTPServer;
import database.rest.servers.rest.RESTClient;
import database.rest.servers.rest.RESTServer;
import database.rest.handlers.file.Deployment;
import database.rest.cluster.Cluster.ServerType;
import database.rest.servers.http.HTTPServerType;
import database.rest.handlers.rest.SessionManager;


public class Server extends Thread
{
  private final short id;
  private final long pid;
  private final long started;
  private final short servers;
  private final int heartbeat;
  private final Config config;
  private final boolean embedded;

  private long requests = 0;

  private final HTTPServer ssl;
  private final HTTPServer plain;
  private final HTTPServer admin;

  private final RESTServer rest;
  private final PoolManager pmgr;
  private final SessionManager smgr;
  private final LoadBalancer loadblcr;
  private final PreAuthTable.Writer authwrt;
  private final PreAuthTable.Reader authrdr;

  private volatile boolean sowner = false;
  private volatile boolean powner = false;

  private final static Logger logger = Logger.getLogger("internal");


  public static void main(String[] args)
  {
    // args: instance name, instance id
    try {new Server(Short.parseShort(args[1]));}
    catch (Exception e) {e.printStackTrace();}
  }


  Server(short id) throws Exception
  {
    Config config = null;

    try {config = new Config();}
    catch (Exception e) {bailout(e);}

    this.id = id;
    this.config = config;

    PrintStream out = stdout();
    this.setName("Server Main");

    System.setOut(out);
    System.setErr(out);

    config.getLogger().open(id);

    this.pid = ProcessHandle.current().pid();
    this.started = System.currentTimeMillis();

    Cluster.init(this);
    ProcessMonitor.init(this);

    if (Cluster.isRunning(id,pid))
    {
      logger.warning("Server "+id+" is already running. Bailing out");
      System.exit(-1);
    }

    Cluster.setStatistics(this);

    this.servers = config.getTopology().servers;
    Process.Type type = Cluster.getType(id);

    this.heartbeat = config.getTopology().heartbeat;

    if (type == Process.Type.rest)
    {
      this.ssl = null;
      this.plain = null;
      this.admin = null;
      this.loadblcr = null;
      this.embedded = true;
      this.rest = new RESTServer(this);
      this.pmgr = new PoolManager(this,true);
      this.smgr = new SessionManager(this,true);
    }
    else
    {
      this.rest = null;

      Deployment.init(config);
      this.embedded = servers <= 0;
      this.smgr = new SessionManager(this);

      if (!this.embedded) this.pmgr = null;
      else this.pmgr = new PoolManager(this);

      if (this.embedded) this.loadblcr = null;
      else this.loadblcr = new LoadBalancer(config);

      this.ssl = new HTTPServer(this,HTTPServerType.ssl,embedded);
      this.plain = new HTTPServer(this,HTTPServerType.plain,embedded);
      this.admin = new HTTPServer(this,HTTPServerType.admin,embedded);

      sowner = this.startup();
    }

    if (servers <= 0)
    {
      this.authrdr = null;
      this.authwrt = null;
    }
    else
    {
      PreAuthTable authtab = new PreAuthTable(config);

      this.authrdr = authtab.getReader();
      this.authwrt = authtab.getWriter();
    }

    this.start();

    if (this.isRestType())
      powner = ProcessMonitor.aquireManagerLock();

    if (powner || ProcessMonitor.noManager())
      this.ensure();

    if (!sowner)
      ProcessMonitor.watchHTTP();

    if (!powner && !sowner && servers > 0)
      ProcessMonitor.watchManager();

    Thread.sleep(50);
    logger.info("Instance startet: "+this.config.instance()+System.lineSeparator());
  }


  private boolean startup()
  {
    if (!open())
    {
      logger.fine("Address already in use");
      return(false);
    }

    logger.info("Open http sockets");

    ssl.start();
    plain.start();
    admin.start();
    smgr.startSSOManager();

    if (embedded)
    {
      pmgr.start();
      smgr.startSessionManager();
    }

    while(admin.state() < HTTPServer.RUNNING)
      try {sleep(1);} catch (Exception e) {;}

    if (admin.state() != HTTPServer.RUNNING)
    {
      logger.severe("Could not start HTTP interface");
      return(false);
    }

    if (!ProcessMonitor.aquireHTTPLock())
      logger.severe("Could not obtain HTTP Lock");

    return(true);
  }


  public short id()
  {
    return(id);
  }


  public long pid()
  {
    return(pid);
  }


  public long started()
  {
    return(started);
  }


  public boolean http()
  {
    return(sowner);
  }


  public boolean manager()
  {
    return(powner);
  }


  public boolean isHttpType()
  {
    return(this.rest == null);
  }


  public boolean isRestType()
  {
    return(this.rest != null);
  }


  public boolean embedded()
  {
    return(embedded);
  }


  public Reader getAuthReader()
  {
    return(this.authrdr);
  }


  public Writer getAuthWriter()
  {
    return(this.authwrt);
  }


  public Config config()
  {
    return(config);
  }


  public Logger logger()
  {
    return(logger);
  }


  public PoolManager poolmanager()
  {
    return(pmgr);
  }


  public void setManager()
  {
    if (ProcessMonitor.aquireManagerLock())
    {
      this.powner = true;
      ProcessMonitor.watchHTTP();
    }
  }


  public void setHTTP()
  {
    logger.info("HTTP fast failover");
    sowner = this.startup();
    if (sowner) logger.info("HTTP failed over successfully");
  }


  public synchronized void request()
  {
    requests++;
  }


  public synchronized long requests()
  {
    return(requests);
  }


  public void shutdown()
  {
    shutdown(true);
  }


  public void shutdown(boolean all)
  {
    if (all) Cluster.stop();
    synchronized(this)
    {this.notify();}
  }


  public RESTClient worker(short id)
  {
    return(loadblcr.worker(id));
  }


  public RESTClient worker() throws Exception
  {
    return(loadblcr.worker());
  }


  public void register(RESTClient client)
  {
    loadblcr.register(client);
  }


  public void deregister(RESTClient client)
  {
    loadblcr.deregister(client);
  }


  private boolean open()
  {
    try
    {
      ServerSocket socket = null;

      socket = new ServerSocket(ssl.port());
      socket.close();

      socket = new ServerSocket(plain.port());
      socket.close();

      socket = new ServerSocket(admin.port());
      socket.close();

      return(true);
    }
    catch (Exception e)
    {
      return(false);
    }
  }


  public void ensure()
  {
    try
    {
      synchronized(this)
      {
        if (!Cluster.stop(this))
        {
          Process process = new Process(config);
          logger.fine("Checking all instances are up");

          ArrayList<ServerType> servers = Cluster.notRunning(this);
          Collections.sort(servers);

          for(ServerType server : servers)
          {
            logger.info("Process "+pid+" starting instance "+server.id);
            process.start(server.type,server.id);
          }
        }
      }
    }
    catch (Exception e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);
    }
  }


  @Override
  public void run()
  {
    try
    {
      synchronized(this)
      {
        while(true)
        {
          if (this.isHttpType())
            Deployment.get().index();

          Cluster.setStatistics(this);

          this.wait(this.heartbeat);
          this.checkCluster(this.powner);

          if (this.sowner)
            Deployment.get().redeploy();

          if (Cluster.stop(this)) break;
        }
      }
    }
    catch (Exception e) {logger.log(Level.SEVERE,e.getMessage(),e);}

    ThreadPool.shutdown();
    logger.info("Server "+id+" stopped");
  }


  private void checkCluster(boolean powner)
  {
    boolean nomgr = true;
    boolean ensure = false;

    ArrayList<Statistics> stats = Cluster.getStatistics();

    for(Statistics stat : stats)
    {
      if (stat.id() == this.id) continue;
      long alive = System.currentTimeMillis() - stat.updated();

      if (1.0 * alive > 1.25 * this.heartbeat) ensure = true;
      else if (stat.restmgr()) nomgr = false;
    }

    if (ensure && (powner || nomgr))
      ensure();
  }


  private PrintStream stdout() throws Exception
  {
    String srvout = config.getLogger().getServerOut(id);
    return(new PrintStream(new BufferedOutputStream(new FileOutputStream(srvout)),true));
  }


  private void bailout(Exception e)
  {
    try
    {
      String srvout = database.rest.config.Logger.getEmergencyOut();
      PrintStream out = new PrintStream(new BufferedOutputStream(new FileOutputStream(srvout)),true);
      out.println(new Date());
      e.printStackTrace(out);
      out.println();
      out.close();
    } catch (Exception ex)
    {
      e.printStackTrace();
    }

    System.exit(-1);
  }
}