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

import java.util.HashMap;
import java.sql.ResultSet;
import java.sql.Savepoint;
import java.sql.Statement;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.Properties;
import java.sql.DriverManager;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSetMetaData;
import java.time.format.DateTimeFormatter;
import database.rest.handlers.rest.DateUtils;
import java.util.concurrent.atomic.AtomicInteger;


public abstract class Database
{
  private final int id;
  private Connection conn;
  private long touched = 0;
  private boolean dangling = false;

  private static String url;
  private static String teststmt;
  private static AtomicInteger next = new AtomicInteger(0);
  private final static Logger logger = Logger.getLogger("rest");


  public static String getUrl()
  {
    return(Database.url);
  }


  public static void setUrl(String url)
  {
    Database.url = url;
  }


  public static String getTestSQL()
  {
    return(Database.teststmt);
  }


  public static void setTestSQL(String test)
  {
    Database.teststmt = test;
  }


  public Database()
  {
    id = next.getAndIncrement();
    touched = System.currentTimeMillis();
  }


  public int id()
  {
    return(id);
  }


  public final void touch()
  {
    touched = System.currentTimeMillis();
  }


  public final long touched()
  {
    return(touched);
  }


  public boolean dangling()
  {
    return(dangling);
  }


  public void dangling(boolean flag)
  {
    dangling = flag;
  }


  public Connection connection()
  {
    return(conn);
  }


  public boolean connected()
  {
    return(conn != null);
  }


  public void disconnect()
  {
    try {conn.close();}
    catch (Exception e) {;}
    finally {this.conn = null;}
  }


  public boolean getAutoCommit() throws Exception
  {
    return(conn.getAutoCommit());
  }


  public void setAutoCommit(boolean on) throws Exception
  {
    conn.setAutoCommit(on);
  }


  public void setClientInfo(ArrayList<NameValuePair<Object>> clientinfo) throws Exception
  {
    if (clientinfo != null)
    {
      Properties props = new Properties();

      for(NameValuePair<Object> entry : clientinfo)
        props.setProperty(entry.getName(),entry.getValue()+"");

      conn.setClientInfo(props);
    }
  }


  public void clearClientInfo(ArrayList<NameValuePair<Object>> clientinfo) throws Exception
  {
    if (clientinfo != null)
      conn.setClientInfo(new Properties());
  }


  public void commit() throws Exception
  {
    conn.commit();
  }


  public void rollback() throws Exception
  {
    conn.rollback();
  }


  public void connect(String username, String password) throws Exception
  {
    String url = DatabaseUtils.bind(username,password);
    this.conn = DriverManager.getConnection(url);
    touched = System.currentTimeMillis();
  }


  public Savepoint setSavePoint() throws Exception
  {
    return(conn.setSavepoint());
  }


  public void releaseSavePoint(Savepoint savepoint, boolean rollback) throws Exception
  {
    if (rollback) conn.rollback(savepoint);
    else  conn.releaseSavepoint(savepoint);
  }


  public boolean validate()
  {
    return(validate(true));
  }


  public boolean validate(boolean log)
  {
    try
    {
      String sql = getTestSQL();

      PreparedStatement stmt =
        conn.prepareStatement(sql);

      ResultSet rset =
        stmt.executeQuery();

      rset.next();
      rset.close();
      stmt.close();

      return(true);
    }
    catch (Exception e)
    {
      if (log) logger.log(Level.WARNING,e.getMessage(),e);
      return(false);
    }
  }


  public PreparedStatement prepare(String sql, ArrayList<BindValue> bindvalues, String dateform) throws Exception
  {
    PreparedStatement stmt = conn.prepareStatement(sql);

    for (int i = 0; i < bindvalues.size(); i++)
    {
      BindValue b = bindvalues.get(i);

      try {stmt.setObject(i+1,b.getValue(),b.getType());}
      catch (Exception e) {logger.log(Level.WARNING,e.getMessage(),e);}
    }

    return(stmt);
  }


  public CallableStatement prepareCall(String sql, ArrayList<BindValue> bindvalues, String dateform) throws Exception
  {
    CallableStatement stmt = conn.prepareCall(sql);

    for (int i = 0; i < bindvalues.size(); i++)
    {
      BindValue b = bindvalues.get(i);

      if (b.InOut())
      {
        stmt.registerOutParameter(i+1,b.getType());
        if (!b.OutOnly()) stmt.setObject(i+1,b.getValue());
      }
      else
      {
        stmt.setObject(i+1,b.getValue(),b.getType());
      }
    }

    return(stmt);
  }


