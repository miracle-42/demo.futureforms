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

import java.util.HashSet;
import java.util.ArrayList;
import java.util.Collections;
import java.lang.reflect.Constructor;
import database.rest.handlers.Handler;
import database.rest.handlers.FileHandler;
import database.rest.handlers.RestHandler;
import database.rest.handlers.AdminHandler;


public class Handlers
{
  private final Config config;
  private final ArrayList<HandlerClass> entries = new ArrayList<HandlerClass>();

  private RestHandler rest = null;
  private FileHandler file = null;
  private AdminHandler admin = null;


  Handlers(Config config)
  {
    this.config = config;
  }


  void finish() throws Exception
  {
    Collections.sort(this.entries);

    this.admin = new AdminHandler(config,null);

    for(HandlerClass hdl : this.entries)
    {
      switch(hdl.name())
      {
        case "database.rest.handlers.FileHandler" :
          this.file = (FileHandler) hdl.handler;
          break;

        case "database.rest.handlers.RestHandler" :
          this.rest = (RestHandler) hdl.handler;
          break;
      }
    }
  }


  void add(String prefix, String methods, String clazz) throws Exception
  {
    if (!prefix.endsWith("/")) prefix += "/";
    this.entries.add(new HandlerClass(config,prefix,methods,clazz));
  }


  public RestHandler getRESTHandler()
  {
    return(rest);
  }


  public FileHandler getFileHandler()
  {
    return(file);
  }


  public AdminHandler getAdminHandler()
  {
    return(admin);
  }


  public Handler getHandler(String path, String method)
  {
    path += "/";

    for(HandlerClass entry : entries)
    {
      if (path.startsWith(entry.prefix))
      {
        if (entry.methods.contains(method))
          return(entry.handler);
      }
    }

    return(null);
  }


  public static class HandlerProperties
  {
    private final String prefix;
    private final HashSet<String> methods;


    private HandlerProperties(String prefix, HashSet<String> methods)
    {
      this.prefix = prefix;
      this.methods = methods;
    }


    public String prefix()
    {
      return(prefix);
    }


    public HashSet<String> methods()
    {
      return(methods);
    }
  }


  private static class HandlerClass implements Comparable<HandlerClass>
  {
    public final String prefix;
    public final Handler handler;
    public final HashSet<String> methods = new HashSet<String>();


    HandlerClass(Config config, String prefix, String methods, String clazz) throws Exception
    {
      this.prefix = prefix;
      String meth[] = methods.split(",");
      for(String m : meth)
      {
        m = m.trim();

        if (m.length() > 0)
          this.methods.add(m.toUpperCase());
      }

      HandlerProperties properties = new HandlerProperties(prefix,this.methods);
      Constructor<?> contructor = Class.forName(clazz).getDeclaredConstructor(Config.class,HandlerProperties.class);

      this.handler = (Handler) contructor.newInstance(config,properties);
    }


    public String name()
    {
      return(handler.getClass().getName());
    }


    @Override
    public String toString()
    {
      return(prefix+" "+methods+" "+handler.getClass().getName());
    }


    @Override
    public int compareTo(HandlerClass another)
    {
      return(another.prefix.length() - this.prefix.length());
    }
  }
}