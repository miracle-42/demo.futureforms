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

package database.rest.config;

import java.util.ArrayList;
import org.json.JSONObject;
import database.rest.database.Pool;
import java.lang.reflect.Constructor;

import database.rest.custom.SQLRewriter;
import database.rest.custom.SQLValidator;
import database.rest.custom.PreProcessor;
import database.rest.custom.PostProcessor;
import database.rest.database.DatabaseUtils;
import database.rest.database.NameValuePair;


public class Database
{
  public final String url;
  public final String test;

  public final String repository;

  public final boolean compact;
  public final String dateformat;

  public final SQLRewriter rewriter;
  public final SQLValidator validator;

  public final PreProcessor preprocessor;
  public final PostProcessor postprocessor;

  public final Pool proxy;
  public final Pool fixed;

  public final boolean nowait;
  public final DatabaseType type;
  public final ArrayList<String> urlparts;

  private final NameValuePair<Boolean>[] savepoints;


  @SuppressWarnings("unchecked")
  Database(JSONObject config, boolean full) throws Exception
  {
    JSONObject section = Config.getSection(config,"database");
    //********************* General Section *********************

    String type = Config.get(section,"type");

    type = Character.toUpperCase(type.charAt(0))
           + type.substring(1).toLowerCase();

    if (!Config.has(section,"nowait")) nowait = true;
    else nowait = Config.get(section,"nowait");

    this.url = Config.get(section,"jdbc");
    this.test = Config.get(section,"test");

    this.type = DatabaseType.valueOf(type);
    this.urlparts = DatabaseUtils.parse(url);

    DatabaseUtils.setType(this.type);
    DatabaseUtils.setUrlParts(urlparts);

    section = Config.getSection(config,"resultset");
    //*********************  Data Section   *********************

    this.compact = Config.get(section,"compact");
    this.dateformat = Config.get(section,"dateformat",null);


    section = Config.getSection(config,"repository");
    //*********************  Repos Section  *********************

    String repo = Config.get(section,"path");
    this.repository = Config.getPath(repo,Paths.apphome);


    section = Config.getSection(config,"savepoints");
    //******************* Savepoint Section  *******************

    this.savepoints = new NameValuePair[3];
    this.savepoints[0] = new NameValuePair<Boolean>("post",Config.get(section,"post"));
    this.savepoints[1] = new NameValuePair<Boolean>("patch",Config.get(section,"patch"));
    this.savepoints[2] = new NameValuePair<Boolean>("delete",Config.get(section,"delete"));


    section = Config.getSection(config,"interceptors");
    //****************** Interceptors Section ******************

    String rewclass = Config.get(section,"rewrite.class",null);
    String valclass = Config.get(section,"validator.class",null);

    String preclass = Config.get(section,"preprocessor.class",null);
    String pstclass = Config.get(section,"posprocessor.class",null);

    if (rewclass == null || !full) this.rewriter = null;
    else
    {
      Constructor<?> contructor = Class.forName(rewclass).getDeclaredConstructor();
      this.rewriter = (SQLRewriter) contructor.newInstance();
    }

    if (valclass == null || !full) this.validator = null;
    else
    {
      Constructor<?> contructor = Class.forName(valclass).getDeclaredConstructor();
      this.validator = (SQLValidator) contructor.newInstance();
    }

    if (preclass == null || !full) this.preprocessor = null;
    else
    {
      Constructor<?> contructor = Class.forName(rewclass).getDeclaredConstructor();
      this.preprocessor = (PreProcessor) contructor.newInstance();
    }

    if (pstclass == null || !full) this.postprocessor = null;
    else
    {
      Constructor<?> contructor = Class.forName(rewclass).getDeclaredConstructor();
      this.postprocessor = (PostProcessor) contructor.newInstance();
    }

    section = Config.getSection(config,"pools");
    //*********************  Pool Section  *********************

    this.proxy = getPool("proxy",section,true);
    this.fixed = getPool("fixed",section,false);
  }


  private Pool getPool(String type, JSONObject config, boolean proxy) throws Exception
  {
    if (!config.has(type)) return(null);
    JSONObject pconf = Config.getSection(config,type);

    type = Character.toUpperCase(type.charAt(0))
           + type.substring(1).toLowerCase();

    int min = Config.get(pconf,"min");
    int max = Config.get(pconf,"max");
    int idle = Config.get(pconf,"idle");
    int busy = Config.get(pconf,"busy");

    String usr = Config.get(pconf,"username");
    String pwd = Config.get(pconf,"password");
    String secret = Config.get(pconf,"auth.secret");

    return(new Pool(proxy,secret,usr,pwd,min,max,idle,busy));
  }


  public boolean savepoint(String type)
  {
    for(NameValuePair<Boolean> sp : this.savepoints)
    {
      if (sp.getName().equals(type))
        return(sp.getValue());
    }
    return(false);
  }
}