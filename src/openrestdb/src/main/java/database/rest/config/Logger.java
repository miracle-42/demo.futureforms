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

package database.rest.config;

import java.io.File;
import org.json.JSONObject;
import java.util.logging.Level;
import java.io.FileOutputStream;
import java.util.logging.FileHandler;
import database.rest.logger.Formatter;


public class Logger
{
  private final java.util.logging.Logger http = java.util.logging.Logger.getLogger("http");
  private final java.util.logging.Logger rest = java.util.logging.Logger.getLogger("rest");
  private final java.util.logging.Logger admin = java.util.logging.Logger.getLogger("admin");
  private final java.util.logging.Logger intern = java.util.logging.Logger.getLogger("internal");

  private final int size;
  private final int count;
  private final String itlevel;
  private final String htlevel;
  private final String rtlevel;
  private final Formatter formatter = new Formatter();

  private boolean open = false;
  private String logdir = "." + File.separator + "logs";

  private static final String logfile = "server.log";
  private static final String ctrfile = "control.log";
  private final static int LOGSIZE = 10 * 1024 * 1024;


  public static String getEmergencyOut()
  {
    String logdir = Paths.apphome + File.separator + "logs";

    File ldir = new File(logdir);
    if (!ldir.exists()) ldir.mkdir();

    return(logdir+File.separator+"server.out");
  }


  Logger(JSONObject config, String inst) throws Exception
  {
    String path = Paths.apphome;

    htlevel = Config.get(config,"http");
    rtlevel = Config.get(config,"rest");
    itlevel = Config.get(config,"internal");

    count = Config.get(config,"files",1);
    logdir = Config.get(config,"path",logdir);

    String lfsize = Config.get(config,"size",null);
    if (config.has("size")) lfsize = Config.get(config,"size");

    if (lfsize == null) size = LOGSIZE;
    else
    {
      int mp = 1;
      lfsize = lfsize.trim();
      if (lfsize.endsWith("KB")) mp = 1024;
      if (lfsize.endsWith("MB")) mp = 1024*1024;
      if (lfsize.endsWith("GB")) mp = 1024*1024*1024;
      if (mp > 1) lfsize = lfsize.substring(0,lfsize.length()-2);
      size = Integer.parseInt(lfsize.trim()) * mp;
    }

    if (logdir.startsWith("."+File.separator) || logdir.startsWith("./"))
    {
      logdir = path + File.separator + logdir;
      File logf = new File(logdir);
      logdir = logf.getCanonicalPath();
    }
    else
    {
      logdir = logdir + File.separator + inst;
    }

    File ldir = new File(logdir);

    if (ldir.exists() && !ldir.isDirectory())
      throw new Exception(ldir+" is not a directory");

    if (!ldir.exists())
      ldir.mkdirs();
  }


  public synchronized String getServerOut(int inst)
  {
    File ldir = new File(logdir);
    if (!ldir.exists()) ldir.mkdir();

    String instdir = logdir + File.separator+"inst"+String.format("%1$2s",inst).replace(' ','0');

    ldir = new File(instdir);
    if (!ldir.exists()) ldir.mkdir();

    return(instdir+File.separator+"server.out");
  }


  public synchronized String getControlOut()
  {
    File ldir = new File(logdir);
    if (!ldir.exists()) ldir.mkdir();

    String instdir = logdir + File.separator;

    ldir = new File(instdir);
    if (!ldir.exists()) ldir.mkdir();

    return(instdir+File.separator+"control.out");
  }


  public synchronized void openControlLog() throws Exception
  {
    File ldir = new File(logdir);
    if (!ldir.exists()) ldir.mkdir();

    FileHandler handler = new FileHandler(logdir+File.separator+ctrfile,size,count,true);
    handler.setFormatter(formatter);

    intern.setUseParentHandlers(false);
    intern.setLevel(Level.parse(itlevel.toUpperCase()));

    intern.addHandler(handler);
  }


  public synchronized void open(int inst) throws Exception
  {
    if (open) return;
    String instdir = logdir + File.separator+"inst"+String.format("%1$2s",inst).replace(' ','0');

    File ldir = new File(instdir);
    if (!ldir.exists()) ldir.mkdir();

    String lfile = instdir+File.separator+logfile;

    File check = new File(lfile+".0");
    if (check.exists())
    {
      FileOutputStream out = new FileOutputStream(lfile+".0",true);
      out.write(System.lineSeparator().getBytes());
      out.write(System.lineSeparator().getBytes());
      out.write(System.lineSeparator().getBytes());
      out.close();
    }

    FileHandler handler = new FileHandler(lfile,size,count,true);
    handler.setFormatter(formatter);

    http.setUseParentHandlers(false);
    http.setLevel(Level.parse(htlevel.toUpperCase()));

    http.addHandler(handler);

    rest.setUseParentHandlers(false);
    rest.setLevel(Level.parse(rtlevel.toUpperCase()));

    rest.addHandler(handler);

    admin.setUseParentHandlers(false);
    admin.setLevel(Level.parse(itlevel.toUpperCase()));

    admin.addHandler(handler);

    intern.setUseParentHandlers(false);
    intern.setLevel(Level.parse(itlevel.toUpperCase()));

    intern.addHandler(handler);
    open = true;
  }
}