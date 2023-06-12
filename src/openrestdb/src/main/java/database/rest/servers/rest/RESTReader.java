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

package database.rest.servers.rest;

import java.util.ArrayList;
import java.util.logging.Level;
import java.util.logging.Logger;


class RESTReader extends Thread
{
  private final RESTConnection conn;


  RESTReader(RESTConnection conn) throws Exception
  {
    this.conn = conn;
    this.setDaemon(true);
    this.setName("RESTReader");
  }


  @Override
  public void run()
  {
    int hsize = RESTComm.HEADER;
    Logger logger = conn.logger();

    try
    {
      SocketReader reader = new SocketReader(conn.reader());
      ArrayList<RESTComm> incoming = new ArrayList<RESTComm>();

      while(true)
      {
        byte[] head = reader.read(hsize);
        RESTComm http = new RESTComm(head);

        if (http.hsize() > 0)
        {
          int hz = http.hsize();
          http.setHost(reader.read(hz));
        }

        logger.finest(conn.parent()+" received data");

        int need = http.need();
        if (need > 0) http.add(reader.read(need));

        incoming.add(http);

        if (reader.empty())
        {
          conn.received(incoming);
          incoming = new ArrayList<RESTComm>();
        }
      }
    }
    catch (Exception e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);
      this.conn.failed();
    }
  }
}