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

import java.sql.Savepoint;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Properties;
import java.sql.PreparedStatement;
import database.rest.database.Database;
import database.rest.database.BindValue;
import oracle.jdbc.OraclePreparedStatement;
import oracle.jdbc.driver.OracleConnection;


public class Oracle extends Database
{
  @Override
  public void setProxyUser(String username) throws Exception
  {
    Properties props = new Properties();
    props.put(OracleConnection.PROXY_USER_NAME, username);

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
  public ReturnValueHandle prepareWithReturnValues(String sql, ArrayList<BindValue> bindvalues, String dateform) throws Exception
  {
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

    ReturnValueHandle handle = new ReturnValueHandle(stmt,columns.toArray(new String[0]));
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
}