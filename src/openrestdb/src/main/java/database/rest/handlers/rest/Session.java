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

import java.util.Map;
import java.sql.ResultSet;
import java.sql.Savepoint;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.sql.PreparedStatement;
import java.sql.CallableStatement;
import database.rest.database.Pool;
import database.rest.config.Config;
import database.rest.database.Database;
import database.rest.database.BindValue;
import database.rest.database.BindValueDef;
import database.rest.config.DatabaseType;
import database.rest.database.AuthMethod;
import java.time.format.DateTimeFormatter;
import database.rest.database.DatabaseUtils;
import database.rest.database.NameValuePair;
import java.util.concurrent.ConcurrentHashMap;
import database.rest.database.Database.ReturnValueHandle;


public class Session
{
  private String sesid;

  private final String guid;
  private final String username;
  private final SessionLock lock;

  private Scope scope;
  private Pool pool = null;
  private String secret = null;
  private AuthMethod method = null;
  private Database database = null;

  private int clients = 0;
  private long touched = System.currentTimeMillis();
  private ArrayList<NameValuePair<Object>> clientinfo = null;

  private final ConcurrentHashMap<String,Cursor> cursors =
    new ConcurrentHashMap<String,Cursor>();

  private final static Logger logger = Logger.getLogger("rest");


  public static boolean forcePool(String scope)
  {
    if (!scope.equalsIgnoreCase("transaction"))
      return(false);

    if (DatabaseUtils.getType() == DatabaseType.Oracle)
      return(true);

    if (DatabaseUtils.getType() == DatabaseType.Postgres)
      return(true);

    return(false);
  }


  public Session(Config config, AuthMethod method, Pool pool, String scope, String username, String secret) throws Exception
  {
    this.pool = pool;
    this.method = method;
    this.secret = secret;
    this.username = username;
    this.scope = getScope(scope);
    this.lock = new SessionLock();
    this.guid = SessionManager.register(config,this);
  }


  public synchronized int share()
  {
    return(++clients);
  }


  public synchronized int clients()
  {
    return(clients);
  }


  public Scope scope()
  {
    return(scope);
  }


  public void scope(Scope scope)
  {
    this.scope = scope;
  }


  public String username()
  {
    return(username);
  }


  public void setPool(Pool pool)
  {
    this.pool = pool;
  }


  public void setSecret(String secret)
  {
    this.secret = secret;
  }


  public void setMethod(AuthMethod method)
  {
    this.method = method;
  }


  public void setClientInfo(ArrayList<NameValuePair<Object>> clientinfo)
  {
    this.clientinfo = clientinfo;
  }


  public synchronized String release(boolean failed)
  {
    clients--;

    if (failed && database != null && !database.validate())
    {
      try
      {
        this.rollback();
        database.setAutoCommit(autocommit());
      }
      catch (Exception e)
      {
        if (scope == Scope.Dedicated)
        {
          database.disconnect();
        }
        else
        {
          pool.remove(database,-1);
        }

        database = null;
        SessionManager.remove(guid);
        String message = e.getMessage();

        if (message == null)
          message = "a fatal error occured";

        return(message);
      }

      return("transaction rolled back");
    }

    if (!stateful())
      disconnect(0,false);

    return(null);
  }


  public synchronized void touch()
  {
    touched = System.currentTimeMillis();
  }


  public synchronized long touched()
  {
    return(touched);
  }


  public String guid()
  {
    return(guid);
  }


  public String sesid()
  {
    return(sesid);
  }


  public void sesid(String sesid)
  {
    this.sesid = sesid;
  }


  public boolean stateful()
  {
    return(scope != Scope.Stateless);
  }


  public boolean autocommit()
  {
    return(scope == Scope.Stateless);
  }


  public void autocommit(boolean flag) throws Exception
  {
    database.setAutoCommit(flag);
  }


  public synchronized void disconnect()
  {
    disconnect(false);
  }


  public synchronized void disconnect(boolean force)
  {
    clients--;
    int exp = 0;
    if (force) exp = -1;

    if (disconnect(exp,true))
      SessionManager.remove(guid);
  }


  public synchronized void ensure() throws Exception
  {
    touch();

    if (database == null)
      connect(true);
  }


