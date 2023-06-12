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

import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.logging.Level;
import database.rest.config.Config;
import database.rest.servers.Server;


public class Statistics
{
  private long pid;
  private short id;

  private boolean http;
  private boolean online;

  private boolean httpmgr;
  private boolean restmgr;

  private long updated;
  private long started;

  private long totmem;
  private long usedmem;
  private long freemem;

  private long requests;

  public static final int reclen = 7*Long.BYTES+3;


  @SuppressWarnings("cast")
  public static void save(Server server)
  {
    try
    {
      Statistics stats = new Statistics();
      ByteBuffer data = ByteBuffer.allocate(reclen);

      stats.id = server.id();
      stats.pid = server.pid();
      stats.started = server.started();
      stats.requests = server.requests();
      stats.updated = System.currentTimeMillis();

      stats.totmem = Runtime.getRuntime().maxMemory();
      stats.freemem = Runtime.getRuntime().freeMemory();
      stats.usedmem = (Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory());

      byte httpmgr = server.http() ? (byte) 1 : 0;
      byte restmgr = server.manager() ? (byte) 1 : 0;
      byte srvtype = server.isHttpType() ? (byte) 1 : 0;

      data.putLong(stats.pid);
      data.putLong(stats.started);
      data.putLong(stats.updated);
      data.putLong(stats.totmem);
      data.putLong(stats.usedmem);
      data.putLong(stats.freemem);
      data.putLong(stats.requests);

      data.put(srvtype);
      data.put(httpmgr);
      data.put(restmgr);

      Cluster.write(server.id(),data.array());
    }
    catch (Exception e)
    {
      server.logger().log(Level.SEVERE,e.getMessage(),e);
    }
  }


  public static ArrayList<Statistics> get(Config config)
  {
    ArrayList<Statistics> list =
      new ArrayList<Statistics>();

    try
    {
      long time = System.currentTimeMillis();
      Short[] servers = Cluster.getServers(config);
      int heartbeat = config.getTopology().heartbeat;

      for (short i = 0; i < servers[0] + servers[1]; i++)
      {
        Statistics stats = new Statistics();
        ByteBuffer data = ByteBuffer.wrap(Cluster.read(i));

        stats.id = i;

        if (data.capacity() > 0)
        {
          stats.pid      = data.getLong();
          stats.started  = data.getLong();
          stats.updated  = data.getLong();
          stats.totmem   = data.getLong();
          stats.usedmem  = data.getLong();
          stats.freemem  = data.getLong();
          stats.requests = data.getLong();

          byte srvtype = data.get();
          byte httpmgr = data.get();
          byte restmgr = data.get();

          stats.http = srvtype == 1;
          stats.httpmgr = httpmgr == 1;
          stats.restmgr = restmgr == 1;

          double age = 1.0 * time - stats.updated();
          stats.online = (age < 1.25 * heartbeat);
        }

        list.add(stats);
      }
    }
    catch (Exception e) {e.printStackTrace();}
    return(list);
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

  public long updated()
  {
    return(updated);
  }

  public long totmem()
  {
    return(totmem);
  }

  public long usedmem()
  {
    return(usedmem);
  }

  public long freemem()
  {
    return(freemem);
  }

  public long requests()
  {
    return(requests);
  }

  public boolean online()
  {
    return(online);
  }

  public boolean http()
  {
    return(http);
  }

  public boolean httpmgr()
  {
    return(httpmgr);
  }

  public boolean restmgr()
  {
    return(restmgr);
  }
}