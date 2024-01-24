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

package database.rest.database.impl;

import java.util.HashMap;
import java.sql.Savepoint;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Properties;
import oracle.jdbc.OracleTypes;
import java.sql.PreparedStatement;
import database.rest.database.Database;
import database.rest.database.BindValue;
import database.rest.database.BindValueDef;
import oracle.jdbc.OraclePreparedStatement;
import oracle.jdbc.driver.OracleConnection;


public class Oracle extends Database
{
  @Override
  public void setProxyUser(String username) throws Exception
  {
    Properties props = new Properties();
    props.put(OracleConnection.PROXY_USER_NAME,username);

    OracleConnection conn = (OracleConnection) super.connection();
    conn.openProxySession(OracleConnection.PROXYTYPE_USER_NAME,props);
  }


  @Override
  public void releaseProxyUser() throws Exception
  {
    OracleConnection conn = (OracleConnection) super.connection();
    conn.close(OracleConnection.PROXY_SESSION);
  }


  @Override
  public void releaseSavePoint(Savepoint savepoint, boolean rollback) throws Exception
  {
    // Oracle only supports rollback. Savepoints are released when commit/rollback
    if (rollback) super.releaseSavePoint(savepoint,rollback);
  }


  @Override
  public ReturnValueHandle prepareWithReturnValues(String sql, ArrayList<BindValue> bindvalues, HashMap<String,BindValueDef> alltypes, String dateform) throws Exception
  {
    String keyword = " returning ";
    int pos = sql.lastIndexOf(keyword);
    String clause = sql.substring(pos+keyword.length());

    String[] retcols = clause.split(",");

    for (int i = 0; i < retcols.length; i++)
      retcols[i] = retcols[i].trim().toLowerCase();

    sql += " into ";

    for (int i = 0; i < retcols.length; i++)
      sql += "?,";

    sql = sql.substring(0,sql.length()-1);

    ArrayList<String> columns = new ArrayList<String>();
    OracleConnection conn = (OracleConnection) super.connection();
    OraclePreparedStatement stmt = (OraclePreparedStatement) conn.prepareStatement(sql);

    for (int i = 0; i < bindvalues.size(); i++)
    {
      BindValue b = bindvalues.get(i);

      if (b.InOut())
      {
        columns.add(b.getName());
        stmt.registerReturnParameter(i+1,b.getType());
        if (!b.OutOnly()) stmt.setObject(i+1,b.getValue());
      }
      else
      {
        stmt.setObject(i+1,b.getValue(),b.getType());
      }
    }

    for (int i = 0; i < retcols.length; i++)
    {
      int ix = bindvalues.size() + i;
      int type = OracleTypes.VARCHAR;

      BindValueDef b = alltypes.get(retcols[i]);
      if (b != null) type = b.type;

      stmt.registerReturnParameter(ix+1,type);
    }

    ReturnValueHandle handle = new ReturnValueHandle(stmt,retcols);
    return(handle);
  }


  @Override
  public ResultSet executeUpdateWithReturnValues(PreparedStatement jstmt, String dateform) throws Exception
  {
    OraclePreparedStatement stmt = (OraclePreparedStatement) jstmt;
    stmt.executeUpdate();
    ResultSet rset = stmt.getReturnResultSet();
    return(rset);
  }


  public boolean validate(OracleConnection conn)
  {
    try
    {
      String sql = getTestSQL();

      PreparedStatement stmt =
        conn.prepareStatement(sql);

      ResultSet rset =
        stmt.executeQuery();

      rset.next();
      rset.close();
      stmt.close();

      return(true);
    }
    catch (Exception e)
    {
      return(false);
    }
  }
}