  public ResultSet executeQuery(PreparedStatement stmt) throws Exception
  {
    return(stmt.executeQuery());
  }


  public int executeUpdate(PreparedStatement stmt) throws Exception
  {
    return(stmt.executeUpdate());
  }


  public boolean execute(String sql) throws Exception
  {
    Statement stmt = conn.createStatement();
    return(stmt.execute(sql));
  }


  public ArrayList<NameValuePair<Object>> execute(CallableStatement stmt, ArrayList<BindValue> bindvalues, boolean timeconv, DateTimeFormatter formatter) throws Exception
  {
    boolean conv = timeconv || formatter != null;

    ArrayList<NameValuePair<Object>> values =
      new ArrayList<NameValuePair<Object>>();

    stmt.executeUpdate();

    for (int i = 0; i < bindvalues.size(); i++)
    {
      BindValue b = bindvalues.get(i);

      if (b.InOut())
      {
        Object value = stmt.getObject(i+1);

        if (conv && DateUtils.isDate(value))
        {
          if (timeconv) value = DateUtils.getTime(value);
          else value = DateUtils.format(formatter,value);
        }

        values.add(new NameValuePair<Object>(b.getName(),value));
      }
    }

    return(values);
  }


  public String[] getColumNames(ResultSet rset) throws Exception
  {
    ResultSetMetaData meta = rset.getMetaData();
    String[] columns = new String[meta.getColumnCount()];

    for (int i = 0; i < columns.length; i++)
      columns[i] = meta.getColumnName(i+1);

    return(columns);
  }


  public String[] getColumTypes(ResultSet rset) throws Exception
  {
    ResultSetMetaData meta = rset.getMetaData();
    String[] columns = new String[meta.getColumnCount()];

    for (int i = 0; i < columns.length; i++)
      columns[i] = SQLTypes.getName(meta.getColumnType(i+1));

    return(columns);
  }


  public Integer[][] getColumPrecision(ResultSet rset) throws Exception
  {
    ResultSetMetaData meta = rset.getMetaData();
    Integer[][] precission = new Integer[meta.getColumnCount()][];

    for (int i = 0; i < precission.length; i++)
    {
      precission[i] = new Integer[2];
      precission[i][1] = meta.getScale(i+1);
      precission[i][0] = meta.getPrecision(i+1);
    }

    return(precission);
  }


  public Object[] fetch(ResultSet rset, boolean timeconv, DateTimeFormatter formatter) throws Exception
  {
    ResultSetMetaData meta = rset.getMetaData();
    return(fetch(meta.getColumnCount(),rset,timeconv,formatter));
  }


  public Object[] fetch(int columns, ResultSet rset, boolean timeconv, DateTimeFormatter formatter) throws Exception
  {
    boolean conv = timeconv || formatter != null;
    Object[] values = new Object[columns];

    for (int i = 0; i < values.length; i++)
    {
      values[i] = rset.getObject(i+1);

      if (conv && DateUtils.isDate(values[i]))
      {
        if (timeconv) values[i] = DateUtils.getTime(values[i]);
        else values[i] = DateUtils.format(formatter,values[i]);
      }
    }

    return(values);
  }


  @Override
  public String toString()
  {
    return("id = "+id);
  }


  public abstract void releaseProxyUser() throws Exception;
  public abstract void setProxyUser(String username) throws Exception;
  public abstract ResultSet executeUpdateWithReturnValues(PreparedStatement stmt, String dateform) throws Exception;
  public abstract ReturnValueHandle prepareWithReturnValues(String sql, ArrayList<BindValue> bindvalues, HashMap<String,BindValueDef> alltypes, String dateform) throws Exception;


  public static class ReturnValueHandle
  {
    final String[] columns;
    final PreparedStatement stmt;

    public ReturnValueHandle(PreparedStatement stmt)
    {
      this.stmt = stmt;
      this.columns = null;
    }

    public ReturnValueHandle(PreparedStatement stmt, String[] columns)
    {
      this.stmt = stmt;
      this.columns = columns;
    }

    public String[] columns()
    {
      return(columns);
    }

    public PreparedStatement stmt()
    {
      return(stmt);
    }
  }
}