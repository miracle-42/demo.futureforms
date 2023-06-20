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

import java.util.Map;
import java.sql.Types;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.logging.Logger;
import java.util.concurrent.ConcurrentHashMap;


public class SQLTypes
{
  private final static Logger logger =
    Logger.getLogger("rest");

  public static final ConcurrentHashMap<String,Integer> types =
    new ConcurrentHashMap<String,Integer>();

  public static final ConcurrentHashMap<Integer,String> names =
    new ConcurrentHashMap<Integer,String>();

  static
  {
    types.put("INT",Types.TINYINT);
    types.put("INTEGER",Types.INTEGER);
    types.put("SMALLINT",Types.SMALLINT);

    types.put("LONG",Types.BIGINT);

    types.put("FLOAT",Types.FLOAT);
    types.put("DOUBLE",Types.DOUBLE);

    types.put("NUMBER",Types.DECIMAL);
    types.put("NUMERIC",Types.DECIMAL);
    types.put("DECIMAL",Types.DECIMAL);

    types.put("DATE",Types.DATE);
    types.put("DATETIME",Types.TIMESTAMP);
    types.put("TIMESTAMP",Types.TIMESTAMP);

    types.put("STRING",Types.VARCHAR);
    types.put("VARCHAR",Types.VARCHAR);
    types.put("VARCHAR2",Types.VARCHAR);
    types.put("TEXT",Types.LONGNVARCHAR);

    types.put("BOOLEAN",Types.BOOLEAN);

    names.put(1,"STRING");
    names.put(2,"NUMERIC");

    for(Map.Entry<String,Integer> entry : types.entrySet())
      names.put(entry.getValue(),entry.getKey());
  }


  public static String getName(int type)
  {
    String name = names.get(type);

    if (name == null)
    {
      name = "NA";
      logger.warning("Unknow sqltype "+type);
    }

    return(name);
  }


  public static Integer getType(String type)
  {
    Integer sqlt = type == null ? null : types.get(type.toUpperCase());

    if (sqlt == null)
    {
      logger.warning("Unknow sqltype "+type);
      sqlt = Types.VARCHAR;
    }

    return(sqlt);
  }


  public static Integer getType(Object value)
  {
    if (value == null)
      return(-1);

    if (value instanceof Boolean)
      return(Types.BOOLEAN);

    if (value instanceof Long)
      return(Types.BIGINT);

    if (value instanceof Short)
      return(Types.SMALLINT);

    if (value instanceof Integer)
      return(Types.INTEGER);

    if (value instanceof Float)
      return(Types.FLOAT);

    if (value instanceof Double)
      return(Types.DOUBLE);

    if (value instanceof BigInteger)
      return(Types.DECIMAL);

    if (value instanceof BigDecimal)
      return(Types.DECIMAL);

    return(Types.VARCHAR);
  }

  public static boolean isDate(int type)
  {
    if (type == Types.DATE || type == Types.TIMESTAMP)
      return(true);

    return(false);
  }

  public static boolean isDate(String type)
  {
    type = type.toUpperCase();

    if (type.startsWith("DATE") || type.equals("TIMESTAMP"))
      return(true);

    return(false);
  }
}