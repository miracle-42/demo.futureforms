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

package database.rest.servers.http;

import java.util.logging.Level;
import java.util.logging.Logger;


public class HTTPReaper extends Thread
{
  private static int timeout;
  private final Logger logger;
  private final HTTPWaiterPool waiters;
  private static HTTPReaper reaper = null;


  synchronized static void start(Logger logger, HTTPWaiterPool waiters, int timeout) throws Exception
  {
    if (reaper == null)
    {
      HTTPReaper.timeout = timeout;
      reaper = new HTTPReaper(logger,waiters);
    }
  }


  public static int KeepAlive()
  {
    return(timeout/1000);
  }


  private HTTPReaper(Logger logger, HTTPWaiterPool waiters)
  {
    this.logger = logger;
    this.waiters = waiters;

    this.setDaemon(true);
    this.setName("HTTPReaper");

    this.start();
  }


  public void run()
  {
    HTTPWaiter[] waiters =
      this.waiters.getWaiters();

    try
    {
      while(true)
      {
        sleep(timeout);

        for(HTTPWaiter waiter : waiters)
          waiter.cleanout();
      }
    }
    catch (Exception e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);
    }
  }
}