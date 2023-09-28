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

import java.io.File;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import database.rest.security.Keystore;


public class Security
{
  private final String secret;
  private final Keystore trust;
  private final Keystore identity;

  private final boolean tokens;
  private final boolean database;
  private final ArrayList<CustomAuthenticator> authenticators;


  Security(JSONObject config) throws Exception
  {
    String type = null;
    String file = null;
    String passwd = null;

    JSONObject identsec = Config.getSection(config,"identity");

    type = Config.get(identsec,"type");
    file = Config.get(identsec,"keystore");
    passwd = Config.get(identsec,"password");
    String alias = Config.get(identsec,"alias");

    if (file.startsWith("."+File.separator) || file.startsWith("./"))
      file = Paths.apphome + File.separator + file;

    identity = new Keystore(file,type,alias,passwd);

    JSONObject trustsec = Config.getSection(config,"trust");

    type = Config.get(trustsec,"type");
    file = Config.get(trustsec,"keystore");
    passwd = Config.get(trustsec,"password");

    if (file.startsWith("."+File.separator) || file.startsWith("./"))
      file = Paths.apphome + File.separator + file;

    trust = new Keystore(file,type,null,passwd);
    authenticators = new ArrayList<CustomAuthenticator>();

    if (Config.has(config,"authenticators"))
    {
      JSONObject auth = Config.getSection(config,"authenticators");

      this.database = Config.get(auth,"database",true);
      this.tokens = Config.get(auth,"pool-tokens",false);

      JSONArray custom = Config.getArray(auth,"custom");

      for (int i = 0; i < custom.length(); i++)
      {
        JSONObject method = custom.getJSONObject(i);

        String name = Config.get(method,"name");
        String clazz = Config.get(method,"class");
        boolean enabled = Config.get(method,"enabled");

        if (name != null) name = name.toLowerCase();
        authenticators.add(new CustomAuthenticator(name,clazz,enabled));
      }
    }
    else
    {
      this.tokens = false;
      this.database = true;
    }

    this.secret = Config.get(config,"shared_secret");
  }


  public String secret()
  {
    return(secret);
  }

  public Keystore getTrusted()
  {
    return(trust);
  }

  public Keystore getIdentity()
  {
    return(identity);
  }

  public boolean tokens()
  {
    return(tokens);
  }

  public boolean database()
  {
    return(database);
  }

  public ArrayList<CustomAuthenticator> authenticators()
  {
    return(authenticators);
  }

  public CustomAuthenticator authenticator(String meth)
  {
    for (CustomAuthenticator auth : authenticators)
    {
      if (auth.meth.equals(meth))
        return(auth);
    }

    return(null);
  }


  public class CustomAuthenticator
  {
    public final String meth;
    public final String clazz;
    public final boolean enabled;

    CustomAuthenticator(String name, String clazz, boolean enabled)
    {
      this.meth = name;
      this.clazz = clazz;
      this.enabled = enabled;
    }

    public String toString()
    {
      return("Authenticator: "+meth+" Implementation: "+clazz+" enabled: "+enabled);
    }
  }
}
