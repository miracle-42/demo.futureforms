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
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.logging.FileHandler;
import database.rest.logger.Formatter;
import database.rest.security.Keystore;
import database.rest.security.PKIContext;


public class SSOConfig
{
  public final PKIContext pkictx;
  private final Formatter formatter = new Formatter();
  private final static int LOGSIZE = 10 * 1024 * 1024;
  private String logdir = "." + File.separator + "logs";
  public final static Logger logger = Logger.getLogger("sso");


  public SSOConfig() throws Exception
  {
    String path = path() + "ssoconfig.json";
    FileInputStream in = new FileInputStream(path);
    JSONObject config  = new JSONObject(new JSONTokener(in));

    initlogger(getSection(config,"logger"));
    this.pkictx = getPkiContext(getSection(config,"security"));
  }


  private void initlogger(JSONObject config) throws Exception
  {
    String path = Paths.apphome;
    String level = get(config,"level");

    int count = get(config,"files",1);
    String logdir = get(config,"path",this.logdir);

    String lfsize = get(config,"size",null);
    if (config.has("size")) lfsize = get(config,"size");

    int size = LOGSIZE;

    if (lfsize != null)
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

    File ldir = new File(logdir);

    if (ldir.exists() && !ldir.isDirectory())
      throw new Exception(ldir+" is not a directory");

    if (!ldir.exists())
      ldir.mkdirs();

    String lfile = logdir + File.separator + "sso.log";

    FileHandler handler = new FileHandler(lfile,size,count,true);
    handler.setFormatter(formatter);

    logger.setUseParentHandlers(false);
    logger.setLevel(Level.parse(level.toUpperCase()));

    logger.addHandler(handler);
  }


  private PKIContext getPkiContext(JSONObject config) throws Exception
  {
    String type = null;
    String file = null;
    String passwd = null;

    JSONObject identsec = getSection(config,"identity");

    type = get(identsec,"type");
    file = get(identsec,"keystore");
    passwd = get(identsec,"password");
    String alias = get(identsec,"alias");

    if (file.startsWith("."+File.separator) || file.startsWith("./"))
      file = Paths.apphome + File.separator + file;

    Keystore identity = new Keystore(file,type,alias,passwd);

    JSONObject trustsec = getSection(config,"trust");

    type = get(trustsec,"type");
    file = get(trustsec,"keystore");
    passwd = get(trustsec,"password");

    if (file.startsWith("."+File.separator) || file.startsWith("./"))
      file = Paths.apphome + File.separator + file;

    Keystore trust = new Keystore(file,type,null,passwd);

    return(new PKIContext(identity,trust));
  }


  public static String path()
  {
    return(Paths.confdir + File.separator);
  }


  @SuppressWarnings({ "unchecked", "cast" })
  public static <T> T get(JSONObject config, String attr)
  {
    return((T) config.get(attr));
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
}