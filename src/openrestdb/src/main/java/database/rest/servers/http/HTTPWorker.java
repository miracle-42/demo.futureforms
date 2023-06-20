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
import database.rest.config.Handlers;
import database.rest.handlers.Handler;
import database.rest.pools.ThreadPool;


public class HTTPWorker implements Runnable
{
  private final Logger logger;
  private final Handlers handlers;
  private final ThreadPool workers;
  private final HTTPChannel channel;
  private final HTTPRequest request;


  public HTTPWorker(ThreadPool workers, HTTPRequest request) throws Exception
  {
    this.workers  = workers;
    this.request  = request;
    this.channel  = request.channel();
    this.logger   = request.channel().logger();
    this.handlers = channel.config().getHTTP().handlers;

    this.channel.stayalive(true);
  }


  @Override
  public void run()
  {
    try
    {
      request.parse();
      String path = request.path();
      String method = request.method();

      if (request.redirect())
      {
        int ssl = channel.config().getPorts().ssl;
        int plain = channel.config().getPorts().plain;

        String host = request.getHeader("Host");
        host = host.replace(plain+"",ssl+"");

        HTTPResponse response = new HTTPResponse();

        response.setResponse(301);
        response.setHeader("Location","https://"+host+request.path());

        if (logger.getLevel() == Level.FINEST)
          logger.finest("redirect: "+new String(response.page()));

        request.respond(response.page());
        this.channel.stayalive(false);
        channel.workers().done();

        return;
      }

      Handler handler = null;
      boolean admin = channel.admin();

      if (admin) handler = handlers.getAdminHandler();
      else       handler = handlers.getHandler(path,method);

      if (handler == null)
      {
        logger.warning("No appropiate handler mapped to path="+path+" method="+method);

        this.workers.done();
        this.channel.stayalive(false);

        try {request.respond(HTTPWaiter.err500(false));} catch (Exception ex) {;}
        this.channel.failed();

        return;
      }

      HTTPResponse response = handler.handle(request);
      if (response != null) request.respond(response.page());

      channel.workers().done();
    }
    catch(Throwable e)
    {
      this.workers.done();
      logger.log(Level.SEVERE,e.getMessage(),e);
      try {request.respond(HTTPWaiter.err500(false));} catch (Exception ex) {;}
      this.channel.failed();
    }
    finally
    {
      this.channel.stayalive(false);
    }
  }
}