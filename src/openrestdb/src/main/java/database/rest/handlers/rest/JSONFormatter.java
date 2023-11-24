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

package database.rest.handlers.rest;

import org.json.JSONObject;
import java.util.ArrayList;
import java.math.BigDecimal;
import java.math.BigInteger;


public class JSONFormatter
{
  private Content content = null;


  public JSONFormatter()
  {
    this(Type.Object);
  }


  public JSONFormatter(Type type)
  {
    content = new Content(type);
  }


  public void success(boolean success)
  {
    content.status(success);
  }


  public void fatal(String message)
  {
    content.fatal(message);
  }


  public void pop()
  {
    content = content.parent;
  }


  public void push(String name)
  {
    content = content.push(name,Type.Object);
  }


  public void push(String name, Type type)
  {
    content = content.push(name,type);
  }


  public void set(Throwable err)
  {
    content.set(err);
  }


  public void add(Object[] values)
  {
    content.add(values);
  }


  public void add(ArrayList<Object[]> list)
  {
    content.add(list.toArray(new Object[0][]));
  }


  public void add(String name, Object value)
  {
    content.add(name,value);
  }


  public void add(String[] name, Object[] value)
  {
    content.add(name,value);
  }


  @Override
  public String toString()
  {
    Content content = this.content;

    while(content.parent != null)
      content = content.parent;

    return(content.persist());
  }


  private static class Content
  {
    private final Type type;
    private final String name;
    private final Content parent;

    private final static String nl =
      System.lineSeparator();

    private final ArrayList<Object> content =
      new ArrayList<Object>();

    Content(Type type)
    {
      this(null,type,null);
    }

    private Content(Content parent, Type type, String name)
    {
      this.name = name;
      this.type = type;
      this.parent = parent;
    }

    Content push(String name, Type type)
    {
      Content next = new Content(this,type,name);
      content.add(next);
      return(next);
    }

    void status(boolean success)
    {
      String name = "success";
      content.add(0,new Object[] {name,success});
    }

   void fatal(String message)
   {
     content.add(0,new Object[] {"fatal",true});
     if (message != null) content.add(new Object[] {"error",message});
   }

    void add(Object[] array)
    {
      content.add(array);
    }

    void add(String name, Object value)
    {
      content.add(new Object[] {name,value});
    }

    void add(String[] name, Object[] value)
    {
      content.add(new Object[][] {name,value});
    }

    void set(Throwable err)
    {
      String message = err.getMessage();
      if (message == null) message = "An unexpected error has occured";
      add("message",message);
    }


    String persist()
    {
      return(persist(this,0));
    }


    private String persist(Content node, int level)
    {
      if (node.type == Type.Matrix)
        return(persistMatrix(node,level));

      if (node.type == Type.SimpleArray)
        return(persistSimpleArray(node,level));

      if (node.type == Type.ObjectArray)
        return(persistObjectArray(node,level));

      String lev = "";
      if (level > 0) lev = String.format("%"+(2*level)+"s"," ");

      String str = "";
      String ind = lev + "  ";

      if (level > 0) str += nl;
      str += lev + "{" + nl;

      int elements = node.content.size();

      for (int i = 0; i < elements; i++)
      {
        Object elem = node.content.get(i);

        String comm = "";
        if (i < elements - 1) comm = ",";

        String newl = "";
        if (i > 0) newl = nl;

        if (elem instanceof Content)
        {
          Content next = (Content) elem;
          str += newl + ind + quote(next.name)+":";
          str += persist(next,level+1)+comm;
        }
        else
        {
          Object[] nvp = (Object[]) elem;
          str += newl + ind + quote(nvp[0])+": "+escape(nvp[1])+comm;
        }
      }

      str += nl + lev + "}";
      return(str);
    }


    String persistObjectArray(Content node, int level)
    {
      String lev = "";
      if (level > 0) lev = String.format("%"+(2*level)+"s"," ");

      String str = "";
      String ind = lev + "  ";

      if (level > 0) str += nl;
      str += lev + "[" + nl;

      int elements = node.content.size();

      for (int i = 0; i < elements; i++)
      {
        Object elem = node.content.get(i);

        String comm = "";
        if (i < elements - 1) comm = ",";

        String newl = "";
        if (i > 0) newl = nl;

        if (elem instanceof Content)
        {
          Content next = (Content) elem;
          str += newl + ind + quote(next.name)+":";
          str += persist(next,level+1)+comm;
        }
        else
        {
          Object[][] row = (Object[][]) elem;

          Object[] names = row[0];
          Object[] values = row[1];

          str += newl + ind + "{";

          for (int j = 0; j < names.length; j++)
          {
            String next = "";
            if (j < names.length - 1) next = ",";

            Object name = names[j];
            Object value = values[j];

            str += quote(name)+": "+escape(value)+next;
          }

          str += "}" + comm;
        }
      }

      str += nl + lev + "]";
      return(str);
    }


    String persistSimpleArray(Content node, int level)
    {
      String lev = "";
      if (level > 0) lev = String.format("%"+(2*level)+"s"," ");

      String str = lev + "[";

      Object elem = node.content.get(0);
      Object[] values = (Object[]) elem;

      for (int j = 0; j < values.length; j++)
      {
        String next = "";
        if (j < values.length - 1) next = ",";

        Object value = values[j];
        str += escape(value)+next;
      }

      str += "]";
      return(str);
    }


    String persistMatrix(Content node, int level)
    {
      String lev = "";
      if (level > 0) lev = String.format("%"+(2*level)+"s"," ");

      String ind = lev + "  ";
      String str = nl + lev + "[";

      Object[][] rows = (Object[][]) node.content.get(0);

      for (int i = 0; i < rows.length; i++)
      {
        String comm = "";
        if (i < rows.length - 1) comm = ",";

        str += nl + ind + "[";

        Object[] cols = rows[i];
        for (int j = 0; j < cols.length; j++)
        {
          String next = "";
          if (j < cols.length-1) next = ",";
          str += escape(cols[j])+next;
        }

        str += "]" + comm;
      }

      str += nl + lev + "]";
      return(str);
    }

    String escape(Object value)
    {
      if (value == null)
        return("null");

      if (value instanceof Boolean)
        return(value.toString());

      if (value instanceof Long)
        return(value.toString());

      if (value instanceof Integer)
        return(value.toString());

      if (value instanceof Float)
        return(value.toString());

      if (value instanceof Double)
        return(value.toString());

      if (value instanceof BigInteger)
        return(value.toString());

      if (value instanceof BigDecimal)
        return(value.toString());

      value = JSONObject.quote(value.toString());
      return(value.toString());
    }


    String quote(Object str)
    {
      return("\""+str+"\"");
    }
 }


  public static enum Type
  {
    Object,
    Matrix,
    ObjectArray,
    SimpleArray,
  }
}