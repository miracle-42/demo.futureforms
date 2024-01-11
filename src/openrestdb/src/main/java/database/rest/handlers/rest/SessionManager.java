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
import java.util.Date;
import java.util.ArrayList;
import java.util.logging.Level;
import java.util.logging.Logger;
import database.rest.config.Config;
import database.rest.database.Pool;
import database.rest.servers.Server;
import database.rest.cluster.PreAuthTable;
import database.rest.cluster.PreAuthRecord;
import java.util.concurrent.ConcurrentHashMap;


public class SessionManager
{
  private final SSOReaper ssoreaper;
  private final SessionReaper sesreaper;
  private final static Logger logger = Logger.getLogger("rest");

  private final static ArrayList<History> connhist =
    new ArrayList<History>();

  private final static ArrayList<History> dischist =
    new ArrayList<History>();

  private final static ConcurrentHashMap<String,PreAuthRecord> preauth =
    new ConcurrentHashMap<String,PreAuthRecord>();

  private final static ConcurrentHashMap<String,Session> sessions =
    new ConcurrentHashMap<String,Session>();


  public static synchronized String register(Config config, Session session)
  {
    String ftok = "";
    String ptok = "";
    String guid = null;

    try {ftok = config.getDatabase().fixed.token();}
    catch (Exception e) {;}

    try {ptok = config.getDatabase().proxy.token();}
    catch (Exception e) {;}

    while(guid == null)
    {
      guid = new Guid().toString();
      if (guid.equals(ftok)) guid = null;
      else if (guid.equals(ptok)) guid = null;
      else if (sessions.get(guid) != null) guid = null;
    }

    sessions.put(guid,session);
    return(guid);
  }


  public static Date[] trace(String sesid)
  {
    Date conntime = null;
    Date disctime = null;

    synchronized(connhist)
    {
      for (History entry : connhist)
      {
        if (entry != null && entry.sesid.equals(sesid))
        {
          conntime = entry.time;
          break;
        }
      }
    }

    synchronized(dischist)
    {
      for (History entry : dischist)
      {
        if (entry.sesid.equals(sesid))
        {
          disctime = entry.time;
          break;
        }
      }
    }

    return(new Date[] {conntime, disctime});
  }


  public static void history(Session session, boolean conn)
  {
    String guid = session.guid();
    String sesid = session.sesid();

    if (guid == null || sesid == null)
      return;

    if (conn)
    {
      synchronized(connhist)
      {
        connhist.add(0,new History(guid,sesid));

        if (connhist.size() > 128)
          connhist.remove(127);
      }
    }
    else
    {
      synchronized(dischist)
      {
        dischist.add(0,new History(guid,sesid));

        if (dischist.size() > 128)
          dischist.remove(127);
      }
    }
  }


  public static synchronized PreAuthRecord preauth(String username)
  {
    String guid = null;

    while(guid == null)
    {
      guid = new Guid().toString();
      if (preauth.get(guid) != null) guid = null;
    }

    PreAuthRecord rec = new PreAuthRecord(guid,username);
    preauth.put(guid,rec);

    return(rec);
  }


  public static void refresh(PreAuthTable.Reader reader)
  {
    if (reader != null)
    {
      ArrayList<PreAuthRecord> records = reader.refresh();
      for(PreAuthRecord rec : records) preauth.put(rec.guid,rec);
    }
  }


  public static PreAuthRecord validate(String guid)
  {
    if (guid == null) return(null);
    else return(preauth.remove(guid));
  }


  public static Session get(String guid)
  {
    if (guid == null) return(null);
    Session session = sessions.get(guid);
    if (session != null) session.share();
    return(session);
  }


  public static boolean remove(String guid)
  {
    sessions.remove(guid);
    return(true);
  }



  public SessionManager(Server server)
  {
    this(server,false);
  }


  public SessionManager(Server server, boolean start)
  {
    this.ssoreaper = new SSOReaper(server);
    this.sesreaper = new SessionReaper(server);
    if (start) startSessionManager();
  }


  public void startSessionManager()
  {
    sesreaper.start();
  }


  public void startSSOManager()
  {
    ssoreaper.start();
  }


  private static class SSOReaper extends Thread
  {
    private final Config config;

    SSOReaper(Server server)
    {
      this.config = server.config();

      this.setDaemon(true);
      this.setName("SSOReaper");
    }


    @Override
    public void run()
    {
      logger.info("SSOReaper started");
      ArrayList<String> remove = new ArrayList<String>();

      try
      {
        int timeout = config.getREST().ssotimeout * 1000;

        while(true)
        {
          Thread.sleep(timeout/4);
          long time = System.currentTimeMillis();

          for(Map.Entry<String,PreAuthRecord> entry : preauth.entrySet())
          {
            PreAuthRecord sso = entry.getValue();

            if (time - sso.time > timeout)
            {
              remove.add(sso.guid);
              logger.fine("SSO: "+sso.guid+" timed out");
            }
          }

          for(String guid : remove)
            preauth.remove(guid);

          remove = new ArrayList<String>();
        }
      }
      catch (Exception e)
      {
        logger.log(Level.SEVERE,e.getMessage(),e);
      }
    }
  }


  private static class SessionReaper extends Thread
  {
    private final Config config;

    SessionReaper(Server server)
    {
      this.config = server.config();

      this.setDaemon(true);
      this.setName("SessionReaper");
    }


    @Override
    public void run()
    {
      logger.info("SessionReaper started");

      try
      {
        int dump = config.getREST().dump * 1000;
        int timeout = config.getREST().timeout * 1000;

        int sleep = timeout/4;
        if (dump > 0 && sleep > dump) sleep = dump;

        long last = System.currentTimeMillis();

        while(true)
        {
          Thread.sleep(sleep);
          long time = System.currentTimeMillis();

          if (dump > 0 && time - last >= dump && sessions.size() > 0)
          {
            String dmp = "\n";
            dmp += "--------------------------------------------------------------------------------------\n";
            dmp += "                              Sessions\n";
            dmp += "--------------------------------------------------------------------------------------\n";

            for(Map.Entry<String,Session> entry : sessions.entrySet())
              dmp += entry.getValue()+"\n";

            dmp += "--------------------------------------------------------------------------------------\n";

            logger.info(dmp);

            Pool pp = config.getDatabase().proxy;
            Pool fp = config.getDatabase().fixed;

            if (pp != null) logger.info(pp.toString());
            if (fp != null) logger.info(fp.toString());

            last = System.currentTimeMillis();
          }

          for(Map.Entry<String,Session> entry : sessions.entrySet())
          {
            Session session = entry.getValue();
            int age = (int) (time - session.touched());

            if (age > timeout)
            {
              session.disconnect(true);
              SessionManager.history(session,false);
              logger.fine("Session: "+session.sesid()+" timed out (age: "+(age/1000)+" secs)");
            }
          }
        }
      }
      catch (Exception e)
      {
        logger.log(Level.SEVERE,e.getMessage(),e);
      }
    }
  }


  private static class History
  {
    Date time;
    String guid;
    String sesid;

    History(String guid, String sesid)
    {
      this.guid = guid;
      this.sesid = sesid;
      this.time = new Date();
    }

    public String toString()
    {
      return("guid: '"+guid+"' session: '"+sesid+"' "+time);
    }
  }
}