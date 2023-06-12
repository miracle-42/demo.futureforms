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

package database.rest.pools;

import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;


public class ThreadPool
{
  private final int threads;
  private static ExecutorService workers = null;

  private static int queue = 0;
  private static final Object LOCK = new Object();


  public ThreadPool(int threads)
  {
    init(threads);
    this.threads = threads;
  }


  public int threads()
  {
    return(threads);
  }


  public void done()
  {
    synchronized(LOCK)
     {queue--;}
  }


  public boolean full()
  {
    return(queue > threads);
  }


  public int size()
  {
    synchronized(LOCK)
    {return(queue);}
  }


  private synchronized void init(int threads)
  {
    if (workers == null)
      workers = Executors.newFixedThreadPool(threads);
  }


  public static void shutdown()
  {
    if (workers != null)
      workers.shutdownNow();
  }


  public void submit(Runnable task)
  {
    synchronized(LOCK)
      {queue++;}

    workers.submit(task);
  }
}