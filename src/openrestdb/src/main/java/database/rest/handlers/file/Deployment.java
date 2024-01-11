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

package database.rest.handlers.file;

import java.io.File;
import java.util.Date;
import java.util.ArrayList;
import java.io.Serializable;
import java.io.FileInputStream;
import java.util.logging.Logger;
import java.io.FileOutputStream;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.text.SimpleDateFormat;
import database.rest.config.Config;
import java.io.ByteArrayInputStream;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;
import database.rest.config.HTTP.FilePattern;
import java.util.concurrent.ConcurrentHashMap;


public class Deployment
{
  private static Deployment deployment = null;

  private final String home;
  private final String deploy;
  private final Config config;

  private final ArrayList<FilePattern> cache;
  private final ArrayList<FilePattern> compression;

  private final static Logger logger = Logger.getLogger("http");

  private int grace = 0;
  private long synched = 0;
  private long modified = 0;
  private Date moddate = null;
  private String modstring = null;
  private ConcurrentHashMap<String,StaticFile> index = null;

  private static final String sep = File.separator;
  private static final SimpleDateFormat format = new SimpleDateFormat("EEE, d MMM YYYY hh:mm:ss z");


  public static Deployment get()
  {
    return(deployment);
  }


  public static synchronized void init(Config config) throws Exception
  {
    if (deployment == null)
      deployment = new Deployment(config);
  }


  public Deployment(Config config) throws Exception
  {
    this.config = config;
    this.cache = this.config.getHTTP().cache;
    this.grace = config.getHTTP().graceperiod;
    this.home = this.config.getHTTP().getAppPath();
    this.deploy = this.config.getHTTP().getTmpPath();
    this.compression = this.config.getHTTP().compression;
  }


  public static Date modified()
  {
    return(deployment.moddate);
  }


  public static String modstring()
  {
    return(deployment.modstring);
  }


  public StaticFile get(String path) throws Exception
  {
    if (this.index == null)
    {
      synchronized(this)
      {
        while(this.index == null)
          this.wait();
      }
    }

    File deploy = new File(this.deploy + sep + modified);

    if (!deploy.exists() && !index())
      deploy();

    return(this.index.get(path));
  }


  public static boolean isDirectory(String path)
  {
    if (Config.windows()) path = path.replaceAll("//","\\");
    File file = new File(deployment.deploy + sep + deployment.modified + path);
    return(file.isDirectory());
  }


  @SuppressWarnings("unchecked")
  public synchronized boolean index() throws Exception
  {
    long latest = latest();
    if (latest == modified) return(false);

    Date modified = new Date(latest);
    String deployment = this.deploy + sep + latest;
    if (!(new File(deployment).exists())) return(false);

    logger.info("Indexing website");

    ConcurrentHashMap<String,StaticFile> index =
      new ConcurrentHashMap<String,StaticFile>();

    FileInputStream fin = new FileInputStream(deployment + sep + ".index");
    ObjectInputStream oin = new ObjectInputStream(fin);

    index = (ConcurrentHashMap<String,StaticFile>) oin.readObject();
    oin.close();

    this.index = index;
    this.modified = latest;
    this.moddate = modified;
    this.modstring = format.format(modified);

    return(true);
  }


  public synchronized void redeploy() throws Exception
  {
    sync();
    File home = new File(this.home);

    if (grace > 0 && home.lastModified() > this.modified + grace*1000)
    {
      logger.info("Redeploy");
      deploy();
    }
  }


  public synchronized void deploy() throws Exception
  {
    sync();

    Date modified = new Date();
    File home = new File(this.home);

    if (!home.exists())
      throw new Exception(this.home+" does not exist");

    modified.setTime(home.lastModified());

    String dep = this.deploy + sep + home.lastModified();
    String tmp = this.deploy + sep + "d" + home.lastModified();

    ConcurrentHashMap<String,StaticFile> index =
      new ConcurrentHashMap<String,StaticFile>();

    if (!(new File(dep).exists()))
    {
      if (logger.getHandlers().length < 0)
        logger.info("Deploying website");

      deploy(index,this.home,tmp,dep);

      File deployed = new File(tmp);
      deployed.renameTo(new File(dep));

      FileOutputStream fout = new FileOutputStream(dep + sep +".index");
      ObjectOutputStream oout = new ObjectOutputStream(fout);

      oout.writeObject(index);

      oout.close();
      fout.close();

      this.index = index;
      this.moddate = modified;
      this.modified = home.lastModified();
      this.modstring = format.format(modified);

      synchronized(this) {this.notifyAll();}
      this.cleanup();
    }
  }


  private void deploy(ConcurrentHashMap<String,StaticFile> index, String fr, String to, String dest) throws Exception
  {
    File source = new File(fr);
    File target = new File(to);

    String[] entries = source.list();
    if (!target.exists()) target.mkdirs();

    for(String entry : entries)
    {
      String dfr = fr + sep + entry;
      String dto = to + sep + entry;
      String des = dest + sep + entry;

      File deploy = new File(dfr);
      if (deploy.isDirectory())
      {
        deploy(index,dfr,dto,des);
      }
      else
      {
        boolean cache = false;
        boolean compress = false;
        long size = deploy.length();
        dfr = dfr.substring(this.home.length());

        for(FilePattern fpatrn : this.compression)
        {
          if (size >= fpatrn.size && deploy.getName().matches(fpatrn.pattern))
            compress = true;
        }

        if (!compress) size = copy(deploy,dto);
        else           size = compress(deploy,dto);

        for(FilePattern fpatrn : this.cache)
        {
          if (size <= fpatrn.size && deploy.getName().matches(fpatrn.pattern))
            cache = true;
        }

        String vpath = dfr.replaceAll("\\\\","/");
        index.put(vpath,new StaticFile(vpath,des,cache,compress));
      }
    }
  }


