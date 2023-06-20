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
import java.util.List;
import java.util.HashSet;
import java.util.Optional;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.stream.Stream;
import java.util.logging.Logger;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.MappedByteBuffer;
import database.rest.config.Paths;
import database.rest.config.Config;
import java.util.stream.Collectors;
import database.rest.servers.Server;
import database.rest.control.Process;
import java.nio.channels.FileChannel;
import static java.nio.file.StandardOpenOption.*;


public class Cluster
{
  private final String inst;
  private final Config config;
  private final MappedByteBuffer shmmem;

  private static Cluster cluster = null;
  private final static Logger logger = Logger.getLogger("internal");


  Cluster(Config config) throws Exception
  {
    this.config = config;
    this.inst = config.instance();

    String filename = getFileName();
    FileSystem fs = FileSystems.getDefault();

    Short[] servers = getServers(config);
    int processes = servers[0] + servers[1];
    int size = 2 + Long.BYTES + processes * (Statistics.reclen + 2);

    Path path = fs.getPath(filename);
    FileChannel fc = FileChannel.open(path,CREATE,READ,WRITE);
    this.shmmem = fc.map(FileChannel.MapMode.READ_WRITE,0,size);
  }


  private void setStopped()
  {
    byte cs = (byte) (shmmem.get(0) + 1);
    long stop = System.currentTimeMillis();

    shmmem.put(0,cs);
    shmmem.putLong(1,stop);
    shmmem.put(Long.BYTES+1,cs);
  }


  private long getStopped()
  {
    byte cs1 = 0;
    byte cs2 = 1;
    long time = 0;

    for (int i = 0; cs1 != cs2 && i < 32768; i++)
    {
      cs2  = shmmem.get(Long.BYTES+1);
      time = shmmem.getLong(1);
      cs1  = shmmem.get(0);

      if (cs1 != cs2) Thread.yield();
    }

    return(time);
  }


  private byte[] readdata(short id)
  {
    byte cs1 = 0;
    byte cs2 = 1;

    byte[] data = new byte[Statistics.reclen];
    int offset = 2 + Long.BYTES + id * (Statistics.reclen + 2);

    for (int i = 0; cs1 != cs2 && i < 32768; i++)
    {
      cs1 = this.shmmem.get(offset);
      this.shmmem.get(offset+1,data);
      cs2 = this.shmmem.get(offset+1+Statistics.reclen);

      if (cs1 != cs2) Thread.yield();
    }

    if (cs1 != cs2) logger.severe("cluster corruption, c1="+cs1+" c2="+cs2);
    return(data);
  }


  private void writedata(short id, byte[] data)
  {
    int offset = 2 + Long.BYTES + id * (Statistics.reclen + 2);
    byte par = (byte) (this.shmmem.get(offset) + 1);
    this.shmmem.put(offset,par);
    this.shmmem.put(offset+1,data);
    this.shmmem.put(offset+1+data.length,par);
  }


  private String getFileName()
  {
    return(Paths.ipcdir + File.separator + "cluster.dat");
  }


  public static void stop()
  {
    cluster.setStopped();
  }


  public static boolean stop(Server server)
  {
    return(stop(server.started()));
  }


  public static boolean stop(long started)
  {
    return(cluster.getStopped() > started);
  }


  public static void init(Server server) throws Exception
  {
    init(server.config());
  }


  public static void init(Config config) throws Exception
  {
    if (cluster != null) return;
    cluster = new Cluster(config);
  }


  public static Process.Type getType(short id) throws Exception
  {
    Config config = cluster.config;
    Short[] servers = getServers(config);
    return(id < servers[0] ? Process.Type.http : Process.Type.rest);
  }


  public static ArrayList<ServerProcess> running() throws Exception
  {
    if (System.getProperty("os.name").toLowerCase().contains("windows")) return(windows());
    return(unix());
  }


