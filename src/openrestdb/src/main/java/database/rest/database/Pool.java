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

import java.util.ArrayList;
import java.util.logging.Level;
import java.util.logging.Logger;


public class Pool
{
  private int size = 0;
  private boolean closed = false;

  private final int min;
  private final int max;
  private final int idle;
  private final int busy;
  private final String token;
  private final boolean proxy;
  private final String username;
  private final String password;
  private final ArrayList<Database> pool;
  private final static Logger logger = Logger.getLogger("rest");


  public Pool(boolean proxy, String token, String username, String password, int min, int max, int idle, int busy) throws Exception
  {
    this.min = min;
    this.max = max;
    this.busy = busy;
    this.idle = idle;
    this.proxy = proxy;
    this.token = token;
    this.username = username;
    this.password = password;
    this.pool = new ArrayList<Database>();
  }


  public int min()
  {
    return(min);
  }


  public int max()
  {
    return(max);
  }


  public int idle()
  {
    return(idle);
  }


  public int busy()
  {
    return(busy);
  }


  public String token()
  {
    return(this.token);
  }


  public String username()
  {
    return(this.username);
  }


  public String password()
  {
    return(this.password);
  }


  public boolean proxy()
  {
    return(proxy);
  }


  void init()
  {
    Initiator init = new Initiator(this);
    init.start();
  }


  public boolean test()
  {
    try
    {
      Database c = getConnection();
      if (c == null) return(false);
      return(c.validate(false));
    }
    catch (Throwable e)
    {
      logger.log(Level.SEVERE,"Connection Test Failed",e);
      return(false);
    }
  }


  public synchronized void add(Database database)
  {
    pool.add(database);
  }


  public Database connect(String token) throws Exception
  {
    if (this.token != null)
    {
      if (token == null || !this.token.equals(token))
        throw new Exception("Invalid connect token");
    }

    Database database = DatabaseUtils.getInstance();
    database.connect(username,password);
    database.touch();

    return(database);
  }


  public synchronized boolean remove(Database database, long touched)
  {
    if (!pool.remove(database))
    {
      logger.warning("Unable to remove connection "+database);
      return(false);
    }

    if (touched > 0 && touched != database.touched())
    {
      this.add(database);
      logger.warning("Last minut connection reuse "+database);
      return(false);
    }

    size--;
    database.disconnect();
    logger.fine("Pool["+(proxy ? "proxy" : "fixed")+"] connection closed");

    return(true);
  }


  public Database getConnection() throws Exception
  {
    return(getConnection(token));
  }


  public Database getConnection(String token) throws Exception
  {
    if (closed)
      throw new Exception("Pool closed");

    if (this.token != null)
    {
      if (token == null || !this.token.equals(token))
        throw new Exception("Invalid connect token");
    }

    Database database = null;
    long busy = this.busy() * 1000;
    long start = System.currentTimeMillis();

    synchronized(this)
    {
      while(pool.size() == 0 && size == max)
      {
        if (System.currentTimeMillis() - start > busy)
          throw new Exception("No more available connections in pool");

        this.wait(1000);
      }

      if (pool.size() == 0)
      {
        database = connect();
        size++;
      }
      else
      {
        database = pool.remove(0);
      }
    }

    return(database);
  }


  public void release(Database database)
  {
    if (proxy)
    {
      try
      {
        database.releaseProxyUser();
      }
      catch (Exception e)
      {
        logger.log(Level.SEVERE,e.getMessage(),e);
        return;
      }
    }

    synchronized(this)
    {
      if (database.dangling())
      {
        database.dangling(false);
        if (size >= max) return;
        size++;
      }

      database.touch();
      pool.add(0,database);
      this.notifyAll();
    }
  }


  public void close()
  {
    synchronized(this)
    {
      closed = true;
      int size = this.pool.size();

      for (int i = 0; i < size; i++)
      {
        this.size--;
        Database database = this.pool.remove(0);

        try {database.disconnect();}
        catch(Exception e) {;}
      }
    }
  }


  public void validate()
  {
    synchronized(this)
    {
      int size = this.pool.size();

      for (int i = 0; i < size; i++)
      {
        Database database = this.pool.remove(0);
        if (database.validate()) this.pool.add(database);
      }

      this.size = pool.size();
    }
  }


  public Database connect() throws Exception
  {
    return(connect(this.token));
  }


  ArrayList<Database> connections()
  {
    synchronized(this)
    {return(new ArrayList<Database>(pool));}
  }


  public String toString()
  {
    return("Pool["+(proxy ? "proxy" : "fixed")+"] "+"size: "+size+" free: "+pool.size());
  }


  private static class Initiator extends Thread
  {
    private final Pool pool;

    Initiator(Pool pool)
    {
      this.pool = pool;
      this.setDaemon(true);
      this.setName("Pool initiator");
    }

    @Override
    public void run()
    {
      if (pool.username == null)
      {
        pool.closed = true;
        return;
      }

      if (pool.username.length() == 0)
      {
        pool.closed = true;
        return;
      }

      if (pool.max <= 0)
      {
        pool.closed = true;
        return;
      }

      try
      {
        for (int i = 0; i < pool.min; i++)
        {
          Database database = DatabaseUtils.getInstance();
          database.connect(pool.username,pool.password);
          pool.add(database);
          pool.size++;
        }
      }
      catch (Exception e)
      {
        logger.log(Level.WARNING,e.getMessage(),e);
      }
    }
  }
}