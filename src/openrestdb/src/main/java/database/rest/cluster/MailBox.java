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
import java.util.HashMap;
import java.nio.file.Path;
import java.nio.file.Files;
import java.util.logging.Logger;
import java.nio.file.FileSystem;
import java.nio.MappedByteBuffer;
import java.nio.file.FileSystems;
import database.rest.config.Paths;
import database.rest.config.Config;
import java.nio.channels.FileChannel;
import static java.nio.file.StandardOpenOption.*;
import java.nio.file.attribute.PosixFilePermission;


public class MailBox
{
  private final int extnds;
  private final int extsize;
  private final MappedByteBuffer shmmem;
  private final HashMap<Integer,Long> extmap;

  private final Object RLOCK = new Object();
  private final Object WLOCK = new Object();
  private final Logger logger = Logger.getLogger("internal");


  public MailBox(Config config, short id) throws Exception
  {
    String filename = getFileName(id);
    FileSystem fs = FileSystems.getDefault();

    this.extmap = new HashMap<Integer,Long>();
    this.extnds = config.getTopology().extnds;
    this.extsize = config.getTopology().extsize;

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
        logger.warning("Unable to set file permissions for mailbox");
      }
    }

    this.shmmem = fc.map(FileChannel.MapMode.READ_WRITE,0,extnds*extsize);
  }


  public boolean fits(byte[] data)
  {
    return(data.length <= extsize);
  }


  public boolean write(int extend, byte[] data)
  {
    if (data.length > extsize)
      return(false);

    synchronized(WLOCK)
    {
      shmmem.position(extend*extsize);
      shmmem.put(data);
    }

    return(true);
  }


  public int write(long id, byte[] data)
  {
    if (data.length > extsize)
      return(-1);

    int start = (int) (id % extnds);

    synchronized(WLOCK)
    {
      for (int i = 0; i < extnds; i++)
      {
        int extend = (start + i) % extnds;
        if (extmap.get(extend) == null)
        {
          shmmem.position(extend*extsize);
          shmmem.put(data);
          return(extend);
        }
      }
    }

    logger.warning("No available extends in mailbox");
    return(-1);
  }


  public byte[] read(int extend, int size)
  {
    byte[] data = new byte[size];

    synchronized(RLOCK)
    {
      extmap.remove(extend);
      shmmem.position(extend*extsize);
      shmmem.get(data);
    }

    return(data);
  }


  public void clear(int extend)
  {
    extmap.remove(extend);
  }


  private String getFileName(short id)
  {
    String hex = Integer.toHexString(id);
    hex = String.format("%4s",hex).replace(' ','0');
    return(Paths.ipcdir + File.separator + "ipc" + hex + ".mbx");
  }
}