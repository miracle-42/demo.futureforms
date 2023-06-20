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

import java.util.logging.Level;
import java.util.logging.Logger;
import database.rest.config.Config;
import database.rest.handlers.file.PathUtil;
import database.rest.handlers.file.Deployment;
import database.rest.servers.http.HTTPRequest;
import database.rest.servers.http.HTTPResponse;
import database.rest.config.Handlers.HandlerProperties;
import database.rest.handlers.file.Deployment.StaticFile;


public class FileHandler extends Handler
{
  private final PathUtil path;
  private final Logger logger = Logger.getLogger("http");


  public FileHandler(Config config, HandlerProperties properties) throws Exception
  {
    super(config,properties);
    this.path = new PathUtil(this);
  }


  @Override
  public HTTPResponse handle(HTTPRequest request) throws Exception
  {
    request.server().request();
    HTTPResponse response = new HTTPResponse();
    String path = this.path.getPath(request.path());

    if (path == null)
    {
      response.setResponse(404);
      response.setContentType("text/html");
      response.setBody("<b>Page not found</b>");
      logger.warning(path+" is not a valid path");
      return(response);
    }

    if (!this.path.checkPath(path))
    {
      response.setResponse(400);
      response.setContentType("text/html");
      response.setBody("<b>Bad Request</b>");
      logger.warning(path+" is not a valid path");
      return(response);
    }

    if (request.getHeader("Host") == null)
    {
      response.setResponse(400);
      response.setContentType("text/html");
      response.setBody("<b>Bad Request</b>");
      logger.warning(path+" host header is missing");
      return(response);
    }

    StaticFile file = Deployment.get().get(path);

    String caching = request.getHeader("Cache-Control");
    String encodings = request.getHeader("Accept-Encoding");
    String modified = request.getHeader("If-Modified-Since");

    if (file == null)
    {
      if (Deployment.isDirectory(path))
        file = Deployment.get().get(path+"/index.html");
    }

    if (file == null)
    {
      String vendp = config().getHTTP().getVirtualEndpoint();
      if (vendp != null) file = Deployment.get().get(vendp);
    }

    if (file == null)
    {
      response.setResponse(403);
      response.setContentType("text/html");
      response.setBody("<b>Page not found</b><br><br>"+
                       "The requested URL \""+request.path()+"\" was not found on this server.");
      return(response);
    }

    boolean reload = true;
    String changed = Deployment.modstring();

    if (modified != null && modified.equals(changed))
    {
      reload = false;

      if (caching != null && (caching.contains("max-age=0") || caching.contains("no-cache")))
        reload = true;
    }

    if (!reload)
    {
      // Send Not modified
      response.setResponse(304);
      log(logger,request,response);
      return(response);
    }

    boolean gzip = false;
    byte[] content = null;

    if (file.compressed)
      gzip = (encodings != null && encodings.contains("gzip"));

    try
    {
      content = file.get(gzip);
      if (gzip) response.setHeader("Content-Encoding","gzip");
    }
    catch (Exception e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);

      response.setResponse(500);
      response.setContentType("text/html");
      response.setBody("<b>Internal Server Error</b>");
      return(response);
    }

    String ext = file.fileext();
    String mimetype = config().getHTTP().mimetypes.get(ext);

    response.setBody(content);
    response.setContentType(mimetype);
    response.setLastModified(Deployment.modstring(),Deployment.modified());

    log(logger,request,response);
    return(response);
  }


  private void log(Logger logger, HTTPRequest request, HTTPResponse response)
  {
    long time = System.nanoTime() - request.start();

    if (logger.getLevel() == Level.FINE)
      logger.log(logger.getLevel(),request.path()+" ["+time/1000000+"]ms");

    if (logger.getLevel() == Level.FINER)
      logger.log(logger.getLevel(),request.path()+" ["+time/1000000+"]ms\n\n"+request.header()+"\n\n"+response.header()+"\n");

    if (logger.getLevel() == Level.FINEST)
      logger.log(logger.getLevel(),request.path()+" ["+time/1000000+"]ms\n\n"+new String(request.page())+"\n\n"+new String(response.page()));
  }
}