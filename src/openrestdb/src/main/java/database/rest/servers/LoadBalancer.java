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

package database.rest.servers;

import database.rest.config.Config;
import database.rest.servers.rest.RESTClient;


class LoadBalancer
{
  private int last = -1;
  private final int htsrvs;
  private final int servers;
  private final RESTClient[] workers;


  LoadBalancer(Config config) throws Exception
  {
    this.servers = config.getTopology().servers;

    short htsrvs = 1;
    if (config.getTopology().hot) htsrvs++;

    this.htsrvs = htsrvs;
    this.workers = new RESTClient[servers];
  }


  public RESTClient worker(short id)
  {
    if (id - this.htsrvs < 0)
      return(null);

    if (id - this.htsrvs >= workers.length)
      return(null);

    return(workers[id-this.htsrvs]);
  }


  public RESTClient worker() throws Exception
  {
    int tries = 0;
    int next = next();

    while(++tries < 32)
    {
      for (int i = 0; i < workers.length; i++)
      {
        if (workers[next] != null && workers[next].up())
          return(workers[next]);

        next = ++next % workers.length;
      }

      Thread.sleep(250);
    }

    throw new Exception("No available RESTEngines, bailing out");
  }


  public void register(RESTClient client)
  {
    workers[client.id()-this.htsrvs] = client;
  }


  public void deregister(RESTClient client)
  {
    workers[client.id()-this.htsrvs] = null;
  }


  private synchronized int next()
  {
    last = (++last) % workers.length;
    return(last);
  }
}