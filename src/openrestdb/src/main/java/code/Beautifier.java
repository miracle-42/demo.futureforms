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

package code;

import java.io.File;
import java.io.FileReader;
import java.io.PrintStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collections;
import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;


public class Beautifier
{
  private final String file;
  private static int lines = 0;
  private static int blanks = 0;


  public static void main(String[] args) throws Exception
  {
    String root = "/Users/alhof/Repository/OpenRestDB/projects/openrestdb/src";
    next(new File(root));
    System.out.println("lines: "+lines+" blanks: "+blanks+" code: "+(lines-blanks));
  }


  private static void next(File folder) throws Exception
  {
    File[] content = folder.listFiles();

    for(File file : content)
    {
      if (file.isDirectory()) next(file);
      else
      {
        Beautifier beautifier = new Beautifier(file.getPath());
        String code = beautifier.process();
        if (code != null) beautifier.save(code);
      }
    }
  }


  public Beautifier(String file)
  {
    this.file = file;
  }


  public void save(String code) throws Exception
  {
    FileOutputStream out = new FileOutputStream(file);
    out.write(code.getBytes());
    out.close();
  }


  public String process() throws Exception
  {
    String line = null;
    File f = new File(file);

    TrimmedOutputStream bout = new TrimmedOutputStream();
    BufferedReader in = new BufferedReader(new FileReader(f));

    PrintStream out = new PrintStream(bout);

    // Skip blanks before open-source header

    while(true)
    {
      line = in.readLine();
      if (line.trim().length() > 0) break;
    }

    in.close();

    if (!line.trim().startsWith("/*"))
    {
      System.out.println("No open-source header "+file);
      return(null);
    }

    lines -= 10;
    // Skip open-source header

    out.println(line);

    while(true)
    {
      line = in.readLine(); out.println(line);
      if (line.trim().endsWith("*/")) break;
    }

    out.println();

    // Skip blanks before package

    while(true)
    {
      line = in.readLine();
      if (line.trim().length() > 0) break;
    }

    // package + blank
    out.println(line);
    out.println();

    // Skip blanks before import

    while(true)
    {
      line = in.readLine();
      if (line.trim().length() > 0) break;
    }

    int imports = 0;
    if (line.startsWith("import"))
    {
      ArrayList<String> imps = new ArrayList<String>();
      imps.add(line);

      while(true)
      {
        line = in.readLine().trim();

        if (line.length() > 0 && !line.startsWith("import"))
          break;

        imports++;
        imps.add(line);
      }

      while(imps.get(imps.size()-1).length() == 0)
        imps.remove(imps.size()-1);

      imps = sortimps(imps);

      for(String imp : imps)
      {
        out.println(imp);
        if (imp.length() == 0)
          System.out.println("Blank lines in import section "+file);
      }
    }

    if (imports > 0)
      out.println();

    out.println();
    out.println(line);

    while(true)
    {
      line = in.readLine();
      if (line == null) break;
      out.println(line);
    }

    in.close();

    FileInputStream oin = new FileInputStream(f);
    byte[] borg = new byte[(int) f.length()];

    int read = oin.read(borg);

    oin.close();

    if (read != borg.length)
      throw new Exception("Incomplete read "+file);


    // Trailing blank lines
    byte[] bnew = bout.toByteArray();

    int len = bnew.length;
    for (int i = len-1; i >= 0; i--)
    {
      if (bnew[i] == '\n') len--;
      else break;
    }

    if (len != bnew.length)
    {
      byte[] btmp = new byte[len];
      System.arraycopy(bnew,0,btmp,0,len);
      bnew = btmp;
    }

    String org = new String(borg);
    String mod = new String(bnew);

    if (org.equals(mod))
      return(null);

    return(mod);
  }


  private ArrayList<String> sortimps(ArrayList<String> imps)
  {
    LengthSorter sorter = new LengthSorter();
    ArrayList<String> tmp = new ArrayList<String>();
    ArrayList<String> simps = new ArrayList<String>();

    for (int i = 0; i < imps.size(); i++)
    {
      String imp = imps.get(i);

      if (imp.length() > 0)
      {
        tmp.add(imp);
      }
      else
      {
        Collections.sort(tmp,sorter);
        simps.addAll(tmp);
        simps.add(imp);
        tmp.clear();
      }
    }

    Collections.sort(tmp,sorter);
    simps.addAll(tmp);
    tmp.clear();

    return(simps);
  }


  class LengthSorter implements Comparator<String>
  {
    @Override
    public int compare(String s1, String s2)
    {
      return(s1.length()-s2.length());
    }
  }


  private static class TrimmedOutputStream extends ByteArrayOutputStream
  {
    @Override
    public synchronized void write(byte[] buf, int off, int len)
    {
      for (int i = len-2; i >= 0; i--)
      {
        if (buf[i+off] == ' ') len--;
        else break;
      }

      buf[len-1] = '\n';

      lines++;
      if (len == 1 && buf[0] == '\n') blanks++;

      super.write(buf,off,len);
    }
  }
}