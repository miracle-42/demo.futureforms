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

package database.rest.cluster;


public class PreAuthRecord
{
  public final long time;
  public final String guid;
  public final String username;
  public final static int reclen = 16 + Long.BYTES + 1;


  public PreAuthRecord(String guid, String username)
  {
    this.guid = guid;
    this.username = username;
    this.time = System.currentTimeMillis();
  }

  public PreAuthRecord(byte[] guid, long time, byte[] username)
  {
    this.time = time;
    this.guid = new String(guid);
    this.username = new String(username);
  }

  public int size()
  {
    return(reclen + username.length());
  }

  @Override
  public String toString()
  {
    return(guid+" "+username);
  }
}