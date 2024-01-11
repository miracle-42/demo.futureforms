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

package database.rest.control;

import java.io.File;
import java.util.Date;
import java.util.ArrayList;
import java.io.PrintStream;
import org.json.JSONTokener;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.text.SimpleDateFormat;
import database.rest.admin.Client;
import database.rest.config.Paths;
import database.rest.config.Config;
import database.rest.cluster.Cluster;
import java.io.ByteArrayOutputStream;
import database.rest.config.Topology;
import database.rest.handlers.Handler;
import database.rest.database.Database;
import database.rest.custom.Encryption;
import database.rest.cluster.Statistics;
import database.rest.custom.SQLRewriter;
import database.rest.custom.PreProcessor;
import database.rest.custom.SQLValidator;
import database.rest.custom.SQLWhiteList;
import database.rest.custom.Authenticator;
import database.rest.custom.PostProcessor;
import database.rest.custom.SQLRewriterAPI;
import database.rest.custom.SQLValidatorAPI;
import database.rest.custom.AuthenticatorAPI;
import database.rest.servers.rest.RESTClient;
import database.rest.servers.rest.RESTServer;
import database.rest.handlers.file.Deployment;


/**
 *
 * In case there are no json-lib in classpath, the launcher will dynamically load it.
 * If the loader fails (java 1.8) it starts a new process with appropiate classpath.
 *
 * It then reads the topologi and starts the servers as per config.
 *
 */
public class Launcher implements ILauncher
{
  private Config config = null;

  private final static String psep = File.pathSeparator;
  private final static Logger logger = Logger.getLogger("internal");


  public static void main(String[] args) throws Exception
  {
    String cmd = null;
    String url = null;
    ILauncher launcher = null;

    if (args.length < 1 || args.length > 2)
      usage();

    if (!testcp())
    {
      launcher = create();

      if (launcher == null)
      {
        System.err.println("Could not load app");
        System.exit(-1);
      }
    }

    if (launcher == null)
      launcher = new Launcher();

    try
    {
      launcher.setConfig();
      cmd = args[0].toLowerCase();
      if (args.length > 1) url = args[1].toLowerCase();

      switch(cmd)
      {
        case "start"  : launcher.start();       break;
        case "stop"   : launcher.stop(url);     break;
        case "status" : launcher.status(url);   break;
        case "deploy" : launcher.deploy(url);   break;

        default: usage();
      }
    }
    catch (Exception e)
    {
      launcher.log(e);
      throw e;
    }
  }


  private static void usage()
  {
    System.out.println("usage openrestdb start|stop|deploy|status [url]");
    System.exit(-1);
  }


  public Logger logger()
  {
    return(logger);
  }


  public void setConfig() throws Exception
  {
    this.config = new Config(false);
    config.getLogger().openControlLog();
  }


  public void start() throws Exception
  {
    Cluster.init(config);
    config.getJava().exe();

    if (Cluster.isRunning((short) 0))
    {
      logger.info("OpenRestDB instance "+config.instance()+" is already running");
      return;
    }

    Process process = new Process(config);
    process.start(Process.Type.http,0);
  }


  public void stop(String url) throws Exception
  {
    if (url == null)
    {
      logger.fine("Shutting down");
      Cluster.init(config); Cluster.stop();
      Thread.sleep((int) (1.25*config.getTopology().heartbeat));
    }
    else
    {
      if (url.startsWith("http://"))
        url = url.substring(7);

      if (url.startsWith("https://"))
        url = url.substring(8);

      int pos = url.indexOf(':') + 1;
      int admin = config.getPorts().admin;

      if (pos > 1)
      {
        admin = Integer.parseInt(url.substring(pos));
        url = url.substring(0,pos-1);
      }

      Client client = new Client(url,admin,true);

      logger.fine("Connecting");
      client.connect();

      logger.fine("Sending message");
      client.send("shutdown");
    }
  }


  public void deploy(String url) throws Exception
  {
    if (url == null)
    {
      logger.info("Deploying");
      Deployment.init(config);
      Deployment.get().deploy();
    }
    else
    {
      if (url.startsWith("http://"))
        url = url.substring(7);

      if (url.startsWith("https://"))
        url = url.substring(8);

      int pos = url.indexOf(':') + 1;
      int admin = config.getPorts().admin;

      if (pos > 1)
      {
        admin = Integer.parseInt(url.substring(pos));
        url = url.substring(0,pos-1);
      }

      Client client = new Client(url,admin,true);

      logger.fine("Connecting");
      client.connect();

      logger.fine("Sending message");
      client.send("deploy");
    }
  }


  public void status(String url) throws Exception
  {
    if (url == null)
    {
      System.out.println(getStatus(config));
    }
    else
    {
      if (url.startsWith("http://"))
        url = url.substring(7);

      if (url.startsWith("https://"))
        url = url.substring(8);

      int pos = url.indexOf(':') + 1;
      int admin = config.getPorts().admin;

      if (pos > 1)
      {
        admin = Integer.parseInt(url.substring(pos));
        url = url.substring(0,pos-1);
      }

      Client client = new Client(url,admin,true);

      logger.fine("Connecting");
      client.connect();

      logger.fine("Sending message");
      byte[] response = client.send("status");

      System.out.println(new String(response));
    }
  }


