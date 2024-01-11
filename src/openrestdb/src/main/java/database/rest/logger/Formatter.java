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

package database.rest.logger;

import java.util.Date;
import java.io.PrintStream;
import java.text.SimpleDateFormat;
import java.util.logging.LogRecord;
import java.io.ByteArrayOutputStream;


public class Formatter extends java.util.logging.Formatter
{
  private final static String nl = System.lineSeparator();
  private final static SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");


  @Override
  public String format(LogRecord record)
  {
    String date = df.format(new Date());
    String location = record.getSourceClassName()+"."+record.getSourceMethodName();
    location = location.substring("database.rest.".length());

    String message = ": "+record.getMessage();
    String level = String.format("%-7s",record.getLevel().toString());
    String source = String.format("%-48s",location);

    StringBuffer entry = new StringBuffer();
    boolean exception = (record.getThrown() != null);

    entry.append(date);

    if (!exception)
    {
      entry.append(" "+level);
      entry.append(" "+source);
    }
    else
    {
      ByteArrayOutputStream out = new ByteArrayOutputStream();
      record.getThrown().printStackTrace(new PrintStream(out));
      message = " SEVERE  "+source+":"+nl+nl+new String(out.toByteArray());
    }

    entry.append(message+nl);
    return(entry.toString());
  }
}