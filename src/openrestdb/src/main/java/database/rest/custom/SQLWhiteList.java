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

package database.rest.custom;

import java.util.HashSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.ArrayList;


public class SQLWhiteList
{
   private final boolean ignorecase;
   private final HashSet<String> allowed;


   public SQLWhiteList()
   {
      this(true);
   }

   public SQLWhiteList(boolean ignorecase)
   {
      this.ignorecase = ignorecase;
      this.allowed = new HashSet<String>();
   }

   public void add(String sql)
   {
      add(sql,true);
   }

   public void add(String sql, boolean normalize)
   {
      if (normalize) sql = normalize(sql);
      allowed.add(sql);
   }

   public void remove(String sql)
   {
      remove(sql,true);
   }

   public void remove(String sql, boolean normalize)
   {
      if (normalize) sql = normalize(sql);
      allowed.remove(sql);
   }

   public boolean has(String sql)
   {
      return(has(sql,true));
   }

   public boolean has(String sql, boolean normalize)
   {
      if (normalize) sql = normalize(sql);
      return(allowed.contains(sql));
   }

   public String normalize(String sql)
   {
      return(SQLStringParser.normalize(sql,ignorecase));
   }
}