  private static ArrayList<ServerProcess> windows() throws Exception
  {
    ArrayList<Statistics> stats = getStatistics(cluster.config);
    ArrayList<ServerProcess> running = new ArrayList<ServerProcess>();

    for(Statistics stat : stats)
    {
      if (stat.pid() == 0) continue;
      Optional<ProcessHandle> ohandle = ProcessHandle.of(stat.pid());

      if (ohandle.isPresent())
      {
        ProcessHandle handle = ohandle.get();
        if (handle.info().command().isPresent())
        {
          if (handle.info().command().get().indexOf("java.exe") >= 0)
            running.add(new ServerProcess(stat.id(),stat.pid()));
        }
      }
    }

    return(running);
  }


  private static ArrayList<ServerProcess> unix() throws Exception
  {
    String cname = "database.rest.servers.Server";
    String match = ".*java?(\\.exe)?\\s+.*"+cname+"\\s"+cluster.inst+"\\s.*";

    ArrayList<ServerProcess> running = new ArrayList<ServerProcess>();

    Stream<ProcessHandle> stream = ProcessHandle.allProcesses();
    List<ProcessHandle> processes = stream.filter((p) -> p.info().commandLine().isPresent())
                                          .filter((p) -> p.info().commandLine().get().matches(match))
                                          .collect(Collectors.toList());

    for(ProcessHandle handle : processes)
    {
      long pid = handle.pid();
      String cmd = handle.info().commandLine().get();

      try
      {
        int end = cmd.indexOf(cname) + cname.length();
        String[] args = cmd.substring(end).trim().split(" ");
        running.add(new ServerProcess(Short.parseShort(args[1]),pid));
      }
      catch(Exception e)
      {
        logger.warning("Unable to parse process-handle "+cmd);
      }
    }

    return(running);
  }


  public static boolean isRunning(short id) throws Exception
  {
    ArrayList<ServerProcess> running = running();

    for(ServerProcess p : running)
    {
      if (p.id == id)
        return(true);
    }

    return(false);
  }


  public static boolean isRunning(short id, long pid) throws Exception
  {
    ArrayList<ServerProcess> running = running();

    for(ServerProcess p : running)
    {
      if (p.id == id && p.pid != pid)
        return(true);
    }

    return(false);
  }


  public static ArrayList<ServerType> notRunning(Server server) throws Exception
  {
    Short[] servers = getServers(server.config());
    ArrayList<ServerType> down = new ArrayList<ServerType>();

    HashSet<Short> running = getRunningServers();

    for (short i = 0; i < servers[0]; i++)
    {
      if (i == server.id()) continue;

      if (!running.contains(i))
        down.add(new ServerType(Process.Type.http,i));
    }

    for (short i = servers[0]; i < servers[0] + servers[1]; i++)
    {
      if (i == server.id()) continue;

      if (!running.contains(i))
        down.add(new ServerType(Process.Type.rest,i));
    }

    return(down);
  }


  public static void setStatistics(Server server)
  {
    Statistics.save(server);
  }


  public static ArrayList<Statistics> getStatistics()
  {
    Config config = cluster.config;
    return(Statistics.get(config));
  }


  public static ArrayList<Statistics> getStatistics(Config config) throws Exception
  {
    init(config);
    return(Statistics.get(config));
  }


  static byte[] read(short id)
  {
    return(cluster.readdata(id));
  }


  static void write(short id, byte[] data)
  {
    cluster.writedata(id,data);
  }


  public static Short[] getServers(Config config) throws Exception
  {
    short http = 1;
    if (config.getTopology().hot) http++;
    return(new Short[] {http,config.getTopology().servers});
  }


  public static HashSet<Short> getRunningServers() throws Exception
  {
    HashSet<Short> sids =new HashSet<Short>();
    ArrayList<ServerProcess> running = running();
    for(ServerProcess p : running) sids.add(p.id);
    return(sids);
  }


  public static class ServerType  implements Comparable<ServerType>
  {
    public final short id;
    public final Process.Type type;

    ServerType(Process.Type type, short id)
    {
      this.id = id;
      this.type = type;
    }

    @Override
    public int compareTo(ServerType another)
    {
      return(another.id - id);
    }
  }


  private static class ServerProcess
  {
    final short id;
    final long pid;

    ServerProcess(short id, long pid)
    {
      this.id = id;
      this.pid = pid;
    }
  }
}