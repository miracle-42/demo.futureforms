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

package database.rest.control;

import java.util.logging.Level;
import java.util.logging.Logger;


public class Service extends Thread
{
  private final int heartbeat;
  private final Logger logger;
  private final ILauncher launcher;


  @SuppressWarnings("unused")
  public static void main(String[] args) throws Exception
  {
    Service service = new Service();
  }


  public Service() throws Exception
  {
    this.launcher = Launcher.create();
    this.launcher.setConfig();

    this.logger = launcher.logger();
    this.heartbeat = launcher.heartbeat();

    this.setName("DatabaseJS Service");
    Runtime.getRuntime().addShutdownHook(new ShutdownHook(this));

    this.start();
  }


  @Override
  public void run()
  {
    long started = 0;
    boolean stopped = false;

    try
    {
      logger.info("Starting openrestdb service");
      launcher.start();

      while(true)
      {
        synchronized(this) {this.wait(heartbeat);}
        if (started == 0) started = System.currentTimeMillis();

        if (launcher.stopped(started))
        {
          stopped = true;
          logger.info("openrestdb was stopped");
          break;
        }
      }

      if (!stopped)
      {
        logger.info("Stopping openrestdb service");
        launcher.stop(null);
      }
    }
    catch (Throwable e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);
    }
  }


  private static class ShutdownHook extends Thread
  {
    private final Service service;

    ShutdownHook(Service service)
    {this.service = service;}

    @Override
    public void run()
    {
      synchronized(service)
       {service.notify();}
    }
  }
}