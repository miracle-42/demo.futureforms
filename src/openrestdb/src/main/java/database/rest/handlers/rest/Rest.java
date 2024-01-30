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

import java.io.File;
import java.util.Map;
import java.util.Date;
import database.Version;
import java.util.Base64;
import java.util.HashMap;
import org.json.JSONArray;
import java.sql.Savepoint;
import org.json.JSONObject;
import javax.crypto.Cipher;
import java.util.ArrayList;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.io.StringWriter;
import javax.crypto.SecretKey;
import java.io.FileInputStream;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.sql.PreparedStatement;
import database.rest.config.Config;
import database.rest.database.Pool;
import database.rest.servers.Server;
import java.io.ByteArrayOutputStream;
import javax.crypto.spec.SecretKeySpec;
import database.rest.custom.SQLRewriter;
import database.rest.database.BindValue;
import database.rest.database.SQLParser;
import database.rest.custom.SQLValidator;
import database.rest.database.AuthMethod;
import database.rest.custom.PreProcessor;
import database.rest.custom.PostProcessor;
import database.rest.cluster.PreAuthRecord;
import database.rest.database.BindValueDef;
import database.rest.custom.SQLRewriterAPI;
import database.rest.database.NameValuePair;
import database.rest.custom.AuthenticatorAPI;
import java.util.concurrent.ConcurrentHashMap;
import database.rest.handlers.rest.Session.Scope;
import database.rest.custom.Authenticator.AuthResponse;
import database.rest.config.Security.CustomAuthenticator;
import static database.rest.handlers.rest.JSONFormatter.Type.*;


public class Rest
{
  private boolean ping;
  private boolean conn;
  private boolean batch;

  private final String host;
  private final String repo;
  private final Server server;
  private final Config config;
  private final SessionState state;

  private final String secret;
  private final String dateform;

  private final String instance;

  private final boolean compact;
  private final boolean savepoint;

  private Request request = null;

  private int code = 200;
  private boolean failed = false;

  private final SQLRewriter rewriter;
  private final SQLValidator validator;

  private final PreProcessor preprocessor;
  private final PostProcessor postprocessor;

  private final static Logger logger = Logger.getLogger("rest");
  private final HashMap<String,BindValueDef> bindvalues = new HashMap<String,BindValueDef>();
  private static final ConcurrentHashMap<String,String> sqlfiles = new ConcurrentHashMap<String,String>();


  public Rest(Server server, boolean savepoint, String host) throws Exception
  {
    this.ping      = false;
    this.conn      = false;
    this.batch     = false;

    this.host      = host;
    this.savepoint = savepoint;

    this.server    = server;
    this.config    = server.config();
    this.state     = new SessionState(this);

    this.secret    = secret(config);
    this.instance  = server.config().instance();

    this.compact   = config.getDatabase().compact;
    this.rewriter  = config.getDatabase().rewriter;
    this.validator = config.getDatabase().validator;
    this.dateform  = config.getDatabase().dateformat;
    this.repo      = config.getDatabase().repository;

    this.preprocessor  = config.getDatabase().preprocessor;
    this.postprocessor = config.getDatabase().postprocessor;
  }


  public SessionState state()
  {
    return(state);
  }


  public String execute(String path, String payload, boolean returning)
  {
    try
    {
      String ftok = null;
      String ptok = null;
      Session session = null;

      Pool fpool = config.getDatabase().fixed;
      Pool ppool = config.getDatabase().proxy;

      if (fpool != null)
        ftok = config.getDatabase().fixed.token();

      if (ppool != null)
        ptok = config.getDatabase().proxy.token();

      request = new Request(this,path,payload);

      if (request.returning != null)
        returning = Boolean.parseBoolean(request.returning);

      if (request.session != null)
      {
        if (request.session.startsWith("*"))
        {
          StatelessSession sses = null;
          int timeout = config.getREST().timeout;
          sses = decodeStateless(this.secret,this.host,timeout,request.session);

          if (sses.time < 0)
            return(error("Session has timed out"));

          Pool pool = sses.proxy ? ppool : fpool;
          String token = sses.proxy ? ptok : ftok;

          session = new Session(this.config,AuthMethod.PoolToken,pool,"stateless",sses.user,token);

          session.share();
          state.stateless(sses);
          state.session(session);
        }
        else
        {
          session = SessionManager.get(request.session);
          state.session(session);
        }
      }

      if (session != null)
        session.sesid(request.sesid);

      if (request.nvlfunc().equals("batch"))
        return(batch(request.payload));

      if (request.nvlfunc().equals("script"))
        return(script(request.payload));

      String response = exec(request,returning);

      if (state.session != null && !state.session.stateful())
        state.session.disconnect(true);

      return(response);
    }
    catch (Throwable e)
    {
      failed = true;
      return(error(e,request));
    }
  }

  public int response()
  {
    return(code);
  }

  public boolean failed()
  {
    return(failed);
  }


  public boolean isPing()
  {
    return(this.ping);
  }


  public boolean isConnectRequest()
  {
    return(this.conn);
  }


  public String removeSecrets()
  {
    JSONArray services = null;
    String func = request.nvlfunc();
    StringWriter out = new StringWriter();

    if (func.equals("script"))
      services = request.payload.getJSONArray("script");

    if (func.equals("batch"))
      services = request.payload.getJSONArray("batch");

    if (services != null)
    {
      for (int i = 0; i < services.length(); i++)
      {
        JSONObject service = services.getJSONObject(i);
        if (service.has("payload"))
        {
          JSONObject payload = service.getJSONObject("payload");
          payload.remove("auth.secret");
        }
      }
    }

    request.payload.remove("auth.secret");
    request.payload.write(out,2,2);

    String formatted = out.toString();
    formatted = formatted.substring(0,formatted.length()-3);

    return(formatted+"}");
  }


