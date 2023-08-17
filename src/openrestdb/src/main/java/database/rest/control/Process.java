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
import java.util.logging.Level;
import java.util.logging.Logger;
import database.rest.config.Paths;
import database.rest.config.Config;


public class Process
{
  private final int servers;
  private final String opts;
  private final String jars;
  private final String instnm;
  private final String javaexe;
  private final String httpopts;
  private final String restopts;
  private final String httpjars;
  private final String restjars;
  private final static String psep = File.pathSeparator;
  private final Logger logger = Logger.getLogger("internal");


  public Process(Config config) throws Exception
  {
    this.instnm = config.instance();
    this.javaexe = config.getJava().exe();
    this.servers = config.getTopology().servers;

    this.opts = config.getJava().getOptions();
    this.jars = config.getJava().getClassPath();

    this.httpopts = config.getJava().getHttpOptions();
    this.restopts = config.getJava().getRestOptions();
    this.httpjars = config.getJava().getHTTPClassPath();
    this.restjars = config.getJava().getRESTClassPath();
  }


  public void start(Type type, int inst)
  {
    String jars = null;
    String options = null;

    if (type == Type.http) jars = httpjars;
    else                   jars = restjars;

    if (type == Type.http) options = httpopts;
    else                   options = restopts;

    boolean embedded = servers <= 0;

    if (embedded)
    {
      jars = this.jars;
      options = this.opts;
    }

    logger.fine("Starting "+type+" instance "+instnm+"["+inst+"]");
    String classpath = classpath(type != Type.http || embedded) + jars;
    String cmd = this.javaexe + " -cp " + classpath + " " + options + " database.rest.servers.Server " + instnm + " " + inst;

    logger.finest(cmd);
    try {Runtime.getRuntime().exec(cmd);}
    catch (Exception e) {logger.log(Level.SEVERE,e.getMessage(),e);}
  }


  private String classpath(boolean jdbc)
  {
    String classpath = "";
    String path = Paths.libdir;

    File dir = new File(path);
    String[] jars = dir.list();

    for(String jar : jars)
    {
      if (jar.startsWith("openrestdb"))
        classpath = path + File.separator + jar;
    }

    classpath += classpath("json");
    if (jdbc) classpath += classpath("jdbc");

    return(classpath);
  }


  private String classpath(String sub)
  {
    String classpath = "";
    String path = Paths.libdir+File.separator+sub;

    File dir = new File(path);
    String[] jars = dir.list();

    for(String jar : jars)
      classpath += psep + path + File.separator + jar;

    return(classpath);
  }


  public static enum Type
  {
    http,
    rest
  }
}