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

import java.net.URL;
import java.io.File;
import java.nio.file.Path;


public class Paths
{
  public static final String ipcdir;
  public static final String libdir;
  public static final String tmpdir;
  public static final String apphome;
  public static final String confdir;

  private static final String LIBDIR = "lib";
  private static final String IPCDIR = "ipc";
  private static final String TMPDIR = "tmp";
  private static final String CONFDIR = "conf";


  static
  {
    apphome = findAppHome();
    libdir = apphome + File.separator + LIBDIR;
    ipcdir = apphome + File.separator + IPCDIR;
    tmpdir = apphome + File.separator + TMPDIR;
    confdir = apphome + File.separator + CONFDIR;
  }


  private static String findAppHome()
  {
    String sep = File.separator;
    Object obj = new Object() { };

    String cname = obj.getClass().getEnclosingClass().getName();
    cname = "/" + cname.replace('.','/') + ".class";

    URL url = obj.getClass().getResource(cname);
    String path = url.getPath();

    if (url.getProtocol().equals("jar") || url.getProtocol().equals("code-source"))
    {
      path = path.substring(5); // get rid of "file:"
      path = path.substring(0,path.indexOf("!")); // get rid of "!class"
      path = path.substring(0,path.lastIndexOf("/")); // get rid jarname
    }
    else
    {
      path = path.substring(0,path.length()-cname.length());
      if (path.endsWith("/classes")) path = path.substring(0,path.length()-8);
      if (path.endsWith("/target")) path = path.substring(0,path.length()-7);
    }

    String escape = "\\";
    if (sep.equals(escape))
    {
      // Windows
      if (path.startsWith("/") && path.charAt(2) == ':')
        path = path.substring(1);

      path = path.replaceAll("/",escape+sep);
    }

    File cw = new File(".");
    Path abs = java.nio.file.Paths.get(path);
    Path base = java.nio.file.Paths.get(cw.getAbsolutePath());

    path = base.relativize(abs).toString();
    if (path.length() == 0) path = abs.toString();

    // Back until conf folder

    while(true)
    {
      String conf = path+sep+"conf";

      File test = new File(conf);
      if (test.exists()) break;

      int pos = path.lastIndexOf(sep);

      if (pos < 0)
      {
        path = base.toString();
        path = path.substring(0,path.length()-2);
        break;
      }

      path = path.substring(0,pos);
    }

    if (path.startsWith("."))
    {
      path = cw.getAbsolutePath() + sep + path;
      abs = java.nio.file.Paths.get(path).normalize();
      path = abs.toString();
    }

    return(path);
  }
}