  private String batch(JSONObject payload)
  {
    Scope scope = null;
    String sesid = null;
    Request step = null;
    String result = null;
    String response = "[\n";
    boolean connected = false;
    boolean disconnect = true;
    boolean autocommit = false;
    Request request = this.request;

    try
    {
      this.batch = true;
      JSONArray services = payload.getJSONArray("batch");

      if (payload.has("disconnect"))
        disconnect = payload.getBoolean("disconnect");

      if (state.session() != null)
        sesid = touch();

      if (state.session() != null)
        state.session().ensure();

      if (state.session() != null)
      {
        connected = true;

        if (state.session().autocommit())
        {
          autocommit = true;
          state.session().autocommit(false);
        }

        scope = state.session().scope();
        state.session().scope(Scope.Dedicated);

        state.prepare(true,false);
      }

      for (int i = 0; i < services.length(); i++)
      {
        String cont = "\n";
        if (i < services.length() - 1) cont += ",\n";

        boolean connect = false;
        boolean disconn = false;
        JSONObject spload = null;
        JSONObject service = services.getJSONObject(i);

        String path = service.getString("path");

        if (service.has("payload"))
          spload = service.getJSONObject("payload");

        step = new Request(this,path,spload);

        if (step.nvlfunc().equals("connect"))
          connect = true;

        if (connect && state.session() != null)
          throw new Exception("Already connected");

        if (step.nvlfunc().equals("disconnect"))
          disconn = true;

        if (disconn && state.session() == null)
          throw new Exception("Not connected");

        if (step.nvlfunc().equals("map"))
        {
          map(result,spload);
          continue;
        }

        if (disconn)
        {
          spload = Request.parse("{\"guid\": \""+state.session().guid()+"\"}");
          step = new Request(this,path,spload);
        }

        this.request = step;
        state.setSavePoint();

        result = exec(step,false);

        if (this.failed && state.session() != null)
        {
          if (state.savepoint == null)
          {
            state.lock(true);
            state.session().ensure();

            state.setSavePoint();
            state.session().share();
          }
        }

        response += result + cont;
        this.request = request;
        this.failed = false;

        if (connect && state.session() != null)
        {
          if (state.session().autocommit())
          {
            autocommit = true;
            state.session().autocommit(false);
          }

          scope = state.session().scope();
          state.session().scope(Scope.Dedicated);

          state.prepare(true,false);
        }
      }

      response += "]";

      if (!connected && autocommit && state.session() != null)
      {
        Request commit = new Request(this,"commit","{\"guid\": \""+state.session().guid()+"\"}");
        exec(commit,false);
      }

      if (disconnect && !connected && state.session() != null)
      {
        Request disconn = new Request(this,"disconnect","{\"guid\": \""+state.session().guid()+"\"}");
        exec(disconn,false);
      }

      // Release & remove
      if (state.session() != null)
        state.release(scope,autocommit);

      String resp = "{\"steps\":\n" + response + "\n}";
      if (sesid != null) resp = "{\"session\": \""+sesid+"\", \"steps\":\n" + response + "\n}";

      return(resp);
    }
    catch (Throwable e)
    {
      failed = true;

      if (state.session() != null)
        state.session().scope(scope);

      return(state.release(e,step != null ? step : request));
    }
  }


  private String script(JSONObject payload)
  {
    Scope scope = null;
    String sesid = null;
    Request step = null;
    String result = null;
    boolean connected = false;
    boolean disconnect = true;
    boolean autocommit = false;
    Request request = this.request;

    try
    {
      this.batch = true;
      JSONArray services = payload.getJSONArray("script");

      if (payload.has("disconnect"))
        disconnect = payload.getBoolean("disconnect");

      if (state.session() != null)
        sesid = touch();

      if (state.session() != null)
        state.session().ensure();

      if (state.session() != null)
      {
        connected = true;

        if (state.session().autocommit())
        {
          autocommit = true;
          state.session().autocommit(false);
        }

        scope = state.session().scope();
        state.session().scope(Scope.Dedicated);

        state.prepare(payload);
      }

      for (int i = 0; i < services.length(); i++)
      {
        boolean connect = false;
        boolean disconn = false;
        JSONObject spload = null;
        JSONObject service = services.getJSONObject(i);

        String path = service.getString("path");

        if (service.has("payload"))
          spload = service.getJSONObject("payload");

        step = new Request(this,path,spload);

        if (step.nvlfunc().equals("connect"))
          connect = true;

        if (connect && state.session() != null)
          throw new Exception("Already connected");

        if (step.nvlfunc().equals("disconnect"))
          disconn = true;

        if (disconn && state.session() == null)
          throw new Exception("Not connected");

        if (step.nvlfunc().equals("map"))
        {
          map(result,spload);
          continue;
        }

        // omit disconnect
        String last = result;

        if (disconn)
        {
          spload = Request.parse("{\"guid\": \""+state.session().guid()+"\"}");
          step = new Request(this,path,spload);
        }

        this.request = step;
        result = exec(step,false);
        this.request = request;

        JSONObject res = Request.parse(result);
        result = res.put("step",i).toString();

        if (failed)
          break;

        if (disconn)
          result = last;

        if (connect && state.session() != null)
        {
          if (state.session().autocommit())
          {
            autocommit = true;
            state.session().autocommit(false);
          }

          scope = state.session().scope();
          state.session().scope(Scope.Dedicated);

          state.prepare(payload);
        }
      }

      if (!connected && autocommit && state.session() != null)
      {
        Request commit = new Request(this,"commit","{\"guid\": \""+state.session().guid()+"\"}");
        exec(commit,false);
      }

      if (disconnect && !connected && state.session() != null)
      {
        Request disconn = new Request(this,"disconnect","{\"guid\": \""+state.session().guid()+"\"}");
        exec(disconn,false);
      }

      JSONObject res = Request.parse(result);

      res.put("success",true);
      if (sesid != null) res.put("session",sesid);

      // Release & remove
      if (state.session() != null)
        state.release(scope,autocommit);

      return(res.toString());
    }
    catch (Throwable e)
    {
      failed = true;

      if (state.session() != null)
        state.session().scope(scope);

      return(state.release(e, step != null ? step : request));
    }
  }


  private String exec(Request request, boolean returning)
  {
    String response = null;

    switch(request.cmd)
    {
      case "status" :
        response = status(); break;

      case "ping" :
        response = ping(request.payload); break;

      case "connect" :
        response = connect(request.payload); break;

      case "commit" :
        response = commit(); break;

      case "release" :
        response = release(); break;

      case "rollback" :
        response = rollback(); break;

      case "disconnect" :
        response = disconnect(); break;

      case "exec" :
      {
          switch(request.func)
          {
            case "ddl" :
              response = ddl(request.payload); break;

            case "call" :
              response = call(request.payload); break;

            case "select" :
              response = select(request.payload); break;

            case "fetch" :
              response = fetch(request.payload); break;

            case "merge" :
              response = update(request.payload,returning); break;

            case "insert" :
              response = update(request.payload,returning); break;

            case "update" :
              response = update(request.payload,returning); break;

            case "delete" :
              response = update(request.payload,returning); break;

            default : return(error("Unknown command "+request));
          }

          break;
      }

      default :
        failed = true;
        return(error("Unknown command "+request.cmd));
    }

    return(response);
  }


  private String ping(JSONObject payload)
  {
    String sesid = null;

    try
    {
      this.ping = true;
      boolean keepalive = false;

      if (payload.has("keepalive"))
        keepalive = payload.getBoolean("keepalive");

      if (keepalive && state.session() == null)
        return(error("keepalive failed, session does not exist"));

      if (keepalive)
        sesid = touch();

      if (state.session() != null)
        state.release();
    }
    catch (Throwable e)
    {
      failed = true;
      return(error(e,request));
    }

    JSONFormatter json = new JSONFormatter();
    json.success(true);

    if (state.session() == null)
      json.add("connected",false);

    if (sesid != null)
      json.add("session",sesid);

    json.add("instance",instance);
    return(json.toString());
  }


