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


public class Java
{
  private final String exe;
  private final String opts;
  private final String jars;
  private final String httpopts;
  private final String restopts;
  private final String httpjars;
  private final String restjars;


  Java(JSONObject config) throws Exception
  {
    this.opts = Config.get(config,"opts","");
    this.httpopts = Config.get(config,"http.opts","");
    this.restopts = Config.get(config,"rest.opts","");

    String exe = Config.get(config,"java",current());
    this.exe = exe + (Config.windows() ? ".exe" : "");

    String srvjars = Config.get(config,"jars","");
    String libpath = File.pathSeparator+Paths.libdir+File.separator;

    if (srvjars.length() > 0)
    {
      String path = "";
      String[] jars = srvjars.split(", ;:");

      for(String jar : jars)
        path += libpath+jar;

      srvjars = path;
    }

    String httpjars = Config.get(config,"http.jars","");

    if (httpjars.length() > 0)
    {
      String path = "";
      String[] jars = httpjars.split(", ;:");

      for(String jar : jars)
        path += libpath+jar;

      httpjars = path;
    }

    String restjars = Config.get(config,"rest.jars","");

    if (restjars.length() > 0)
    {
      String path = "";
      String[] jars = restjars.split(", ;:");

      for(String jar : jars)
        path += libpath+jar;

      restjars = path;
    }

    this.jars = srvjars;
    this.httpjars = httpjars;
    this.restjars = restjars;
  }


  private String current()
  {
    String home = System.getProperties().getProperty("java.home");
    String bindir = home + File.separator + "bin" + File.separator;
    return(bindir + "java");
  }


  public String exe()
  {
    return(exe);
  }

  public String getClassPath()
  {
    return(jars);
  }

  public String getOptions()
  {
    return(opts);
  }

  public String getHTTPClassPath()
  {
    return(httpjars);
  }

  public String getRESTClassPath()
  {
    return(restjars);
  }

  public String getHttpOptions()
  {
    return(httpopts);
  }

  public String getRestOptions()
  {
    return(restopts);
  }
}