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
import org.json.JSONTokener;
import java.io.FileInputStream;
import database.rest.security.PKIContext;
import java.util.concurrent.ConcurrentHashMap;


public class Config
{
  private final String inst;
  private final boolean full;
  private final String topconf;
  private final String dataconf;
  private final JSONObject config;

  private Java java = null;
  private Rest rest = null;
  private HTTP http = null;
  private Ports ports = null;
  private Logger logger = null;
  private Handlers handlers = null;
  private PKIContext pkictx = null;
  private Security security = null;
  private Topology topology = null;
  private Database database = null;

  private ConcurrentHashMap<String,JSONObject> sections =
    new ConcurrentHashMap<String,JSONObject>();


  public static int clientTimeout()
  {
    return(2000);
  }


  public static String path()
  {
    return(Paths.confdir + File.separator);
  }


  public static boolean windows()
  {
    String os = System.getProperty("os.name");
    return(os.toLowerCase().startsWith("win"));
  }


  public Config() throws Exception
  {
    this(true);
  }


  public Config(boolean full) throws Exception
  {
    this.full = full;
    String path = path() + "config.json";
    FileInputStream in = new FileInputStream(path);
    this.config  = new JSONObject(new JSONTokener(in));

    this.inst = get("instance");
    this.topconf = get("topology");
    this.dataconf = get("database");

    sections.put("http",getSection("http"));
    sections.put("rest",getSection("rest"));
    sections.put("logger",getSection("logger"));
    sections.put("security",getSection("security"));
    sections.put("topology",getSection("topology",topconf));
    sections.put("database",getSection("database",dataconf));

    Statics.init(this);
  }


  public String instance()
  {
    return(inst);
  }


  public synchronized Ports getPorts() throws Exception
  {
    if (ports != null) return(ports);
    ports = getHTTP().ports;
    return(ports);
  }


  public synchronized PKIContext getPKIContext() throws Exception
  {
    if (pkictx != null) return(pkictx);
    Security security = this.getSecurity();
    pkictx = new PKIContext(security.getIdentity(),security.getTrusted());
    return(pkictx);
  }


  public synchronized Java getJava() throws Exception
  {
    if (java != null) return(java);
    java = new Java(getSection(sections.get("topology"),"java"));
    return(java);
  }


  public synchronized HTTP getHTTP() throws Exception
  {
    if (http != null) return(http);
    if (full) handlers = new Handlers(this);
    http = new HTTP(handlers,sections.get("http"));
    return(http);
  }


  public synchronized Rest getREST() throws Exception
  {
    if (rest != null) return(rest);
    rest = new Rest(sections.get("rest"));
    return(rest);
  }


  public synchronized Logger getLogger() throws Exception
  {
    if (logger != null) return(logger);
    logger = new Logger(sections.get("logger"),inst);
    return(logger);
  }


  public synchronized Database getDatabase() throws Exception
  {
    if (database != null) return(database);
    database = new Database(sections.get("database"),this.full);
    return(database);
  }


  public synchronized Security getSecurity() throws Exception
  {
    if (security != null) return(security);
    security = new Security(sections.get("security"),this.full);
    return(security);
  }


  public synchronized Topology getTopology() throws Exception
  {
    if (topology != null) return(topology);
    topology = new Topology(sections.get("topology"));
    return(topology);
  }


  public static boolean has(JSONObject config, String attr)
  {
    return(config.has(attr));
  }


  @SuppressWarnings({ "unchecked", "cast" })
  public static <T> T get(JSONObject config, String attr)
  {
    return((T) config.get(attr));
  }


  @SuppressWarnings({ "unchecked", "cast" })
  public static <T> T getArray(JSONObject config, String attr)
  {
    return((T) config.getJSONArray(attr));
  }


  @SuppressWarnings({ "unchecked", "cast" })
  public static <T> T get(JSONObject config, String attr, T defval)
  {
    T value = defval;

    if (config.has(attr) && !config.isNull(attr))
      value = (T) config.get(attr);

    return(value);
  }


  public static JSONObject getSection(JSONObject config, String section) throws Exception
  {
    JSONObject conf = null;

    if (config.has(section))
      conf = config.getJSONObject(section);

    if (conf == null)
      System.err.println("Section <"+section+"> does not exist");

    return(conf);
  }


  public static String getPath(String path, String parent)
  {
    try
    {
      boolean rel = false;

      if (path.startsWith("./")) rel = true;
      else if (path.startsWith("../")) rel = true;
      else if (path.startsWith("." + File.separator)) rel = true;
      else if (path.startsWith(".." + File.separator)) rel = true;

      if (rel)
      {
        path = parent + File.separator + path;
        File appf = new File(path);
        path = appf.getCanonicalPath();
      }
    }
    catch (Exception e)
    {
      e.printStackTrace();
    }

    return(path);
  }


  @SuppressWarnings({ "unchecked", "cast" })
  private <T> T get(String attr)
  {
    return((T) config.get(attr));
  }


  private JSONObject getSection(String section) throws Exception
  {
    return(getSection(this.config,section));
  }


  private JSONObject getSection(String path, String fname) throws Exception
  {
    path = path() + path + File.separator + fname;
    FileInputStream in = new FileInputStream(path+".json");
    JSONObject config  = new JSONObject(new JSONTokener(in));
    return(config);
  }
}