  private String status()
  {
    boolean fp = true;
    boolean pp = true;

    String message = null;

    Pool fpool = null;
    Pool ppool = null;

    try
    {
      fpool = config.getDatabase().fixed;
      ppool = config.getDatabase().proxy;

      if (fpool != null)
      {
        if (!fpool.test())
        {
          fp = false;
          message = "Fixed pool test failed";
        }
      }

      if (ppool != null)
      {
        if (!ppool.test())
        {
          pp = false;
          message = "Proxy pool test failed";
        }
      }
    }
    catch(Throwable e)
    {
      message = e.getMessage();

      if (message == null)
        message = "An unexpected error occured";
    }

    boolean success = (message == null);

    JSONFormatter json = new JSONFormatter();
    json.success(success);

    if (ppool != null)
      json.add("proxy-pool",pp);

    if (fpool != null)
      json.add("fixed-pool",fp);

    if (message != null)
      json.add("cause",message);

    json.add("instance",instance);
    return(json.toString());
  }


  private String connect(JSONObject payload)
  {
    int timeout = 0;
    Pool pool = null;
    this.conn = true;
    String meth = null;
    String type = null;
    String scope = null;
    String secret = null;
    String username = null;
    boolean nowait = false;
    AuthMethod method = null;
    boolean privateses = true;
    AuthResponse custresp = null;
    ArrayList<NameValuePair<Object>> clientinfo = new ArrayList<NameValuePair<Object>>();

    try
    {
      timeout = config.getREST().timeout;
      nowait = this.config.getDatabase().nowait;
      type = config.getDatabase().type.toString();

      if (payload.has("username"))
        username = payload.getString("username");

      if (payload.has("private"))
        privateses = payload.getBoolean("private");

      if (payload.has("scope"))
        scope = payload.getString("scope");

      if (payload.has("auth.secret"))
        secret = payload.getString("auth.secret");

      if (payload.has("auth.method"))
          meth = payload.getString("auth.method");

      if (meth == null)
          return(error("No authentication method specified"));

      meth = meth.toLowerCase();
      CustomAuthenticator custom = config.getSecurity().authenticator(meth);

      if (custom != null)
      {
        meth = "custom";

        if (!custom.enabled)
          return(error("Authentication method "+custom.name+" not allowed"));

        AuthenticatorAPI api = new AuthenticatorAPI(server,host);
        custresp = custom.authenticator.authenticate(api,payload);

        if (!custresp.success)
          return(error(custom.name+" authentication failed"));

        username = custresp.user;
      }

      if (payload.has("clientinfo"))
      {
        JSONArray entries = payload.getJSONArray("clientinfo");

        for (int i = 0; i < entries.length(); i++)
        {
          JSONObject entry = entries.getJSONObject(i);
          clientinfo.add(new NameValuePair<Object>(entry.getString("name"),entry.get("value")));
        }
      }

      switch(meth)
      {
        case "sso"      : method = AuthMethod.SSO; break;
        case "custom"   : method = AuthMethod.Custom; break;
        case "database" : method = AuthMethod.Database; break;
        case "token"    : method = AuthMethod.PoolToken; break;

        default: return(error("Unknown authentication method "+meth));
      }

      if (method == AuthMethod.PoolToken && !config.getSecurity().tokens())
        throw new Exception("Authentication method "+meth+" not allowed");

      if (method == AuthMethod.Database && !config.getSecurity().database())
        throw new Exception("Authentication method "+meth+" not allowed");

      boolean usepool = false;

      if (method == AuthMethod.Custom)
        usepool = true;

      if (scope.equalsIgnoreCase("stateless"))
        usepool = true;

      if (method == AuthMethod.SSO)
      {
        usepool = true;

        if (server.getAuthReader() != null)
          SessionManager.refresh(server.getAuthReader());

        PreAuthRecord rec = SessionManager.validate(secret);
        if (rec == null) throw new Exception("SSO authentication failed");

        if (rec.username != null && rec.username.length() > 0)
          username = rec.username;
      }

      if (method == AuthMethod.PoolToken)
        usepool = true;

      if (Session.forcePool(scope))
        usepool = true;

      if (usepool)
      {
        if (username != null) pool = config.getDatabase().proxy;
        else                  pool = config.getDatabase().fixed;

        if (pool == null)
          throw new Exception("Connection pool not configured");
      }

      state.session(new Session(this.config,method,pool,scope,username,secret));
      state.session.setClientInfo(clientinfo);

      state.session().connect(batch);
      if (batch) state.session().share();
    }
    catch (Throwable e)
    {
      failed = true;
      return(error(e,request));
    }

    String sesid = null;
    JSONFormatter json = new JSONFormatter();

    if (state.session().stateful())
    {
      sesid = encode(privateses,state.session().guid(),host);
    }
    else
    {
      try
      {
        boolean ppool = pool == config.getDatabase().proxy;
        sesid = encodeStateless(this.secret,host,privateses,ppool,username);
      }
      catch (Throwable e)
      {
        failed = true;
        return(error(e,request));
      }
    }

    json.success(true);
    json.add("type",type);
    json.add("nowait",nowait);
    json.add("timeout",timeout);
    json.add("private",privateses);
    json.add("autocommit",state.session().autocommit());
    json.add("scope",state.session().scope());
    json.add("session",sesid);
    json.add("version",Version.number);
    json.add("instance",instance);

    state.session().sesid(sesid);
    SessionManager.history(state.session(),true);

    if (custresp != null)
    {
      for (Map.Entry<String,Object> entry : custresp.attrs.entrySet())
        json.add(entry.getKey(),entry.getValue());
    }

    return(json.toString());
  }


  public String connect(String user) throws Exception
  {
    Pool pool = null;
    String sesid = null;
    AuthMethod method = AuthMethod.PoolToken;

    if (user != null) pool = config.getDatabase().proxy;
    else              pool = config.getDatabase().fixed;

    state.session(new Session(this.config,method,pool,"dedicated",user,pool.token()));

    state.session().connect(false);
    sesid = encode(true,state.session().guid(),host);

    return(sesid);
  }


  private String disconnect()
  {
    if (state.session() == null)
    {
      failed = true;
      return(ncerror());
    }

    try
    {
      SessionManager.history(state.session(),false);
      state.session().disconnect();
      state.session(null);
    }
    catch (Throwable e)
    {
      failed = true;
      return(error(e,request));
    }

    JSONFormatter json = new JSONFormatter();

    json.success(true);
    json.add("disconnected",true);

    json.add("instance",instance);
    return(json.toString());
  }


