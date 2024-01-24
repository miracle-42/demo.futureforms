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

import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SQLStringParser
{
   public static ArrayList<String> split(String sql)
   {
      return(split(sql,true));
   }

   public static boolean embedded(String sql)
   {
      int fromclauses = 0;

      Pattern pattern = Pattern.compile("\\.* from ");
      Matcher matcher = pattern.matcher(sql);

      while(matcher.find()) fromclauses++;
      return(fromclauses == 1);
   }

   public static ArrayList<String> split(String sql, boolean normalize)
   {
      if (normalize) sql = normalize(sql,true);
      ArrayList<String> sections = new ArrayList<String>();

      String type = getSQLType(sql,false);

      switch (type)
      {
         case "select":
            sections = parseSelect(sql);
            break;

         case "update":
            sections = parseUpdate(sql);
            break;

         case "delete":
            sections = parseDelete(sql);
            break;

         default:
            break;
      }

      return(sections);
   }

   public static String getSQLType(String sql)
   {
      return(getSQLType(sql,true));
   }

   public static String getSQLType(String sql, boolean normalize)
   {
      String type = "unknown";
      if (normalize) sql = normalize(sql,true);

      int pos = sql.indexOf(' ');

      if (pos > 0)
      {
         String cmd = sql.substring(0,pos).trim();

         if (cmd.equalsIgnoreCase("select")) type = "select";
         else if (cmd.equalsIgnoreCase("merge")) type = "merge";
         else if (cmd.equalsIgnoreCase("upsert")) type = "upsert";
         else if (cmd.equalsIgnoreCase("insert")) type = "insert";
         else if (cmd.equalsIgnoreCase("insert")) type = "insert";
         else if (cmd.equalsIgnoreCase("update")) type = "update";
         else if (cmd.equalsIgnoreCase("delete")) type = "delete";
      }

      return(type);
   }

   public static String normalize(String sql, boolean ignorecase)
   {
      sql = sql.replaceAll("\n"," ");
      sql = sql.replaceAll("\\s+"," ");
      sql = sql.replaceAll("\\s+,",",");
      sql = sql.replaceAll(",\\s+",", ");

      if (ignorecase)
         sql = sql.toLowerCase();

      return(sql.trim());
   }

   private static ArrayList<String> parseSelect(String sql)
   {
      int end = 0;
      int from = -1;
      int where = -1;
      int group = -1;
      int order = -1;
      String lower = null;
      String section = null;

      lower = sql.toLowerCase();
      ArrayList<String> sections = new ArrayList<String>();

      from = find(lower,"from");
      where = find(lower,"where");
      group = find(lower,"group by");
      order = find(lower,"order by");

      if (from > 0) end = from;
      else if (where > 0) end = where;
      else if (group > 0) end = group;
      else if (order > 0) end = order;
      else end = sql.length() + 1;

      section = sql.substring(0,end-1);
      sections.add(section);

      if (from > 0)
      {
         if (where > 0) end = where;
         else if (group > 0) end = group;
         else if (order > 0) end = order;
         else end = sql.length() + 1;

         section = sql.substring(from,end-1);
         sections.add(section);
      }

      if (where > 0)
      {
         if (group > 0) end = group;
         else if (order > 0) end = order;
         else end = sql.length() + 1;

         section = sql.substring(where,end-1);
         sections.add(section);
      }

      if (group > 0)
      {
         if (order > 0) end = order;
         else end = sql.length() + 1;

         section = sql.substring(group,end-1);
         sections.add(section);
      }

      if (order > 0)
      {
         end = sql.length() + 1;
         section = sql.substring(order,end-1);
         sections.add(section);
      }

      return(sections);
   }

   private static ArrayList<String> parseUpdate(String sql)
   {
      int end = 0;
      int set = -1;
      int where = -1;

      String lower = null;
      String section = null;

      lower = sql.toLowerCase();
      ArrayList<String> sections = new ArrayList<String>();

      set = find(lower,"set");
      where = find(lower,"where");

      if (set > 0) end = set;
      else if (where > 0) end = where;
      else end = sql.length() + 1;

      section = sql.substring(0,end-1);
      sections.add(section);

      if (set > 0)
      {
         if (where > 0) end = where;
         else end = sql.length() + 1;

         section = sql.substring(set,end-1);
         sections.add(section);
      }

      if (where > 0)
      {
         end = sql.length() + 1;
         section = sql.substring(where,end-1);
         sections.add(section);
      }

      return(sections);
   }

   private static ArrayList<String> parseDelete(String sql)
   {
      int end = 0;
      int where = -1;

      String lower = null;
      String section = null;

      lower = sql.toLowerCase();
      ArrayList<String> sections = new ArrayList<String>();

      where = find(lower,"where");

      if (where > 0) end = where;
      else end = sql.length() + 1;

      section = sql.substring(0,end-1);
      sections.add(section);

      if (where > 0)
      {
         end = sql.length() + 1;
         section = sql.substring(where,end-1);
         sections.add(section);
      }

      return(sections);
   }

   private static int find(String sql, String word)
   {
      int pos = -1;

      Pattern pattern = Pattern.compile("\\.* "+word+" ");
      Matcher matcher = pattern.matcher(sql);

      if (matcher.find()) pos = matcher.start() + 1;
      return(pos);
   }
}
