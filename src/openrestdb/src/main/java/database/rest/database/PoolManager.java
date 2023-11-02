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
import database.rest.config.Config;
import database.rest.servers.Server;


public class PoolManager extends Thread
{
  private final Config config;
  private final static Logger logger = Logger.getLogger("rest");


  public PoolManager(Server server)
  {
    this(server,false);
  }


  public PoolManager(Server server, boolean start)
  {
    this.config = server.config();

    this.setDaemon(true);
    this.setName("PoolManager");

    if (start) this.start();
  }


  @Override
  public void run()
  {
    logger.info("PoolManager started");

    try
    {
      Pool pp = config.getDatabase().proxy;
      Pool fp = config.getDatabase().fixed;

      if (fp == null && pp == null)
        return;

      if (fp != null) fp.init();
      if (pp != null) pp.init();

      int pidle = (pp == null) ? 3600000 : pp.idle();
      int fidle = (fp == null) ? 3600000 : fp.idle();
      int sleep = (pidle < fidle) ? pidle * 1000/4 : fidle * 1000/4;

      while(true)
      {
        Thread.sleep(sleep);

        if (fp != null)
          cleanout(fp);

        if (pp != null)
          cleanout(pp);
      }
    }
    catch (Exception e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);
    }
  }


  public void validate()
  {
      logger.warning("Validating pool");

      try
      {
        Pool pp = config.getDatabase().proxy;
        Pool fp = config.getDatabase().fixed;

        if (fp != null) checkall(fp);
        if (pp != null) checkall(pp);
      }
      catch (Exception e)
      {
        logger.log(Level.SEVERE,e.getMessage(),e);
      }
  }


  private synchronized void checkall(Pool pool)
  {
    ArrayList<Database> conns = pool.connections();

    for (int i = 0; i < conns.size(); i++)
    {
      Database conn = conns.get(i);

      if (!conn.validate(false))
      {
        logger.fine("connection lost");
          pool.remove(conn,0);
      }
    }
  }


  private synchronized void cleanout(Pool pool)
  {
    boolean checkall = false;
    long time = System.currentTimeMillis();
    ArrayList<Database> conns = pool.connections();

    int min = pool.min();
    int size = conns.size();
    long idle = pool.idle() * 1000;

    for (int i = size - 1; i >= 0 && size > min; i--)
    {
      Database conn = conns.get(i);
      long touched = conn.touched();
      boolean timedout = (time - touched > idle);

      if (timedout || !conn.validate(false))
      {
        size--;
        if (!timedout) checkall = true;

        if (!timedout) logger.fine("connection lost");
        else           logger.fine("connection: "+conn+" timed out");

        pool.remove(conn,touched);
      }
    }

    if (checkall) checkall(pool);
    logger.finest(pool.toString());
  }
}