  private String ddl(JSONObject payload)
  {
    String sesid = null;
    boolean success = false;

    if (state.session() == null)
    {
      failed = true;
      return(ncerror());
    }

    try
    {
      sesid = touch();

      String sql = getStatement(payload);
      if (sql == null) return(error("Attribute \"sql\" is missing"));

      state.ensure();
      state.prepare(payload);

      state.lock();
      success = state.session().execute(sql);
      state.unlock();

      state.release();
    }
    catch (Throwable e)
    {
      return(state.release(e,request));
    }

    JSONFormatter json = new JSONFormatter();
    json.success(true);
    json.add("result",success);

    if (sesid != null)
      json.add("session",sesid);

    json.add("instance",instance);
    return(json.toString());
  }


  private String select(JSONObject payload)
  {
    if (state.session() == null)
    {
      failed = true;
      return(ncerror());
    }

    try
    {
      int rows = 0;
      int skip = 0;
      String sesid = null;
      boolean lock = false;
      boolean nowait = true;
      String curname = null;
      boolean describe = false;
      boolean compact = this.compact;
      String dateform = this.dateform;
      String username = state.session().username();
      HashMap<String,BindValueDef> assertions = null;

      state.ensure();
      sesid = touch();

      if (rewriter != null)
      {
        SQLRewriterAPI api = new SQLRewriterAPI(this);
        rewriter.rewrite(api,username,payload);
      }

      if (preprocessor != null)
        preprocessor.process(username,payload);

      if (payload.has("lock"))
        lock = payload.getBoolean("lock");

      if (payload.has("nowait"))
        nowait = payload.getBoolean("nowait");

      if (payload.has("assert"))
        assertions = this.getAssertions(payload.getJSONArray("assert"));

      if (payload.has("bindvalues"))
        this.getBindValues(payload.getJSONArray("bindvalues"));

      if (payload.has("rows")) rows = payload.getInt("rows");
      if (payload.has("skip")) skip = payload.getInt("skip");
      if (payload.has("describe")) describe = payload.getBoolean("describe");

      if (payload.has("dateformat"))
      {
        if (payload.isNull("dateformat")) dateform = null;
        else dateform = payload.getString("dateformat");
      }

      if (payload.has("compact")) compact = payload.getBoolean("compact");
      if (state.session().stateful() && payload.has("cursor")) curname = payload.getString("cursor");

      String sql = getStatement(payload);
      if (sql == null) return(error("Attribute \"sql\" is missing"));

      SQLParser parser = new SQLParser(bindvalues,sql);

      sql = parser.sql();
      ArrayList<BindValue> bindvalues = parser.bindvalues();

      if (!this.config.getDatabase().nowait)
        nowait = false;

      if (lock)
        sql += " for update";

      if (lock && nowait)
        sql += " nowait";

      if (lock)
        payload.put("sql",sql);

      if (validator != null)
        validator.validate(username,payload);

      state.session().closeCursor(curname);

      state.prepare(payload);

      state.lock();
      Cursor cursor = state.session().executeQuery(curname,sql,bindvalues,dateform);
      state.unlock();

      cursor.rows = rows;
      cursor.compact = compact;
      cursor.dateformat = dateform;

      String[] types = null;
      Integer[][] precs = null;

      if (describe)
      {
        types = state.session().getColumnTypes(cursor);
        precs = state.session().getColumnPrecision(cursor);
      }

      String[] columns = state.session().getColumnNames(cursor);
      ArrayList<Object[]> table = state.session().fetch(cursor,skip);

      state.release();

      String assertmsg = null;
      ArrayList<Object[]> failures = new ArrayList<Object[]>();
      String[] asserts = new String[] {"column","assert","value"};

      if (assertions != null && table.size() == 0)
        assertmsg = "Record was deleted by another user";

      if (assertions != null && table.size() > 0)
      {
        for (int i = 0; i < columns.length; i++)
        {
          String c = columns[i].toLowerCase();
          BindValueDef check = assertions.get(c);

          if (check != null)
          {
            boolean failed = false;

            Object b = check.value;
            Object a = table.get(0)[i];

            if (a == null && b != null) failed = true;
            if (a != null && b == null) failed = true;

            if (a != null && b != null)
            {
              if (check.isDate() && a instanceof Long)
                b = ((Date) b).getTime();

              if (a instanceof BigInteger)
                b = new BigInteger(b+"");

              if (a instanceof BigDecimal)
                b = new BigDecimal(b+"");

              if (a instanceof BigDecimal)
              {
                if (((BigDecimal) a).compareTo((BigDecimal) b) != 0)
                  failed = true;
              }
              else
              {
                if (!a.equals(b))
                  failed = true;
              }
            }

            if (failed)
            {
              assertmsg = "Record was changed by another user";
              failures.add(new Object[] {c,b,a});
            }
          }
        }
      }

      JSONFormatter json = new JSONFormatter();

      json.success(assertmsg == null);
      json.add("more",!cursor.closed);

      if (lock && assertmsg != null)
      {
        json.add("lock",false);
        if (nowait) json.add("nowait",true);
      }

      if (assertmsg != null)
      {
        this.failed = true;
        json.add("assert",assertmsg);
        json.add("message","Assertion failed");
      }

      if (failures.size() > 0)
      {
        json.push("violations",ObjectArray);
        for(Object[] check : failures)
        json.add(asserts,check);
        json.pop();
      }

      if (describe)
      {
        json.push("types",SimpleArray);
        json.add(types);
        json.pop();

        json.push("precision",Matrix);
        json.add(precs);
        json.pop();
      }

      if (compact)
      {
        json.push("columns",SimpleArray);
        json.add(columns);
        json.pop();

        json.push("rows",Matrix);
        json.add(table);
        json.pop();
      }
      else
      {
        json.push("rows",ObjectArray);
        for(Object[] row : table) json.add(columns,row);
        json.pop();
      }

      if (cursor.name == null)
        state.session().closeCursor(cursor);

      if (sesid != null)
        json.add("session",sesid);

      json.add("instance",instance);
      String response = json.toString();

      if (postprocessor != null)
      {
        JSONObject rsp = Request.parse(response);
        postprocessor.process(username,payload,rsp);
        response = rsp.toString(2);
      }

      return(response);
    }
    catch (Throwable e)
    {
      failed = true;
      return(state.release(e,request));
    }
  }


