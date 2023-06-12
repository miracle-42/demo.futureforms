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

package test;

import java.net.URL;
import javax.net.ssl.TrustManager;
import database.rest.security.FakeTrustManager;


public class TestThread extends Thread
{
  private long avg;
  private int failed;
  private long elapsed;
  private final int ips;
  private final int loops;
  private final String url;
  private final String payload;
  private static final int cores = Runtime.getRuntime().availableProcessors();
  private static final TrustManager[] tmgrs = new TrustManager[] {new FakeTrustManager()};


  public static void start(String url, int ips, int threads, int loops, String payload) throws Exception
  {
    TestThread tests[] = new TestThread[threads];
    for (int i = 0; i < tests.length; i++) tests[i] = new TestThread(loops,ips,url,payload);

    System.out.println();
    System.out.println("Testing, threads: "+threads+" loops: "+loops+" "+url+" no delay, reconnect after "+ips+" hits");
    System.out.println();

    long avg = 0;
    int failed = 0;
    long time = System.currentTimeMillis();

    for (int i = 0; i < tests.length; i++) tests[i].start();
    for (int i = 0; i < tests.length; i++) tests[i].join();

    for (int i = 0; i < tests.length; i++) {avg += tests[i].avg; failed += tests[i].failed;}

    time = System.currentTimeMillis() - time;
    System.out.println(loops*threads+" pages served in "+time/1000+" secs, failed "+failed+", "+(loops*threads*1000)/time+" pages/sec, response time "+avg/(loops*threads*1000000.0)+" ms");
  }


  private TestThread(int loops, int ips, String url, String payload)
  {
    this.url = url;
    this.ips = ips;
    this.loops = loops;
    this.payload = payload;
  }


  public void run()
  {
    long time = System.currentTimeMillis();

    try
    {
      URL url = new URL(this.url);

      String path = url.getPath();
      boolean ssl = this.url.startsWith("https");
      Session session = new Session(url.getHost(),url.getPort(),ssl);;

      for (int i = 0; i < loops; i++)
      {
        long req = System.nanoTime();

        try
        {
          if (i > 0 && i % ips == 0)
          {
            session.close();
            session = new Session(url.getHost(),url.getPort(),ssl);
          }

          session.invoke(path,payload);
        }
        catch (Exception e)
        {
          failed++;
          session.close();
          e.printStackTrace();
          System.out.println(e.getMessage());
          session = new Session(url.getHost(),url.getPort(),ssl);
        }

        avg += System.nanoTime()-req;
      }
    }
    catch (Exception e)
    {
      e.printStackTrace();
    }

    this.elapsed = System.currentTimeMillis() - time;
  }
}