  public int copy(File ifile, String file) throws Exception
  {
    FileInputStream in = new FileInputStream(ifile);
    FileOutputStream out = new FileOutputStream(file);

    int read = 0;
    byte[] buf = new byte[4096];

    while(read >= 0)
    {
      read = in.read(buf);
      if (read > 0) out.write(buf,0,read);
    }

    out.close();
    in.close();

    return((int) ifile.length());
  }


  public int compress(File ifile, String file) throws Exception
  {
    FileInputStream in = new FileInputStream(ifile);
    FileOutputStream out = new FileOutputStream(file);
    GZIPOutputStream gout = new GZIPOutputStream(out);

    int read = 0;
    byte[] buf = new byte[4096];

    while(read >= 0)
    {
      read = in.read(buf);
      if (read > 0) gout.write(buf,0,read);
    }

    gout.close();
    out.close();
    in.close();

    File cfile = new File(file);
    return((int) cfile.length());
  }


  public void sync() throws Exception
  {
    long synched = System.currentTimeMillis();
    if (synched - this.synched < grace*1000) return;

    this.synched = synched;
    File home = new File(this.home);

    long mod = latest(home);
    home.setLastModified(mod);
  }


  private long latest(File folder) throws Exception
  {
    if (!folder.exists())
      throw new Exception(folder+" does not exist");

    long latest = folder.lastModified();
    File[] content = folder.listFiles();

    for(File file : content)
    {
      long mod = file.lastModified();
      if (mod > latest) latest = mod;

      if (file.isDirectory())
      {
        mod = latest(file);
        if (mod > latest) latest = mod;
      }
    }

    return(latest);
  }


  public long latest() throws Exception
  {
    long latest = modified;

    File deployed = new File(this.deploy);

    if (!deployed.exists()) return(0);
    File[] deployments = deployed.listFiles();

    for(File deployment : deployments)
    {
      String name = deployment.getName();
      char fc = deployment.getName().charAt(0);

      if (fc >= '0' && fc <= '9')
      {
        long mod = 0;

        try {mod = Long.parseLong(name);}
        catch (Exception e) {;}

        if (mod > latest) latest = mod;
      }
    }

    return(latest);
  }


  private void cleanup()
  {
    File deployed = new File(this.deploy);
    File[] deployments = deployed.listFiles();

    for(File deployment : deployments)
    {
      String name = deployment.getName();
      char fc = deployment.getName().charAt(0);

      if (fc >= '0' && fc <= '9')
      {
        long mod = 0;

        try {mod = Long.parseLong(name);}
        catch (Exception e) {;}

        if (mod > 0 && mod != this.modified)
        {
          File old = new File(this.deploy + sep + mod);
          delete(old);
        }
      }
    }
  }


  private void delete(File file)
  {
    File[] entries = file.listFiles();

    for(File entry : entries)
    {
      if (entry.isDirectory())
        delete(entry);

      entry.delete();
    }

    file.delete();
  }


  public static class StaticFile implements Serializable
  {
    public final String fileext;
    public final String virpath;
    public final String actpath;

    public final boolean cache;
    public final boolean compressed;

    private transient byte[] content = null;

    @SuppressWarnings("compatibility:-4436880408631246090")
    private static final long serialVersionUID = 5613263707445370115L;


    StaticFile(String virpath, String actpath, boolean cache, boolean compressed)
    {
      this.cache = cache;
      this.virpath = virpath;
      this.actpath = actpath;
      this.compressed = compressed;
      int pos = virpath.lastIndexOf('.');

      if (pos < 0) this.fileext = "";
      else this.fileext = virpath.substring(pos+1);
    }


    public byte[] get(boolean gzip) throws Exception
    {
      boolean usecache = true;
      if (compressed && !gzip) usecache = false;
      if (usecache && content != null) return(content);

      File file = new File(actpath);

      if (!file.exists())
        throw new Exception("File "+actpath+" not found");

      gzip = gzip && compressed;
      byte[] content = read(file,gzip);

      if (cache && usecache)
        this.content = content;

      return(content);
    }


    public String fileext()
    {
      return(fileext);
    }


    private byte[] read(File file, boolean gzip) throws Exception
    {
      byte[] content = new byte[(int) file.length()];
      FileInputStream in = new FileInputStream(file);

      int read = in.read(content);
      in.close();

      if (read != content.length)
        throw new Exception("Read "+actpath+" returned partial result");

      if (compressed && !gzip)
      {
        // Decompress
        ByteArrayInputStream bin = new ByteArrayInputStream(content);

        GZIPInputStream gzin = new GZIPInputStream(bin);
        content = gzin.readAllBytes();

        bin.close();
        gzin.close();
      }

      return(content);
    }
  }
}