  public static String getStatus(Config config) throws Exception
  {
    String line = null;

    ByteArrayOutputStream bout = new ByteArrayOutputStream();
    PrintStream out = new PrintStream(bout);

    out.println();

    // Instance & Ports
    out.print("Instance: "+config.instance());
    out.print(", SSL: "+config.getPorts().ssl);
    out.print(", Plain: "+config.getPorts().plain);
    out.print(", Admin: "+config.getPorts().admin);
    out.println();
    out.println();

    Topology topology = config.getTopology();
    out.println("Cores: "+Topology.cores+", Waiters: "+topology.waiters+", Workers: "+topology.workers);
    out.println();

    SimpleDateFormat format = new SimpleDateFormat("dd-MMM-yyyy HH:mm:ss");
    ArrayList<Statistics> statistics = Cluster.getStatistics(config);

    String hid = String.format("%3s"," id");
    String hpid = String.format("%8s"," pid ");
    String hhits = String.format("%12s","hits  ");

    String htype = String.format("%-8s"," type");

    String hused = String.format("%-9s"," used");
    String halloc = String.format("%-9s"," alloc");
    String htotal = String.format("%-10s"," total");

    String hstarted = String.format("%-21s","  started");
    String hupdated = String.format("%-13s","    uptime");

    // Memory

    out.println("Memory in MB");
    line = String.format("%40s"," ").replace(" ","-");

    out.println(line);
    out.println("|"+hid+" |"+htotal+" |"+halloc+" |"+hused+" |");
    out.println(line);

    for (Statistics stats : statistics)
    {
      if (!stats.online()) continue;

      long alloc = stats.usedmem() + stats.freemem();

      String id = String.format(" %2s ",stats.id());
      String am = String.format(" %8s ",alloc/(1024*1024));
      String tm = String.format(" %9s ",stats.totmem()/(1024*1024));
      String um = String.format(" %8s ",stats.usedmem()/(1024*1024));

      out.print("|"+id+"");
      out.print("|"+tm+"");
      out.print("|"+am+"");
      out.print("|"+um+"");

      out.print("|");
      out.print(System.lineSeparator());
    }

    out.println(line);
    out.println();


    // Processes

    out.println("Processes");
    line = String.format("%78s"," ").replace(" ","-");

    out.println(line);
    out.println("|"+hid+" |"+hpid+" |"+htype+" |"+hstarted+" |"+hupdated+" |"+hhits+" |");
    out.println(line);

    for (Statistics stats : statistics)
    {
      if (!stats.online()) continue;

      String id = String.format(" %2s ",stats.id());
      String pid = String.format("%8s ",stats.pid());
      String hits = String.format("%12s ",stats.requests());

      String type = stats.http() ? "http" : "rest";
      if (stats.http() && !stats.httpmgr()) type += "(-)";
      type = String.format(" %-8s",type);

      int up = (int) ((stats.updated() - stats.started())/1000);

      int days = up/(24*3600);
      up -= days * 24*3600;

      int hours = up/3600;
      up -= hours * 3600;

      int mins = up/60;
      up -= mins * 60;

      int secs = up;

      String uptime = " ";
      uptime += String.format("%3d",days) + " ";
      uptime += String.format("%2d",hours).replace(' ','0') + ":";
      uptime += String.format("%2d",mins) .replace(' ','0') + ":";
      uptime += String.format("%2d",secs) .replace(' ','0') + " ";

      String started = " "+format.format(new Date(stats.started()))+" ";

      out.print("|"+id+"");
      out.print("|"+pid+"");
      out.print("|"+type+"");
      out.print("|"+started+"");
      out.print("|"+uptime+"");
      out.print("|"+hits+"");

      out.print("|");
      out.print(System.lineSeparator());
    }

    out.println(line);
    out.println();

    out.flush();
    return(new String(bout.toByteArray()));
  }


  public int heartbeat() throws Exception
  {
    return(config.getTopology().heartbeat);
  }


  public boolean stopped(long started) throws Exception
  {
    Cluster.init(config);
    return(Cluster.stop(started));
  }


  public void log(Exception e)
  {
    if (logger != null)
      logger.log(Level.SEVERE,e.getMessage(),e);
  }


  // Test json in classpath
  private static boolean testcp()
  {
    try {new JSONTokener("{}");}
    catch (Throwable e) {return(false);}
    return(true);
  }


  static ILauncher create() throws Exception
  {
    ILauncher launcher = null;

    try
    {
      Class<?>[] keep = new Class<?>[]
      {
        Paths.class,
        Handler.class,
        Database.class,
        ILauncher.class,

        RESTClient.class,
        RESTServer.class,

        SQLRewriter.class,
        SQLRewriterAPI.class,

        SQLValidator.class,
        SQLValidatorAPI.class,

        Encryption.class,
        SQLWhiteList.class,

        PreProcessor.class,
        PostProcessor.class,

        Authenticator.class,
        AuthenticatorAPI.class,
      };

      Loader loader = new Loader(keep);
      String path = Paths.libdir+File.separator+"json";

      File dir = new File(path);
      String[] jars = dir.list();

      for(String jar : jars)
        loader.load(path + File.separator + jar);

      String classpath = (String) System.getProperties().get("java.class.path");

      jars = classpath.split(psep);

      for(String jar : jars)
        loader.load(jar);

      Class<?> Launcher = loader.getClass(Launcher.class);
      launcher = (ILauncher) Launcher.getDeclaredConstructor().newInstance();

      return(launcher);
    }
    catch (Exception e)
    {
      e.printStackTrace();
      return(null);
    }
  }
}