package test;


import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Properties;

import oracle.jdbc.OracleConnection;
import oracle.jdbc.pool.OracleDataSource;

class Proxy
{
   final static String DB_URL= "jdbc:oracle:thin:@(DESCRIPTION=(ADDRESS=(HOST=localhost)(PORT=1521)(PROTOCOL=tcp))(CONNECT_DATA=(SERVICE_NAME=xepdb1)))";

 /*
  * The code sample shows how to connect to an Oracle Database
  * using Proxy Session.  The sample has the following:
  * (a) A shared table, PROXY_ACCOUNT owned by user PROXY.
  * (b) Users JEFF and SMITH have necessary roles for performing a SELECT,
  * INSERT and DELETE on table PROXY_ACCOUNT owned by PROXY user,
  * through the roles select_role, insert_role and delete_role.
  * Note that select_role has SELECT, insert_role has INSERT and delete_role
  * has DELETE privileges granted.
  *
  * The control flow in the sample is as follows:
  * (1) Obtain a database connection of user PROXY.
  * (2) Provide required privileges to users JEFF and SMITH to connect to the
  *  database through user PROXY.
  * (3) Open a proxy session for users JEFF and SMITH. This does not open a
  * new connection to the database instead uses the pre-existing connection
  *(as user PROXY).  The proxy session is established with the roles specified
  * while opening the connection.
  */
  public static void main(String args[]) throws SQLException
  {
    OracleDataSource ods = new OracleDataSource();

    // retrieve a database connection of user "proxy"
    OracleConnection proxyConn = getConnection("hrproxy", "hrproxy", DB_URL, ods);

    // isProxySession is false before opening a proxy session
    System.out.println("Before a proxy session is open, isProxySession: "
        + proxyConn.isProxySession());
    // check if the user is "proxy"
    checkUser(proxyConn);

    // open a proxy session for the user "jeff".
    // This session reuses existing proxy session to connect as user, "jeff".
    // There is no need to authenticate the user "jeff".
    demoProxySession(proxyConn, "hruser");


    // Close the proxy connection
    proxyConn.close();
  }
 /*
  * Demonstrates the following:
  * (1) Start a Proxy Session: Starts the proxy Session with corresponding
  * roles and authenticates the users "jeff" or "smith".
  * (2) Access Proxy user's table: The users "jeff" or "smith" can access
  * the "proxy" user table, 'proxy_account' through the proxy session.
  * (3) Close the Proxy Session: Close the proxy session for the user "jeff"
  * or "smith".
  */
   private static void demoProxySession(OracleConnection conn, String proxyUser) throws SQLException
   {

      Properties prop = new Properties();
      prop.put(OracleConnection.PROXY_USER_NAME, proxyUser);

      conn.openProxySession(OracleConnection.PROXYTYPE_USER_NAME, prop);

      System.out.println("======= demoProxySession BEGIN =======");
      System.out.println("After the proxy session is open, isProxySession: " + conn.isProxySession());

      try (Statement stmt = conn.createStatement()) {
      // Check who is the database user
      checkUser(conn);


      // play select_role from proxy.proxy_account, go through
      try (ResultSet rset = stmt.executeQuery("select * from hr.countries")) {
      while (rset.next())  {
         // display the execution results of a select query.
         System.out.println(rset.getString(1));
      }
      System.out.println("select * from proxy.proxy_account, allowed");
      // play delete_role from proxy.proxy_account, SQLException
      stmt.execute("delete from proxy.proxy_account where purchase=1");
      } catch(Exception e) {
         System.out.println("delete from proxy.proxy_account, not allowed");
      }
      System.out.println("======= demoProxySession END =======");
      // Close the proxy session of user "jeff"
      conn.close(OracleConnection.PROXY_SESSION);
   }
   }
 /*
  * Gets a database connection using a proxy user.
  */
  private static OracleConnection getConnection(String user, String password,
      String url, OracleDataSource ods) throws SQLException {
    ods.setUser(user);
    ods.setPassword(password);
    ods.setURL(url);
    return ((OracleConnection) ods.getConnection());
  }
 /*
  * Checks the database user. Note that the user will be proxy.
  */
  private static void checkUser(Connection conn) throws SQLException {
    try (Statement stmt = conn.createStatement()) {
      try (ResultSet rset = stmt.executeQuery("select user from dual")) {
        while (rset.next()) {
          System.out.println("User is: " + rset.getString(1));
        }
      }
    }
  }
}