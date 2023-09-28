package database.rest.custom;

import org.json.JSONObject;

public abstract class Authenticator
{
   public abstract String user();
   public abstract boolean authenticate(JSONObject payload) throws Exception;
}
