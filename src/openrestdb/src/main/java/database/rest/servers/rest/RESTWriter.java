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
import java.io.OutputStream;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.io.ByteArrayOutputStream;


class RESTWriter extends Thread
{
  private final RESTConnection conn;

  private ArrayList<RESTComm> outgoing =
    new ArrayList<RESTComm>();


  RESTWriter(RESTConnection conn) throws Exception
  {
    this.conn = conn;
    this.setDaemon(true);
    this.setName("RESTWriter");
  }


  void write(RESTComm call)
  {
    synchronized (this)
    {
      outgoing.add(call);
      this.notify();
    }
  }


  @Override
  public void run()
  {
    Logger logger = conn.logger();
    ArrayList<RESTComm> outgoing = null;

    try
    {
      OutputStream writer = conn.writer();

      while(true)
      {
        synchronized(this)
        {
          while(this.outgoing.size() == 0)
            this.wait();

          outgoing = this.outgoing;
          this.outgoing = new ArrayList<RESTComm>();
        }

        ByteArrayOutputStream buffer = new ByteArrayOutputStream(4192);

        for(RESTComm entry : outgoing)
          buffer.write(entry.bytes());

        byte[] data = buffer.toByteArray();

        logger.finest(conn.parent()+" sending "+data.length+" bytes");

        writer.write(data);
        writer.flush();
      }
    }
    catch (Exception e)
    {
      logger.log(Level.SEVERE,e.getMessage(),e);
      this.conn.failed();
    }
  }
}