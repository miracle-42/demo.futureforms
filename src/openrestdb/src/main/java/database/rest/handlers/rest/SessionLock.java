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

package database.rest.handlers.rest;


public class SessionLock
{
  private int shared = 0;
  private long thread = 0;
  private boolean exclusive = false;
  private final Object LOCK = new Object();


  public SessionLock()
  {
  }


  public void lock(boolean exclusive) throws Exception
  {
    long thread = Thread.currentThread().getId();

    synchronized(LOCK)
    {
      boolean owner = this.thread == thread;

      while(!owner && this.exclusive)
        LOCK.wait();

      if (exclusive)
      {
        while(!owner && this.shared > 0)
          LOCK.wait();

        this.thread = thread;
        this.exclusive = true;
      }
      else
      {
        while(!owner && this.exclusive)
          LOCK.wait();

        this.shared++;
      }
    }
  }


  public void release(boolean exclusive) throws Exception
  {
    int shared = 0;
    if (!exclusive) shared = 1;
    this.release(exclusive,shared);
  }


  public void release(boolean exclusive, int shared) throws Exception
  {
    long thread = Thread.currentThread().getId();

    synchronized(LOCK)
    {
      if (exclusive && this.thread != thread)
        throw new Exception("Thread "+thread+" cannot release session lock owned by "+this.thread);

      if (exclusive && !this.exclusive)
        throw new Exception("Cannot release exclusive lock, when only shared obtained");

      if (this.shared < shared)
        throw new Exception("Cannot release "+shared+" shared lock(s) not obtained");

      if (exclusive)
      {
        this.thread = 0;
        this.exclusive = false;
      }

      this.shared -= shared;
      LOCK.notifyAll();
    }
  }


  public String toString()
  {
    if (!exclusive && shared == 0)
      return("locks[]");

    return("locks["+exclusive+","+shared+"]");
  }
}