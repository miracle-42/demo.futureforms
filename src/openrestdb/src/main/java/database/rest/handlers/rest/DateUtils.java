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

import java.time.ZoneId;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;


public class DateUtils
{
  public static boolean isDate(Object date)
  {
    if (date instanceof java.sql.Date || date instanceof java.util.Date) return(true);
    return(false);
  }


  public static long getTime(Object date)
  {
    if (date instanceof java.sql.Date) return(((java.sql.Date) date).getTime());
    if (date instanceof java.util.Date) return(((java.util.Date) date).getTime());
    return(0);
  }


  public static String format(DateTimeFormatter formatter, Object object)
  {
    java.util.Date date = null;

    if (object instanceof java.util.Date)
      date = (java.util.Date) object;

    if (object instanceof java.sql.Date)
      date = new java.util.Date(((java.sql.Date) object).getTime());

    if (date == null)
      return(null);

    LocalDateTime locd = LocalDateTime.ofInstant(date.toInstant(),ZoneId.systemDefault());
    return(formatter.format(locd));
  }
}