  private String update(JSONObject payload, boolean returning)
  {
    String sesid = null;
    boolean prepared = false;
    boolean autocommit = false;
    Request request = this.request;
    String dateform = this.dateform;
    String username = state.session().username();

    if (state.session() == null)
    {
      failed = true;
      return(ncerror());
    }

    try
    {
      state.ensure();
      sesid = touch();

      boolean lock = false;

      if (rewriter != null)
      {
        SQLRewriterAPI api = new SQLRewriterAPI(this);
        rewriter.rewrite(api,username,payload);
      }

      if (preprocessor != null)
        preprocessor.process(username,payload);

      if (payload.has("lock"))
        lock = payload.getBoolean("lock");

      if (lock || payload.has("assert"))
      {
        JSONObject sel4upd = makeAssert(payload);

        if (sel4upd != null)
        {
          if (state.session().autocommit())
          {
            autocommit = true;
            state.session().autocommit(false);
          }

          prepared = true;
          state.prepare(payload);

          this.request = new Request(this,"select",sel4upd);
          String response = select(sel4upd);
          this.request = request;

          if (autocommit)
          {
            autocommit = false;
            state.session().autocommit(true);
          }

          if (failed)
          {
            state.release();
            return(response);
          }

          logger.fine
          (
            "\n-----------------assert--------------------\n" +
            response+
            "\n-------------------------------------------\n"
          );
        }
      }

      if (!prepared)
        state.prepare(payload);

      if (payload.has("dateformat"))
      {
        if (payload.isNull("dateformat")) dateform = null;
        else dateform = payload.getString("dateformat");
      }

      if (payload.has("returning"))
        returning = payload.getBoolean("returning");

      if (payload.has("bindvalues"))
        this.getBindValues(payload.getJSONArray("bindvalues"));

      String sql = getStatement(payload);
      if (sql == null) return(error("Attribute \"sql\" is missing"));

      SQLParser parser = new SQLParser(bindvalues,sql);

      sql = parser.sql();
      ArrayList<BindValue> bindvalues = parser.bindvalues();

      if (validator != null)
        validator.validate(username,payload);

      if (returning)
      {
        state.lock();
        Cursor cursor = state.session().executeUpdateWithReturnValues(sql,bindvalues,this.bindvalues,dateform);
        state.unlock();

        cursor.dateformat = dateform;
        JSONFormatter json = new JSONFormatter();

        String[] columns = state.session().getColumnNames(cursor);
        ArrayList<Object[]> table = state.session().fetch(cursor,0);

        state.release();
        json.success(true);
        json.add("affected",table.size());

        if (columns != null)
        {
          json.push("columns",SimpleArray);
          json.add(columns);
          json.pop();
        }

        json.push("rows",ObjectArray);
        for(Object[] row : table) json.add(columns,row);
        json.pop();

        if (sesid != null)
          json.add("session",sesid);

        json.add("instance",instance);
        String response = json.toString();

        if (postprocessor != null)
        {
          JSONObject rsp = Request.parse(response);
          postprocessor.process(username,payload,rsp);
          response = rsp.toString(2);
        }

        return(response);
      }
      else
      {
        state.lock();
        int rows = state.session().executeUpdate(sql,bindvalues,dateform);
        state.unlock();

        state.release();

        JSONFormatter json = new JSONFormatter();

        json.success(true);
        json.add("affected",rows);

        if (sesid != null)
          json.add("session",sesid);

        json.add("instance",instance);
        String response = json.toString();

        if (postprocessor != null)
        {
          JSONObject rsp = Request.parse(response);
          postprocessor.process(username,payload,rsp);
          response = rsp.toString(2);
        }

        return(response);
      }
    }
    catch (Throwable e)
    {
      failed = true;

      if (autocommit)
      {
        try {state.session().autocommit(true);}
        catch (Exception ce) {;}
      }

      return(state.release(e,this.request));
    }
  }


  private String call(JSONObject payload)
  {
    if (state.session() == null)
    {
      failed = true;
      return(ncerror());
    }

    try
    {
      state.ensure();
      String sesid = touch();

      String dateform = this.dateform;
      String username = state.session().username();

      if (rewriter != null)
      {
        SQLRewriterAPI api = new SQLRewriterAPI(this);
        rewriter.rewrite(api,username,payload);
      }

      if (preprocessor != null)
        preprocessor.process(username,payload);

      if (payload.has("dateformat"))
      {
        if (payload.isNull("dateformat")) dateform = null;
        else dateform = payload.getString("dateformat");
      }

      if (payload.has("bindvalues"))
        this.getBindValues(payload.getJSONArray("bindvalues"));

      String sql = getStatement(payload);
      if (sql == null) return(error("Attribute \"sql\" is missing"));

      SQLParser parser = new SQLParser(bindvalues,sql,true);

      sql = parser.sql();
      ArrayList<BindValue> bindvalues = parser.bindvalues();

      if (validator != null)
        validator.validate(username,payload);

      state.prepare(payload);

      state.lock();
      ArrayList<NameValuePair<Object>> values = state.session().executeCall(sql,bindvalues,dateform);
      state.unlock();

      state.release();

      JSONFormatter json = new JSONFormatter();

      json.success(true);

      for(NameValuePair<Object> nvp : values)
        json.add(nvp.getName(),nvp.getValue());

      if (sesid != null)
        json.add("session",sesid);

      json.add("instance",instance);
      String response = json.toString();

      if (postprocessor != null)
      {
        JSONObject rsp = Request.parse(response);
        postprocessor.process(username,payload,rsp);
        response = rsp.toString(2);
      }

      return(response);
    }
    catch (Throwable e)
    {
      failed = true;
      return(state.release(e,request));
    }
  }


  private String fetch(JSONObject payload)
  {
    if (state.session() == null)
    {
      failed = true;
      return(ncerror());
    }

    try
    {
      boolean close = false;
      String sesid = touch();
      JSONFormatter json = new JSONFormatter();
      String name = payload.getString("cursor");

      Cursor cursor = state.session().getCursor(name);
      if (payload.has("close")) close = payload.getBoolean("close");

      if (cursor == null)
        return(error("Cursor \'"+name+"\' does not exist"));

      if (close)
      {
        state.session().closeCursor(name);

        json.success(true);
        json.add("closed",true);
        state.release();
        json.add("instance",instance);
        return(json.toString());
      }

      state.ensure();
      state.prepare(payload);

      String[] columns = state.session().getColumnNames(cursor);
      ArrayList<Object[]> table = state.session().fetch(cursor,0);

      state.release();

      json.success(true);
      json.add("more",!cursor.closed);

      if (cursor.compact)
      {
        json.push("columns",SimpleArray);
        json.add(columns);
        json.pop();

        json.push("rows",Matrix);
        json.add(table);
        json.pop();
      }
      else
      {
        json.push("rows",ObjectArray);
        for(Object[] row : table) json.add(columns,row);
        json.pop();
      }

      if (sesid != null)
        json.add("session",sesid);

      json.add("instance",instance);
      return(json.toString());
    }
    catch (Throwable e)
    {
      failed = true;
      return(state.release(e,request));
    }
  }


  private String commit()
  {
    String sesid = null;
    boolean success = true;

    if (state.session() == null)
    {
      failed = true;
      return(ncerror());
    }

    try
    {
      sesid = touch();
      success = state.session().commit();
    }
    catch (Exception e)
    {
      failed = true;
      return(state.release(e,request));
    }

    JSONFormatter json = new JSONFormatter();

    json.success(success);

    if (!success)
      json.add("message","Transaction already comitted");

    if (sesid != null)
      json.add("session",sesid);

    json.add("instance",instance);
    return(json.toString());
  }