  public void connect(boolean keep) throws Exception
  {
    try
    {
      switch(method)
      {
        case SSO :
          if (scope == Scope.Dedicated) database = pool.connect();
          else                          database = pool.getConnection();

          if (pool.proxy()) database.setProxyUser(username);
          break;

        case Custom :
          if (scope == Scope.Dedicated) database = pool.connect();
          else                          database = pool.getConnection();

          if (pool.proxy()) database.setProxyUser(username);
          break;

        case Database :
          database = DatabaseUtils.getInstance();
          database.connect(username,secret);

          if (pool != null)
          {
            setSecret(pool.token());
            setMethod(AuthMethod.PoolToken);

            // Reuse the connection ?
            if (pool.username().equals(username))
            {
              database.dangling(true);
              break;
            }
            else
            {
              // Or drop it
              database.disconnect();
            }
          }
          else
          {
            break;
          }

        case PoolToken :
          if (scope == Scope.Dedicated) database = pool.connect(secret);
          else                          database = pool.getConnection(secret);

          if (pool.proxy()) database.setProxyUser(username);
          break;
      }

      if (scope != Scope.Dedicated && !keep)
      {
        disconnect(0,false);
        return;
      }

      database.setClientInfo(clientinfo);

      if (autocommit()) database.setAutoCommit(true);
      else              database.setAutoCommit(false);
    }
    catch (Throwable e)
    {
      database = null;

      if (pool != null)
        pool.validate();

      throw e;
    }
  }


  private synchronized boolean disconnect(int expected, boolean rb)
  {
    if (expected >= 0 && clients != expected)
      logger.severe("Releasing connection while clients connected ("+clients+")");

    if (database != null)
    {
      closeAllCursors();

      try
      {
        if (rb && !database.getAutoCommit())
          database.rollback();

        database.clearClientInfo(clientinfo);
      }
      catch (Exception e)
      {
        logger.log(Level.SEVERE,e.getMessage(),e);
      }

      if (pool == null) database.disconnect();
      else              pool.release(database);
    }

    database = null;
    return(true);
  }


  public boolean commit() throws Exception
  {
    if (database == null)
      return(false);

    database.commit();

    if (scope == Scope.Transaction)
    {
      disconnect(1,false);
      clients--;
    }

    return(true);
  }


  public boolean rollback() throws Exception
  {
    if (database == null)
      return(false);

    database.rollback();

    if (scope == Scope.Transaction)
    {
      disconnect(1,false);
      clients--;
    }

    return(true);
  }


  public boolean releaseConnection() throws Exception
  {
    if (database == null)
      return(false);

    try {database.rollback();}
    catch (Exception e) {;}

    if (scope == Scope.Transaction)
    {
      disconnect(1,false);
      clients--;
    }

    return(true);
  }


  public Savepoint setSavePoint() throws Exception
  {
    return(database.setSavePoint());
  }


  public boolean releaseSavePoint(Savepoint savepoint)
  {
    return(releaseSavePoint(savepoint,false));
  }


