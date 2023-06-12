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

package database.rest.handlers;

import java.util.logging.Logger;
import database.rest.config.Config;
import database.rest.servers.Server;
import database.rest.control.Launcher;
import database.rest.cluster.PreAuthRecord;
import database.rest.servers.rest.RESTClient;
import database.rest.handlers.file.Deployment;
import database.rest.servers.http.HTTPRequest;
import database.rest.servers.http.HTTPResponse;
import database.rest.handlers.rest.SessionManager;
import database.rest.config.Handlers.HandlerProperties;


public class AdminHandler extends Handler
{
  private final Logger logger = java.util.logging.Logger.getLogger("admin");


  public AdminHandler(Config config, HandlerProperties properties) throws Exception
  {
    super(config,properties);
  }


  @Override
  public HTTPResponse handle(HTTPRequest request) throws Exception
  {
    Server server = request.server();
    HTTPResponse response = new HTTPResponse();

    server.request();
    logger.fine("adm request received <"+request.path()+">");

    if (request.path().equals("/connect"))
    {
      request.unlist();
      request.channel().permanent();

      String body = new String(request.body());
      response.setBody(server.id()+" "+server.started());

      String[] args = body.split(" ");
      short id = Short.parseShort(args[0]);
      long started = Long.parseLong(args[1]);

      RESTClient worker = server.worker(id);

      if (worker == null) logger.info("RESTServer connecting");
      else logger.fine("RESTServer connecting secondary channel");

      if (worker == null || started != worker.started())
        worker = new RESTClient(server,id,started);

      server.register(worker);
      request.respond(response.page());

      worker.init(request.channel());
      return(null);
    }

    switch(request.path().substring(1))
    {
      case "shutdown":
        server.shutdown();
        break;

      case "deploy":
        Deployment.get().deploy();
        break;

      case "status":
        String status = Launcher.getStatus(config());
        response.setBody(status);
        break;

      case "authenticate":
        String username = new String(request.body());
        PreAuthRecord auth = SessionManager.preauth(username);

        if (server.getAuthWriter() != null)
          server.getAuthWriter().write(auth);

        response.setBody(auth.guid);
        break;

      default:
        throw new Exception("Unknown admin request <"+request.path().substring(1)+">");
    }

    return(response);
  }
}