  private String rollback()
  {
    String sesid = null;
    boolean success = true;

    if (state.session() == null)
    {
      failed = true;
      return(ncerror());
    }

    try
    {
      sesid = touch();
      success = state.session().rollback();
    }
    catch (Exception e)
    {
      failed = true;
      return(state.release(e,request));
    }

    JSONFormatter json = new JSONFormatter();

    json.success(success);

    if (!success)
      json.add("message","Transaction already rolled back");

    if (sesid != null)
      json.add("session",sesid);

    json.add("instance",instance);
    return(json.toString());
  }


  private String release()
  {
    boolean success = true;

    if (state.session() == null)
    {
      failed = true;
      return(ncerror());
    }

    try
    {
      success = state.session().releaseConnection();
    }
    catch (Exception e)
    {
      failed = true;
      return(state.release(e,request));
    }

    JSONFormatter json = new JSONFormatter();

    json.success(success);

    if (!success)
      json.add("message","Unable to release connection");

    json.add("instance",instance);
    return(json.toString());
  }


  private void map(String latest, JSONObject payload) throws Exception
  {
    try
    {
      JSONArray rows = null;
      ArrayList<String> cols = null;
      JSONObject last = Request.parse(latest);

      if (last.has("rows"))
        rows = last.getJSONArray("rows");

      if (last.has("columns"))
      {
        cols = new ArrayList<String>();
        JSONArray columns = last.getJSONArray("columns");
        for (int i = 0; i < columns.length(); i++)
          cols.add((String) columns.get(i));
      }

      String[] bindvalues = JSONObject.getNames(payload);

      if (rows == null)
      {
        // Previous was procedure
        for (int i = 0; i < bindvalues.length; i++)
        {
          String bindv = bindvalues[i];
          String pointer = payload.getString(bindv).trim();

          if (pointer.equals("@session"))
          {
            String sesid = null;
            if (state.session() != null) sesid = state.session().sesid();
            this.bindvalues.put(bindv,new BindValueDef(bindv,sesid));
            continue;
          }

          this.bindvalues.put(bindv,new BindValueDef(bindv,last.get(pointer)));
        }
      }
      else
      {
        // Previous was select
        for (int i = 0; i < bindvalues.length; i++)
        {
          int row = 0;
          Object value = null;
          String bindv = bindvalues[i];
          String pointer = payload.getString(bindv).trim();

          if (pointer.equals("@session"))
          {
            String sesid = null;
            if (state.session() != null) sesid = state.session().sesid();
            this.bindvalues.put(bindv,new BindValueDef(bindv,sesid));
            continue;
          }

          if (pointer.endsWith("]"))
          {
            int pos = pointer.lastIndexOf('[');

            if (pos > 0)
            {
              row = Integer.parseInt(pointer.substring(pos+1,pointer.length()-1));
              pointer = pointer.substring(0,pos);
            }
          }

          if (cols == null)
          {
            JSONObject record = (JSONObject) rows.get(row);
            value = record.get(pointer);
          }
          else
          {
            int col = -1;

            for (int j = 0; j < cols.size(); j++)
            {
              if (cols.get(j).equals(pointer))
              {
                col = j;
                break;
              }
            }

            if (row < 0 || col < 0)
            {
              logger.severe("Unable to map "+pointer);
              continue;
            }

            JSONArray record = (JSONArray) rows.get(row);
            value = record.get(col);
          }

          this.bindvalues.put(bindv,new BindValueDef(bindv,value));
        }
      }
    }
    catch (Throwable e)
    {
      failed = true;
      error(e,request);
    }
  }


  public String getStatement(JSONObject payload) throws Exception
  {
    if (!payload.has("sql"))
      return(null);

    String file = "@";
    String sql = payload.getString("sql");

    if (sql.startsWith(file))
    {
      String fname = sql.substring(file.length());
      if (!fname.startsWith(File.separator)) fname = File.separator + fname;

      fname = repo + fname;
      sql = sqlfiles.get(fname);
      if (sql != null) return(sql);

      File f = new File(fname);

      String path = f.getCanonicalPath();

      if (!path.startsWith(repo+File.separator))
        throw new Exception("Illegal path '"+path+"'. File must be located in repository");

      byte[] content = new byte[(int) f.length()];
      FileInputStream in = new FileInputStream(f);
      int read = in.read(content);
      in.close();

      if (read != content.length)
        throw new Exception("Could not read '"+f.getCanonicalPath()+"'");

      sql = new String(content);
      sqlfiles.put(fname,sql);
    }

    return(sql);
  }


  private void getBindValues(JSONArray values)
  {
    for (int i = 0; i < values.length(); i++)
    {
      JSONObject bvalue = values.getJSONObject(i);

      Object value = null;
      boolean outval = false;

      String name = bvalue.getString("name");
      String type = bvalue.getString("type");

      if (!bvalue.has("value")) outval = true;
      else value = bvalue.get("value");

      BindValueDef curr = this.bindvalues.get(name);
      BindValueDef next = new BindValueDef(name,type,outval,value);

      if (curr != null)
      {
        if (curr.type != next.type)
          logger.warning("Bindvalue '"+name+"' is sent twice, with different types");

        if (curr.value != null)
          continue;
      }

      this.bindvalues.put(name,next);
    }
  }


  private HashMap<String,BindValueDef> getAssertions(JSONArray values)
  {
    HashMap<String,BindValueDef> assertions =
      new HashMap<String,BindValueDef>();

    for (int i = 0; i < values.length(); i++)
    {
      JSONObject bvalue = values.getJSONObject(i);

      Object value = null;
      String name = bvalue.getString("name");
      String type = bvalue.getString("type");

      if (name != null) name = name.toLowerCase();
      if (bvalue.has("value")) value = bvalue.get("value");

      // BindValueDef is appropiate for assertions as well
      assertions.put(name,new BindValueDef(name,type,false,value));
    }

    return(assertions);
  }