  public boolean releaseSavePoint(Savepoint savepoint, boolean rollback)
  {
    if (savepoint == null)
      return(true);

    try
    {
      database.releaseSavePoint(savepoint,rollback);
      return(true);
    }
    catch (Throwable e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);

      if (!rollback)
      {
        try {database.releaseSavePoint(savepoint,rollback);}
        catch (Throwable rb) {;}
      }

      return(false);
    }
  }


  public PreparedStatement prepare(String sql, ArrayList<BindValue> bindvalues) throws Exception
  {
    if (bindvalues == null) bindvalues = new ArrayList<BindValue>();
    PreparedStatement stmt = database.prepare(sql,bindvalues,null);
    return(stmt);
  }


  public CallableStatement prepareCall(String sql, ArrayList<BindValue> bindvalues) throws Exception
  {
    if (bindvalues == null) bindvalues = new ArrayList<BindValue>();
    CallableStatement stmt = database.prepareCall(sql,bindvalues,null);
    return(stmt);
  }


  public boolean execute(String sql) throws Exception
  {
    return(database.execute(sql));
  }


  public int executeUpdate(String sql, ArrayList<BindValue> bindvalues, String dateform) throws Exception
  {
    PreparedStatement stmt = database.prepare(sql,bindvalues,dateform);
    return(database.executeUpdate(stmt));
  }


  public Cursor executeUpdateWithReturnValues(String sql, ArrayList<BindValue> bindvalues, HashMap<String,BindValueDef> alltypes, String dateform) throws Exception
  {
    ReturnValueHandle hdl = database.prepareWithReturnValues(sql,bindvalues,alltypes,dateform);
    ResultSet         rset = database.executeUpdateWithReturnValues(hdl.stmt(),dateform);
    return(new Cursor(null,hdl.stmt(),rset,hdl.columns()));
  }


  public Cursor executeQuery(String name, String sql, ArrayList<BindValue> bindvalues, String dateform) throws Exception
  {
    PreparedStatement stmt = database.prepare(sql,bindvalues,dateform);
    ResultSet         rset = database.executeQuery(stmt);

    Cursor cursor = new Cursor(name,stmt,rset);
    if (name != null) cursors.put(name,cursor);

    return(cursor);
  }


  public ArrayList<NameValuePair<Object>> executeCall(String sql, ArrayList<BindValue> bindvalues, String dateform) throws Exception
  {
    boolean timeconv = false;
    DateTimeFormatter formatter = null;

    if (dateform != null)
    {
      if (dateform.equals("UTC")) timeconv = true;
      else formatter = DateTimeFormatter.ofPattern(dateform);
    }

    CallableStatement stmt = database.prepareCall(sql,bindvalues,dateform);
    return(database.execute(stmt,bindvalues,timeconv,formatter));
  }


  public String[] getColumnNames(Cursor cursor) throws Exception
  {
    if (cursor.columns == null)
      cursor.columns = database.getColumNames(cursor.rset);
    return(cursor.columns);
  }


  public String[] getColumnTypes(Cursor cursor) throws Exception
  {
    return(database.getColumTypes(cursor.rset));
  }


  public Integer[][] getColumnPrecision(Cursor cursor) throws Exception
  {
    return(database.getColumPrecision(cursor.rset));
  }


  public ArrayList<Object[]> fetch(Cursor cursor, int skip) throws Exception
  {
    boolean timeconv = false;
    DateTimeFormatter formatter = null;

    if (cursor.dateformat != null)
    {
      if (cursor.dateformat.equals("UTC")) timeconv = true;
      else formatter = DateTimeFormatter.ofPattern(cursor.dateformat);
    }

    int columns = cursor.columns.length;
    ArrayList<Object[]> table = new ArrayList<Object[]>();

    for (int i = 0; i < skip && cursor.rset.next(); i++)
      database.fetch(cursor.rset,timeconv,formatter);

    for (int i = 0; (cursor.rows <= 0 || i < cursor.rows) && cursor.rset.next(); i++)
      table.add(database.fetch(columns,cursor.rset,timeconv,formatter));

    if (cursor.rows <= 0 || table.size() < cursor.rows)
      closeCursor(cursor);

    return(table);
  }


  public Cursor getCursor(String name)
  {
    return(cursors.get(name));
  }


  public void closeCursor(String name)
  {
    if (name == null)
      return;

    closeCursor(cursors.get(name));
  }


  public void closeCursor(Cursor cursor)
  {
    if (cursor == null)
      return;

    try {cursor.rset.close();}
    catch (Exception e) {;}

    try {cursor.stmt.close();}
    catch (Exception e) {;}

    if (cursor.name != null)
      cursors.remove(cursor.name);

    cursor.closed = true;
  }


  public void closeAllCursors()
  {
    for(Map.Entry<String,Cursor> entry : cursors.entrySet())
      closeCursor(entry.getValue());
  }


  public SessionLock lock()
  {
    return(lock);
  }


  private Scope getScope(String scope)
  {
    if (scope == null)
      return(Scope.Stateless);

    scope = Character.toUpperCase(scope.charAt(0))
           + scope.substring(1).toLowerCase();

    return(Scope.valueOf(scope));
  }


  @Override
  public String toString()
  {
    String str = this.sesid() + " ";

    str += "Scope: " + scope + ", Connected: " + (database != null)+", Clients: "+clients;

    if (pool == null) str += " " + username;
    else str += " Pool["+(pool.proxy() ? username : "----")+"]";

    str += " "+lock;

    return(str);
  }


  public static enum Scope
  {
    Dedicated,
    Stateless,
    Transaction
  }
}