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

import java.io.File;
import org.json.JSONObject;
import java.util.ArrayList;
import java.io.FileInputStream;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.io.FileOutputStream;
import database.rest.config.Config;
import database.rest.servers.Server;
import database.rest.handlers.rest.Request;
import database.rest.handlers.file.PathUtil;
import database.rest.servers.rest.RESTClient;
import database.rest.servers.http.HTTPRequest;
import database.rest.servers.http.HTTPResponse;
import database.rest.handlers.rest.JSONFormatter;
import database.rest.config.Handlers.HandlerProperties;
import static database.rest.handlers.rest.JSONFormatter.Type.*;


public class AppFileHandler extends Handler
{
  private final PathUtil path;
  private final CrossOrigin cors;
  private final Logger logger = Logger.getLogger("rest");


  public AppFileHandler(Config config, HandlerProperties properties) throws Exception
  {
    super(config,properties);
    this.cors = new CrossOrigin();
    this.path = new PathUtil(this);
  }


  @Override
  public HTTPResponse handle(HTTPRequest request) throws Exception
  {
    request.server().request();
    Server server = request.server();
    HTTPResponse response = new HTTPResponse();
    String path = this.path.getPath(request.path());
    String json = config().getHTTP().mimetypes.get("json");

    if (path == null)
    {
      response.setContentType(json);
      JSONFormatter jfmt = new JSONFormatter();

      jfmt.success(false);
      jfmt.add("message","Path not mapped to any resource");

      response.setBody(jfmt.toString());
      return(response);
    }

    server.request();
    String session = path.substring(1).split("/")[0];
    logger.finest("AppFile request received: "+request.path());

    response.setContentType(json);
    String errm = cors.allow(request);

    if (errm != null)
    {
      response.setBody(errm);
      return(response);
    }

    cors.addHeaders(request,response);

    if (!server.embedded())
    {
      errm = ensure(request,session);

      if (errm != null)
      {
        JSONFormatter jfmt = new JSONFormatter();

        jfmt.success(false);
        jfmt.add("message",errm);

        response.setBody(jfmt.toString());
        logger.warning(errm);
        return(response);
      }
    }

    if (!request.method().equals("GET"))
    {
      if (request.getHeader("Content-Type").startsWith("multipart/form-data"))
        return(upload(request,response));
    }

    if (request.method().equals("GET"))
      return(get(request,response,path));

    JSONFormatter jfmt = new JSONFormatter();

    jfmt.success(true);
    jfmt.add("message","file uploaded");

    response.setBody(jfmt.toString());
    return(response);
  }


  private HTTPResponse get(HTTPRequest request, HTTPResponse response, String path) throws Exception
  {
    String ext = "";
    String root = config().getREST().fileroot;

    int pos = path.indexOf('/',1);
    String fname = root + path.substring(pos);

    pos = path.lastIndexOf('.');

    if (pos < 0) ext = "";
    else ext = path.substring(pos+1);

    String mimeopt = request.getQuery("mimetype");
    String mimetype = config().getHTTP().mimetypes.get(ext);

    if (mimeopt != null) response.setContentType(mimeopt);
    else                 response.setContentType(mimetype);

    File file = new File(fname);

    if (!file.exists())
    {
      response.setResponse(404);
      response.setContentType("text/html");
      response.setBody("<b>Page not found</b>");
      return(response);
    }

    byte[] content = new byte[(int) file.length()];
    FileInputStream in = new FileInputStream(file);

    if (in.read(content) != content.length)
    {
      in.close();
      throw new Exception("Unable to fully read "+fname);
    }

    in.close();
    response.setBody(content);
    log(logger,request,response);

    return(response);
  }


  private HTTPResponse upload(HTTPRequest request, HTTPResponse response) throws Exception
  {
    JSONFormatter jfmt = new JSONFormatter();
    String ctype = request.getHeader("Content-Type");
    String boundary = "--"+ctype.substring(ctype.indexOf("boundary=")+9);

    int next = 0;
    byte[] body = request.body();
    byte[] eoh = "\r\n\r\n".getBytes();
    byte[] pattern = boundary.getBytes();
    String root = config().getREST().fileroot;
    boolean tmpfiles = config().getREST().tmpfiles;

    JSONObject options = null;
    ArrayList<Field> files = new ArrayList<Field>();
    ArrayList<Field> fields = new ArrayList<Field>();

    while(true)
    {
      int last = next + 1;
      next = indexOf(body,pattern,next);

      if (next > last)
      {
        // newline is \r\n
        // 2 newlines after header
        // 1 newline after content

        int head = indexOf(body,eoh,last+pattern.length);
        String header = new String(body,last,head-last);

        head += 4;
        byte[] entry = new byte[next-head-2];
        System.arraycopy(body,head,entry,0,entry.length);

        Field field = new Field(tmpfiles,header,entry);

        if (field.name != null && field.name.equals("options"))
        {
          options = Request.parse(new String(field.content));
          field = null;
        }

        if (field != null)
        {
          if (field.srcfile != null) files.add(field);
          else                       fields.add(field);
        }
      }

      if (next == -1 || next + pattern.length + 4 == body.length)
        break;

      next += pattern.length + 1;
    }

    jfmt.success(true);

    if (fields.size() > 0)
    {
      jfmt.push("fields",ObjectArray);
      String[] attrs = new String[] {"field","value"};

      for(Field field : fields)
      {
        String[] values = new String[] {field.name,new String(field.content)};
        jfmt.add(attrs,values);
      }

      jfmt.pop();
    }

    if (files.size() > 0)
    {
      jfmt.push("files",ObjectArray);
      String[] attrs = new String[] {"field","srcfile","dstfile","size"};

      for(Field field : files)
      {
        field.write(root,options);
        Object[] values = new Object[] {field.name,field.srcfile,field.dstfile,field.size};
        jfmt.add(attrs,values);
      }

      jfmt.pop();
    }

    response.setBody(jfmt.toString());
    return(response);
  }


