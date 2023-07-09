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

package database.rest.cluster;

import java.io.File;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.io.FileOutputStream;
import java.io.RandomAccessFile;
import java.nio.channels.FileLock;
import database.rest.config.Paths;
import database.rest.servers.Server;
import java.nio.channels.FileChannel;


public class ProcessMonitor
{
  private final Server server;
  private final FileChannel channel;
  private static ProcessMonitor mon = null;

  private FileLock mgr = null;
  private FileLock http = null;

  private static final int MGR = 0;
  private static final int HTTP = 1;

  private final static Logger logger = Logger.getLogger("internal");


  ProcessMonitor(Server server) throws Exception
  {
    this.server = server;
    File lfile = new File(getFileName());

    if (!lfile.exists())
    {
      byte[] bytes = new byte[2];
      FileOutputStream out = new FileOutputStream(lfile);
      out.write(bytes);
      out.close();
    }

    this.channel = new RandomAccessFile(lfile,"rw").getChannel();
  }


  private String getFileName()
  {
    return(Paths.ipcdir + File.separator + "cluster.lck");
  }


  public static void init(Server server) throws Exception
  {
    mon = new ProcessMonitor(server);
  }


  public static boolean isHTTP()
  {
    return(mon.http != null);
  }


  public static boolean isManager()
  {
    return(mon.mgr != null);
  }


  public static boolean noManager()
  {
    try
    {
      FileLock test = mon.channel.tryLock(MGR,1,false);

      if (test != null)
      {
        test.release();
        return(true);
      }

      return(false);
    }
    catch (Exception e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);
    }

    return(true);
  }


  public static boolean aquireHTTPLock()
  {
    try
    {
      mon.http = mon.channel.tryLock(HTTP,1,false);

      if (mon.http == null)
        return(false);

      return(true);
    }
    catch (Exception e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);
    }

    return(false);
  }


  public static boolean aquireManagerLock()
  {
    try
    {
      mon.mgr = mon.channel.tryLock(MGR,1,false);

      if (mon.mgr == null)
        return(false);

      return(true);
    }
    catch (Exception e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);
    }

    return(false);
  }


  public static boolean releaseManagerLock()
  {
    try
    {
      mon.mgr.release();
      return(true);
    }
    catch (Exception e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);
    }

    return(false);
  }


  public static void watchHTTP()
  {
    ProcessWatch watcher = new ProcessWatch(mon,HTTP);
    watcher.start();
  }


  public static void watchManager()
  {
    ProcessWatch watcher = new ProcessWatch(mon,MGR);
    watcher.start();
  }


  private void onServerDown(ProcessWatch watcher)
  {
    logger.fine("Process "+watcher.type+" died");

    if (watcher.lock == HTTP)
    {
      if (server.isHttpType())
        server.setHTTP();
    }

    if (watcher.lock == MGR && server.isRestType() && !server.manager())
      server.setManager();

    if (server.manager())
      server.ensure();
  }


  private static class ProcessWatch extends Thread
  {
    private final int lock;
    private final String type;
    private FileLock flock = null;
    private final ProcessMonitor monitor;


    ProcessWatch(ProcessMonitor monitor, int lock)
    {
      this.lock = lock;
      this.monitor = monitor;
      this.type = lock == MGR ? "Manager" : "HTTP";

      this.setDaemon(true);
      this.setName("ProcessMonitor");
    }


    @Override
    public void run()
    {
      boolean obtained = false;
      logger.fine("Watching "+type+" process");

      try
      {
        for (int i = 0; i < 512; i++)
        {
          long time = System.currentTimeMillis();
          flock = mon.channel.lock(lock,1,false);

          if (flock != null)
          {
            flock.release();
            // If never obtained, try again
            if (!obtained && System.currentTimeMillis() - time < 256) sleep(32);
            else
            {
              obtained = true;
              break;
            }
          }
        }
      }
      catch (Exception e)
      {
        logger.fine("FileLock : "+e.getMessage());
      }

      if (!obtained)
        logger.warning("Unable to obtain "+type+" lock");

      monitor.onServerDown(this);
    }
  }
}