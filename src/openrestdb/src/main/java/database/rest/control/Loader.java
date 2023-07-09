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

import java.util.HashSet;
import java.util.HashMap;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.jar.JarFile;
import java.util.jar.JarEntry;
import java.io.ByteArrayOutputStream;


/**
 *
 * Dynamic ClassLoader that can used directly from within standard code.
 * The entrypoints (getClass(cname)) must implement an interface that is
 * skipped from the loader. Otherwise a cast will fail since the interface
 * from loader has a different signature than the code itself.
 *
 */
public class Loader extends ClassLoader
{
  private final HashSet<String> skip =
    new HashSet<String>();

  private final HashMap<String,Class<?>> classes =
    new HashMap<String,Class<?>>();


  public Loader(Class<?>... skip)
  {
    super(null);
    for(Class<?> skc : skip)
      this.skip.add(skc.getName());
  }


  @Override
  protected Class<?> findClass(String name) throws ClassNotFoundException
  {
    Class<?> clazz = classes.get(name);
    if (clazz != null) return(clazz);
    return(getSystemClassLoader().loadClass(name));
  }


  public Class<?> getClass(Class<?> clazz) throws Exception
  {
    return(findClass(clazz.getName().replace('.','/')));
  }


  public void add(Class<?> clazz) throws Exception
  {
    load(clazz);
  }


  public void load(String jar) throws Exception
  {
    ArrayList<Definition> failed =
      new ArrayList<Definition>();

    JarFile jarfile = new JarFile(jar);
    Enumeration<JarEntry> flist = jarfile.entries();

    while (flist.hasMoreElements())
    {
      JarEntry entry = flist.nextElement();

      if (entry.getName().endsWith(".class"))
      {
        String name = entry.getName();
        name = name.substring(0,name.length()-6);

        String qname = name.replace('/','.');

        if (skip.contains(qname))
          continue;

        InputStream in = jarfile.getInputStream(entry);
        byte[] bcode = new byte[(int) entry.getSize()];

        in.read(bcode);
        in.close();

        Definition cdef = new Definition(name,qname,bcode);

        Class<?> clazz = trydefine(cdef);

        if (clazz == null) failed.add(cdef);
        else               classes.put(name,clazz);
      }
    }

    jarfile.close();

    for (int i = 0; i < 16 && failed.size() > 0; i++)
    {
      for (int j = 0; j < failed.size(); j++)
      {
        Definition cdef = failed.get(j);
        Class<?> clazz = trydefine(cdef);

        if (clazz != null)
        {
          failed.remove(j--);
          classes.put(cdef.name,clazz);
        }
      }
    }

    if (failed.size() > 0)
    {
      for(Definition def : failed)
        System.err.println("Could not load "+def.qname);

      throw new Exception("Loading of "+jar+" failed");
    }
  }


  private void load(Class<?> local) throws Exception
  {
    String name = local.getName().replace('.','/');

    ByteArrayOutputStream out = new ByteArrayOutputStream();
    InputStream in = local.getResourceAsStream("/"+name+".class");

    int read = 0;
    byte[] buf = new byte[4096];

    while(read >= 0)
    {
      if (read > 0) out.write(buf,0,read);
      read = in.read(buf);
    }

    in.close();
    byte[] bcode = out.toByteArray();

    Definition cdef = new Definition(name,local.getName(),bcode);

    Class<?> clazz = trydefine(cdef);

    if (clazz == null)
      throw new Exception("Unable to add "+local.getName()+" definition to Loader");

    classes.put(name,clazz);
  }


  private Class<?> trydefine(Definition cdef)
  {
    try
    {
      Class<?> clazz = this.defineClass(cdef.qname,cdef.bcode,0,cdef.bcode.length);;
      return(clazz);
    }
    catch (Throwable e)
    {
      return(null);
    }
  }


  private static class Definition
  {
    private final String name;
    private final String qname;
    private final byte[] bcode;

    Definition(String name, String qname, byte[] bcode)
    {
      this.name = name;
      this.qname = qname;
      this.bcode = bcode;
    }
  }
}