  private JSONObject makeAssert(JSONObject payload) throws Exception
  {
    String stmt = payload.getString("sql");

    HashMap<String,BindValueDef> assertions =
      new HashMap<String,BindValueDef>();

    if (payload.has("assert"))
      assertions = this.getAssertions(payload.getJSONArray("assert"));

    String sql = "select ";
    String[] columns = assertions.keySet().toArray(new String[assertions.size()]);

    if (columns.length == 0)
      sql += "'x' as locked";

    for (int i = 0; i < columns.length; i++)
    {
      sql += columns[i];
      if (i < columns.length - 1) sql += ",";
    }

    String from = null;
    String where = null;
    String lstmt = stmt.toLowerCase();

    int fpos = lstmt.indexOf("from");
    int wpos = lstmt.indexOf("where");

    if (wpos > 0)
      where = stmt.substring(wpos).trim();

    if (fpos > 0)
    {
      if (wpos > fpos)
        from = stmt.substring(fpos+5,wpos).trim();
    }
    else
    {
      String[] words = lstmt.split(" ");
      from = words[1];
    }

    if (from == null) throw new Exception("no from clause detected in "+stmt);
    if (where == null) throw new Exception("no where clause detected in "+stmt);

    sql += " from " + from + " " + where;

    JSONObject json = Request.parse("{}");

    json.put("lock",true);
    json.put("nowait",true);

    if (payload.has("dateformat"))
      json.put("dateformat",payload.get("dateformat"));

    if (payload.has("compact"))
      json.put("compact",payload.get("compact"));

    if (payload.has("assert"))
      json.put("assert",payload.getJSONArray("assert"));

    if (payload.has("bindvalues"))
      json.put("bindvalues",payload.getJSONArray("bindvalues"));

    json.put("sql",sql);
    return(json);
  }


  private boolean getSavepoint(JSONObject payload)
  {
    boolean defaults = savepoint;

    try
    {
      boolean savepoint = defaults;

      if (payload != null && payload.has("savepoint"))
        savepoint = payload.getBoolean("savepoint");

      return(savepoint);
    }
    catch (Throwable e)
    {
      error(e,request);
      return(defaults);
    }
  }


  String touch() throws Exception
  {
    String sesid = null;

    if (state.session().stateful())
    {
      state.session().touch();
    }
    else
    {
        StatelessSession sses = state.stateless();
        sesid = encodeStateless(secret,host,sses.priv,sses.proxy,sses.user);
    }

    return(sesid);
  }


  String encode(boolean priv, String data)
  {
    return(encode(priv,data,host));
  }


  String decode(String data) throws Exception
  {
    return(decode(data,host));
  }


  static String encode(boolean priv, String data, String salt)
  {
    byte[] bdata = data.getBytes();
    byte[] bsalt = salt.getBytes();

    byte indicator;
    long ran = System.currentTimeMillis() % 25;

    if (priv) indicator = (byte) ('a' + ran);
    else      indicator = (byte) ('A' + ran);

    byte[] token = new byte[bdata.length+1];

    token[0] = indicator;
    System.arraycopy(bdata,0,token,1,bdata.length);

    if (priv)
    {
      for (int i = 1; i < token.length; i++)
      {
        byte s = bsalt[i % bsalt.length];
        token[i] = (byte) (token[i] ^ s);
      }
    }

    token = Base64.getEncoder().encode(token);

    int len = token.length;
    while(token[len-1] == '=') len--;

    data = new String(token,0,len);
    data = data.replaceAll("/","@");

    return(data);
  }


  static String decode(String data, String salt) throws Exception
  {
    try
    {
      byte[] bsalt = salt.getBytes();
      while(data.length() % 4 != 0) data += "=";

      data = data.replaceAll("@","/");
      byte[] bdata = Base64.getDecoder().decode(data);

      byte indicator = bdata[0];
      boolean priv = (indicator >= 'a' && indicator <= 'z');

      byte[] token = new byte[bdata.length-1];
      System.arraycopy(bdata,1,token,0,token.length);

      if (priv)
      {
        for (int i = 0; i < token.length; i++)
        {
          byte s = bsalt[(i+1) % bsalt.length];
          token[i] = (byte) (token[i] ^ s);
        }
      }

      return(new String(token));
    }
    catch (Throwable e)
    {
      throw new Exception("Failed decoding session",e);
    }
  }


  static String encodeStateless(String secret, String host, boolean priv, boolean proxy, String user) throws Exception
  {
    byte[] ctrl = new byte[4];

    if (priv) ctrl[0] |= 1 << 0;
    if (proxy) ctrl[0] |= 1 << 1;

    System.arraycopy(secret.getBytes(),1,ctrl,1,3);

    long time = System.currentTimeMillis();
    ByteArrayOutputStream out = new ByteArrayOutputStream();

    //Scramble user to harden hacking

    if (user != null)
    {
      byte[] salt = (time+"").getBytes();
      byte[] scrambled = user.getBytes("UTF-8");

      for (int i = 0; i < scrambled.length; i++)
      {
        byte s = salt[i % salt.length];
        scrambled[i] = (byte) (scrambled[i] ^ s);
      }

      user = new String(scrambled);
    }

    out.write(ctrl);
    out.write(hash(host));
    out.write(hash(time));
    if (user != null) out.write(user.getBytes());

    byte[] bytes = out.toByteArray();
    return(encrypt(secret,bytes));
  }


  static StatelessSession decodeStateless(String secret, String hostname, int timeout, String data) throws Exception
  {
    int host = 0;
    long time = 0;
    String user = null;
    boolean priv = false;
    boolean proxy = false;
    byte[] bytes = decrypt(secret,data);

    time = unHash(bytes,8,8);
    host = (int) unHash(bytes,4,4);

    priv = ((bytes[0] & (1 << 0)) != 0);
    proxy = ((bytes[0] & (1 << 1)) != 0);

    byte[] hello = secret.getBytes();

    for (int i = 1; i < 4; i++)
    {
      if (bytes[i] != hello[i])
        throw new Exception("Session has been tampered with");
    }

    if (bytes.length > 16)
    {
      user = new String(bytes,16,bytes.length-16);

      byte[] salt = (time+"").getBytes();
      byte[] scrambled = user.getBytes();

      for (int i = 0; i < scrambled.length; i++)
      {
        byte s = salt[i % salt.length];
        scrambled[i] = (byte) (scrambled[i] ^ s);
      }

      user = new String(scrambled,"UTF-8");
    }

    if (hostname.hashCode() != host)
      throw new Exception("Session origins from different host");

    if (System.currentTimeMillis() - time > timeout * 1000)
      time = -1;

    return(new StatelessSession(time,user,priv,proxy));
  }

  static byte[] hash(int data)
  {
    byte[] hash = BigInteger.valueOf(data).toByteArray();
    return(hash);
  }


  static byte[] hash(long data)
  {
    byte[] hash = new byte[8];
    byte[] hval = BigInteger.valueOf(data).toByteArray();
    System.arraycopy(hval,0,hash,hash.length-hval.length,hval.length);
    return(hash);
  }


  static byte[] hash(String data)
  {
    byte[] hash = new byte[4];
    byte[] hval = BigInteger.valueOf(data.hashCode()).toByteArray();
    System.arraycopy(hval,0,hash,0,hval.length);
    return(hash);
  }


  static long unHash(byte[] data, int pos, int len)
  {
    return(new BigInteger(data,pos,len).longValue());
  }