  private String ensure(HTTPRequest request, String session) throws Exception
  {
    if (session == null || session.length() < 16)
      return("Not connected");

    short rsrv = RestHandler.getClient(config(),request);
    if (rsrv < 0) rsrv = 2;

    RESTClient client = request.server().worker(rsrv);

    if (client == null)
      return("Could not connect to RESTServer");

    String prefix = config().getHTTP().handlers.getRESTHandler().properties().prefix();
    if (!prefix.endsWith("/")) prefix += "/";

    String nl = "\r\n";
    String host = request.remote();
    String body = "{\n  \"keepalive\": true\n}";

    String ensure = "POST "+prefix+session+"/ping HTTP/1.1"+nl+
                    "Host: "+host+nl+"Content-Length: "+body.length()+nl+nl+body;

    byte[] data = client.send(host,ensure.getBytes());

    HTTPResponse response = new HTTPResponse(data);
    JSONObject status = Request.parse(new String(response.body()));

    if (!status.getBoolean("success"))
      return("Not connected");

    return(null);
  }


  public static int indexOf(byte[] data, byte[] pattern, int start)
  {
    for(int i = start; i < data.length - pattern.length + 1; i++)
    {
        boolean found = true;

        for(int j = 0; j < pattern.length; ++j)
        {
           if (data[i+j] != pattern[j])
           {
               found = false;
               break;
           }
        }

        if (found) return(i);
     }

    return(-1);
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


  private static class Field
  {
    int size = 0;
    String name = null;
    String folder = "/";
    String srcfile = null;
    String dstfile = null;
    byte[] content = null;
    boolean tmpfile = false;


    Field(boolean tmpfile, String header, byte[] content)
    {
      int pos1 = 0;
      int pos2 = 0;
      String name = null;
      String filename = null;

      pos1 = header.indexOf("name=");

      if (pos1 >= 0)
      {
        pos1 += 6;
        pos2 = header.indexOf('"',pos1);
        if (pos2 >= 0) name = header.substring(pos1,pos2);
      }

      pos1 = header.indexOf("filename=");

      if (pos1 >= 0)
      {
        pos1 += 10;
        pos2 = header.indexOf('"',pos1);
        if (pos2 >= 0) filename = header.substring(pos1,pos2);
      }

      this.name = name;
      this.tmpfile = tmpfile;
      this.content = content;
      this.srcfile = filename;
      this.size = content.length;
    }


    void setOptions(String root, JSONObject options) throws Exception
    {
      if (options == null) return;
      if (!options.has(name)) return;

      options = options.getJSONObject(name);

      if (options.has("tmpfile"))
        tmpfile = options.getBoolean("tmpfile");

      if (options.has("dstfile"))
        dstfile = options.getString("dstfile");

      if (options.has("folder"))
        folder = options.getString("folder");

      if (!folder.startsWith("/"))
        folder = File.separator + folder;

      if (!folder.endsWith("/"))
        folder += File.separator;

      String file = srcfile;
      if (dstfile != null) file = dstfile;

      if (!checkpath(root,root+folder+file))
        throw new Exception("Illegal path specification "+folder+file);
    }


    void write(String root, JSONObject options) throws Exception
    {
      File dest = null;
      setOptions(root,options);
      File folder = new File(root+this.folder);

      folder.mkdirs();

      if (dstfile == null)
      {
        if (tmpfile)
        {
          String type = "";
          int pos = srcfile.lastIndexOf('.');
          if (pos > 0) type = srcfile.substring(pos);
          dest = File.createTempFile("App",type,folder);
          dstfile = this.folder + dest.getName();
        }
        else
        {
          dstfile = this.folder + srcfile;
          dest = new File(root + dstfile);
        }
      }
      else
      {
        dstfile = this.folder + dstfile;
        dest = new File(root + dstfile);
      }

      FileOutputStream out = new FileOutputStream(dest);
      out.write(content);
      out.close();
    }


    @Override
    public String toString()
    {
      return("name="+name+" filename="+srcfile+" size="+size);
    }


    boolean checkpath(String root, String path)
    {
      try
      {
        File p = new File(path);

        if (p.getCanonicalPath().startsWith(root))
          return(true);

        return(false);
      }
      catch (Exception e)
      {
        return(false);
      }
    }
  }
}