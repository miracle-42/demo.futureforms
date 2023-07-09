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

import java.io.File;
import java.util.Set;
import java.util.HashSet;
import java.nio.file.Path;
import java.nio.file.Files;
import java.util.ArrayList;
import java.nio.file.FileSystem;
import java.util.logging.Logger;
import java.nio.MappedByteBuffer;
import java.nio.file.FileSystems;
import database.rest.config.Paths;
import database.rest.config.Config;
import java.nio.channels.FileChannel;
import static java.nio.file.StandardOpenOption.*;
import java.nio.file.attribute.PosixFilePermission;


/**
 *
 * A record consists of user.length (1 byte) + guid (16 bytes) + created (long) + user.
 * Records are written to extends, which is recycled when the file is full
 * Each extend has a header that consists of the number of records (1 byte)
 * The file has has a header that consists of 1 byte that indicates the current extend.
 * To align with extend size, the first extend starts at byte 1 and size EXTENDSIZE - 1 bytes.
 *
 * OBS:
 * Extends are limited to max 255 and cannot hold more than 255 records. With a min of 25 bytes
 * per record, extends should be max 4K. Also usernames cannot exceed 255 bytes.
 *
 */
public class PreAuthTable
{
  private final int extend;
  private final int offset;
  private final int entries;
  private final MappedByteBuffer shmmem;

  public static final int EXTENDS = 128;
  public static final int EXTENDSIZE = 2048;
  private final Logger logger = Logger.getLogger("rest");


  public PreAuthTable(Config config) throws Exception
  {
    FileSystem fs = FileSystems.getDefault();
    String filename = Paths.ipcdir + File.separator + "auth.tab";

    Path path = fs.getPath(filename);
    FileChannel fc = FileChannel.open(path,CREATE,READ,WRITE);

    if (!System.getProperty("os.name").startsWith("Windows"))
    {
      try
      {
        Set<PosixFilePermission> perms = new HashSet<>();
        perms.add(PosixFilePermission.OWNER_READ);
        perms.add(PosixFilePermission.OWNER_WRITE);
        Files.setPosixFilePermissions(path,perms);
      }
      catch (Exception e)
      {
        logger.warning("Unable to set file permissions for PreAuthTable");
      }
    }

    this.shmmem = fc.map(FileChannel.MapMode.READ_WRITE,0,EXTENDS*EXTENDSIZE);

    this.extend = current();

    entries = entries(extend);
    int offset = align(extend);

    for (int i = 0; i < entries; i++)
      offset = next(extend,offset);

    this.offset = offset;
  }


  int next(int extend)
  {
    return(next(extend,false));
  }


  int next(int extend, boolean set)
  {
    extend = ++extend % EXTENDS;
    if (set) current(extend);
    return(extend);
  }


  int current()
  {
    byte c = shmmem.get(0);
    return(c >= 0 ? c : 256 + c);
  }


  void current(int extend)
  {
    shmmem.put(0,(byte) extend);
  }


  int align(int extend)
  {
    if (extend != 0) return(1);
    else             return(2);
  }


  int entries(int extend)
  {
    int pos = align(extend) - 1;
    byte e = shmmem.get(extend*EXTENDSIZE+pos);
    return(e >= 0 ? e : 256 + e);
  }


  void entries(int extend, int entries)
  {
    int pos = align(extend) - 1;
    shmmem.put(extend*EXTENDSIZE+pos,(byte) entries);
  }


  int next(int extend, int offset)
  {
    byte len = shmmem.get(extend*EXTENDSIZE+offset);
    return(offset + PreAuthRecord.reclen + (len >= 0 ? len : 256 + len));
  }


  boolean fits(int offset, PreAuthRecord entry)
  {
    return(offset + entry.size() < EXTENDSIZE);
  }


  int put(PreAuthRecord entry, int extend, int entries, int offset)
  {
    long time = entry.time;
    byte[] guid = entry.guid.getBytes();
    byte[] user = entry.username.getBytes();

    byte len = (byte) user.length;
    int pos = offset + extend*EXTENDSIZE;

    shmmem.put(pos,len);
    shmmem.put(pos+1,guid);
    shmmem.putLong(pos+1+16,time);
    shmmem.put(pos+PreAuthRecord.reclen,user);

    entries(extend,entries);
    return(offset+PreAuthRecord.reclen+len);
  }


  PreAuthRecord get(int extend, int offset)
  {
    int pos = offset + extend*EXTENDSIZE;

    int len = shmmem.get(pos);
    if (len < 0) len = 256 + len;

    byte[] guid = new byte[16];
    byte[] user = new byte[len];

    shmmem.get(pos+1,guid);
    long time = shmmem.getLong(pos+1+16);
    shmmem.get(pos+PreAuthRecord.reclen,user);

    return(new PreAuthRecord(guid,time,user));
  }


  public Reader getReader()
  {
    return(new Reader(this));
  }


  public Writer getWriter()
  {
    return(new Writer(this));
  }


  public static class Reader
  {
    private int extend = 0;
    private int offset = 0;
    private int entries = 0;
    private final PreAuthTable table;


    private Reader(PreAuthTable table)
    {
      this.table = table;
      this.extend = table.extend;
      this.offset = table.offset;
      this.entries = table.entries;
    }


    public ArrayList<PreAuthRecord> refresh()
    {
      ArrayList<PreAuthRecord> recs = new ArrayList<PreAuthRecord>();

      int records = entries;
      int current = table.current();
      entries = table.entries(extend);

      while(current != extend || records < entries)
      {
        if (records == entries && extend != current)
        {
          records = 0;
          extend = table.next(extend);
          offset = table.align(extend);
          entries = table.entries(extend);
        }

        PreAuthRecord record = table.get(extend,offset);

        records++;
        recs.add(record);
        offset += record.size();
      }

      return(recs);
    }
  }


  public static class Writer
  {
    private int extend = 0;
    private int offset = 0;
    private int entries = 0;
    private final PreAuthTable table;


    private Writer(PreAuthTable table)
    {
      this.table = table;
      this.extend = table.extend;
      this.offset = table.offset;
      this.entries = table.entries;
    }


    public void write(PreAuthRecord auth)
    {
      if (!table.fits(offset,auth))
      {
        entries = 0;
        extend = table.next(extend,true);
        offset = table.align(extend);
      }

      offset = table.put(auth,extend,++entries,offset);
    }
  }
}