  static String secret(Config config) throws Exception
  {
    String secret = config.getSecurity().secret();

    for (int i = 0; secret.length() < 32; i++)
      secret += (char) ('a' + (i%26));

    if (secret.length() > 32)
      secret = secret.substring(0,32);

    return(secret);
  }


  static String encrypt(String secret, byte[] data) throws Exception
  {
    byte[]    salt = secret.getBytes("UTF-8");
    Cipher    ciph = Cipher.getInstance("AES");
    SecretKey skey = new SecretKeySpec(salt,"AES");

    ciph.init(Cipher.ENCRYPT_MODE,skey);
    data = ciph.doFinal(data);

    data = Base64.getEncoder().encode(data);

    int len = data.length;
    while(data[len-1] == '=') len--;

    String encr = new String(data,0,len);
    encr = encr.replaceAll("/","@");

    return("*"+encr);
  }


  static byte[] decrypt(String secret, String data) throws Exception
  {
    byte[]    salt = secret.getBytes("UTF-8");
    Cipher    ciph = Cipher.getInstance("AES");
    SecretKey skey = new SecretKeySpec(salt,"AES");

    data = data.substring(1);
    ciph.init(Cipher.DECRYPT_MODE,skey);

    data = data.replaceAll("@","/");
    while(data.length() % 4 != 0) data += "=";
    byte[] bytes = Base64.getDecoder().decode(data);

    bytes = ciph.doFinal(bytes);
    return(bytes);
  }


  private String error(Throwable err, Request request)
  {
    String message = err.getMessage();

    if (message == null)
      message = "An unexpected error has occured";

    return(error(err,message,request));
  }


  private String error(Throwable err, String message, Request request)
  {
    String path = null;
    boolean lock = false;
    boolean nowait = false;

    JSONFormatter json = new JSONFormatter();
    logger.log(Level.WARNING,err.getMessage(),err);

    if (request != null)
    {
      path = request.path;

      if (request.payload.has("lock"))
        lock = request.payload.getBoolean("lock");

      if (request.payload.has("nowait"))
        nowait = request.payload.getBoolean("nowait");
    }

    json.set(err);
    json.success(false);
    json.fatal(message);
    json.add("instance",instance);
    if (lock) json.add("lock",true);
    if (nowait) json.add("nowait",true);
    if (path != null) json.add("path",request.path);

    return(json.toString());
  }


  private String error(String message)
  {
    JSONFormatter json = new JSONFormatter();

    json.success(false);
    json.add("message",message);
    json.add("instance",instance);

    return(json.toString());
  }


  private String ncerror()
  {
    JSONFormatter json = new JSONFormatter();
    Date[] hist = SessionManager.trace(request.sesid);

    json.success(false);
    json.add("message","Not connected");

    json.add("path",request.path);
    json.add("sesid",request.sesid);

    json.add("connected",hist[0]);
    json.add("disconnected",hist[1]);

    json.add("instance",instance);

    return(json.toString());
  }


  public static class SessionState
  {
    Rest rest;
    int dept = 0;
    int shared = 0;
    Session session = null;
    boolean exclusive = false;
    Savepoint savepoint = null;
    StatelessSession stateless = null;


    SessionState(Rest rest)
    {
      this.rest = rest;
    }


    public Session session()
    {
      return(this.session);
    }


    void session(Session session)
    {
      this.session = session;
    }


    StatelessSession stateless()
    {
      return(this.stateless);
    }


    void stateless(StatelessSession info)
    {
      this.stateless = info;
    }


    void ensure() throws Exception
    {
      session.ensure();
    }


    void setSavePoint() throws Exception
    {
      if (session == null) return;
      this.savepoint = session.setSavePoint();
    }


    void prepare(boolean lock, boolean savepoint) throws Exception
    {
      dept++;
      if (lock) lock(true);
      if (savepoint) this.savepoint = session.setSavePoint();
    }


    void prepare(JSONObject payload) throws Exception
    {
      if (dept == 0)
      {
        boolean savepoint = rest.getSavepoint(payload);

        if (savepoint && !session.autocommit())
        {
          lock(true);
          this.savepoint = session.setSavePoint();
        }
      }

      dept++;
    }


    public PreparedStatement prepare(String sql) throws Exception
    {
      return(session.prepare(sql,null));
    }


    void release() throws Exception
    {
      if (session == null)
        return;

      if (--dept > 0)
        return;

      if (savepoint != null)
      {
        if (!session.releaseSavePoint(savepoint))
        {
          unlock(true);
          throw new Exception("Could not release savepoint");
        }

        unlock(true);
        savepoint = null;
      }

      session.release(false);
    }


    void release(Scope scope, boolean autocommit) throws Exception
    {
      if (session == null)
        return;

      if (--dept > 0)
        return;

      if (savepoint != null)
      {
        if (!session.releaseSavePoint(savepoint))
        {
          unlock(true);
          this.session().scope(scope);
          this.session().autocommit(autocommit);
          throw new Exception("Could not release savepoint");
        }

        unlock(true);
        savepoint = null;
      }

      this.session().scope(scope);
      this.session().autocommit(autocommit);

      session.release(false);
    }


    String release(Throwable err, Request request)
    {
      dept--;
      String fatal = null;

      if (session != null)
      {
        session.releaseSavePoint(savepoint,true);

        releaseAll();

        savepoint = null;
        fatal = session.release(true);
        rest.server.poolmanager().validate();
      }

      return(rest.error(err,fatal,request));
    }


    void lock()
    {
      lock(false);
    }


    private void lock(boolean exclusive)
    {
      try
      {
        session.lock().lock(exclusive);
        if (!exclusive) shared++;
        else this.exclusive = true;
      }
      catch (Throwable e)
      {
        rest.error(e,null);
      }
    }


    void unlock()
    {
      unlock(false);
    }


    private void unlock(boolean exclusive)
    {
      try
      {
        if (!exclusive && shared < 1)
          throw new Throwable("Cannot release shared lock not obtained");

        session.lock().release(exclusive);

        if (!exclusive) shared--;
        else this.exclusive = false;
      }
      catch (Throwable e)
      {
        rest.error(e,null);
      }
    }


    private void releaseAll()
    {
      try
      {
        if (exclusive || shared > 0)
          session.lock().release(exclusive,shared);

        shared = 0;
        exclusive = false;
      }
      catch (Throwable e)
      {
        rest.error(e,null);
      }
    }
  }


  private static class StatelessSession
  {
    private long time;
    private String user;
    private boolean priv;
    private boolean proxy;

    StatelessSession(long time, String user, boolean priv, boolean proxy)
    {
      this.time = time;
      this.user = user;
      this.priv = priv;
      this.proxy = proxy;
    }

    public String toString()
    {
      return("age: "+(System.currentTimeMillis()-time)/1000+" user: "+user+" priv: "+priv+" proxy: "+proxy);
    }
  }
}