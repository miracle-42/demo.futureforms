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

package database.rest.database;

import java.sql.Date;


public class BindValueDef
{
  public final int type;
  public final String name;
  public final Object value;
  public final boolean outval;

  public BindValueDef(String name, Object value)
  {
    this.name = name;
    this.value = value;
    this.outval = false;
    this.type = SQLTypes.getType(value);
  }

  public BindValueDef(String name, String type, boolean outval)
  {
    this.name = name;
    this.value = null;
    this.outval = outval;
    this.type = SQLTypes.getType(type);
  }

  public BindValueDef(String name, String type, boolean outval, Object value)
  {
    this.name = name;
    this.outval = outval;
    this.value = convert(type,value);
    this.type = SQLTypes.getType(type);
  }

  public String getType()
  {
    String name = SQLTypes.getName(type);
    if (name != null) name = name.toLowerCase();
    return(name);
  }

  public boolean isDate()
  {
    return(SQLTypes.isDate(type));
  }

  public BindValue copy(boolean out)
  {
    return(new BindValue(this,out));
  }

  private Object convert(String type, Object value)
  {
    if (value == null || !(value instanceof Long))
      return(value);

    if (SQLTypes.isDate(type))
        value = new Date((Long) value);

    return(value);
  }
}