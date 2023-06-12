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
import java.util.logging.Logger;
import database.rest.config.Config;
import database.rest.handlers.Handler;
import database.rest.config.Handlers.HandlerProperties;


public class PathUtil
{
  private final HandlerProperties properties;
  private final Logger logger = Logger.getLogger("http");


  public PathUtil(Handler handler) throws Exception
  {
    this.properties = handler.properties();
  }


  public String getPath(String urlpath)
  {
    String prefix = properties.prefix();

    if (prefix.length() > urlpath.length()) return(null);
    String path = "/"+urlpath.substring(prefix.length());

    path = path.replaceAll("//","/");

    while(path.length() > 1 && path.endsWith("/"))
      path = path.substring(0,path.length()-1);

    return(path);
  }


  public boolean checkPath(String path)
  {
    try
    {
      File p = new File("/mnt"+path);

      if (Config.windows())
      {
        // Remove drive letter
        if (p.getCanonicalPath().substring(2).startsWith("\\mnt"))
          return(true);
      }
      else
      {
        if (p.getCanonicalPath().startsWith("/mnt"))
          return(true);
      }

      logger.warning("Page "+path+" looks insecure");
      return(false);
    }
    catch (Exception e)
    {
      return(false);
    }
  }
}