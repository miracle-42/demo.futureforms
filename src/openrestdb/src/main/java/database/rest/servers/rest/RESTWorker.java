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

package database.rest.servers.rest;

import java.util.logging.Level;
import java.util.logging.Logger;
import database.rest.servers.Server;
import database.rest.config.Handlers;
import database.rest.pools.ThreadPool;
import database.rest.handlers.RestHandler;
import database.rest.servers.http.HTTPRequest;
import database.rest.servers.http.HTTPResponse;


public class RESTWorker implements Runnable
{
  private final Logger logger;
  private final RESTComm bridge;
  private final RESTServer rserver;
  private final ThreadPool workers;


  public RESTWorker(RESTServer rserver, ThreadPool workers, RESTComm bridge)
  {
    this.bridge = bridge;
    this.rserver = rserver;
    this.workers = workers;
    this.logger = rserver.logger();
  }


  @Override
  public void run()
  {
    try
    {
      Server srv = rserver.server();

      String host = new String(bridge.host);
      HTTPRequest request = new HTTPRequest(srv,host,bridge.page());

      Handlers handlers = rserver.config().getHTTP().handlers;
      RestHandler handler = handlers.getRESTHandler();

      HTTPResponse response = handler.handle(request);
      byte[] data = response.page();

      if (data == null)
      {
        logger.severe("Received null respond from RestHandler");
        data = "{\"status\": \"failed\"}".getBytes();
      }

      long id = bridge.id();
      int extend = bridge.extend();

      RESTComm bridge = new RESTComm(id,extend,host.getBytes(),data);
      rserver.respond(bridge);
    }
    catch (Exception e)
    {
      this.workers.done();
      logger.log(Level.SEVERE,e.getMessage(),e);

      byte[] data = ("{\"status\": \""+e.getMessage()+"\"}").getBytes();
      RESTComm error = new RESTComm(bridge.id(),bridge.extend(),bridge.host(),data);
      rserver.respond(error);
    }
  }
}