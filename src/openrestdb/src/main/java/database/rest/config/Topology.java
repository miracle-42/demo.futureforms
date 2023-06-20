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

import org.json.JSONObject;


public class Topology
{
  public final boolean hot;
  public final short workers;
  public final short waiters;
  public final short servers;

  public final int heartbeat;

  public final int extnds;
  public final int extsize;

  public static final int cores = Runtime.getRuntime().availableProcessors();


  @SuppressWarnings("cast")
  Topology(JSONObject config) throws Exception
  {
    this.servers = Config.get(config,"servers",0).shortValue();

    short waiters = Config.get(config,"waiters",0).shortValue();
    short workers = Config.get(config,"workers",0).shortValue();

    short multi = servers > 0 ? servers : 1;

    if (waiters == 0)
    {
      waiters = (short) cores;
      if (waiters < 4) waiters = (short) 4;
    }

    this.waiters = waiters;

    if (workers > 0) this.workers = workers;
    else             this.workers = (short) (multi * 8 * cores);

    this.hot = Config.get(config,"hot-standby");

    JSONObject ipc = config.getJSONObject("ipc");

    this.extnds = this.workers * 2;

    String extsz = Config.get(ipc,"extsize").toString();
    extsz = extsz.replaceAll(" ","").trim().toUpperCase();

    int mfac = 1;

    if (extsz.endsWith("K"))
    {
      mfac = 1024;
      extsz = extsz.substring(0,extsz.length()-1);
    }
    else if (extsz.endsWith("M"))
    {
      mfac = 1024 * 1024;
      extsz = extsz.substring(0,extsz.length()-1);
    }

    this.extsize = Integer.parseInt(extsz) * mfac;

    this.heartbeat = Config.get(ipc,"heartbeat");
  }
}