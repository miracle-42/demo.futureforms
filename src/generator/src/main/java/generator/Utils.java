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

package generator;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.ByteArrayOutputStream;


public class Utils
{
	public static <T> T nvl(T value, T defval)
	{
		if (value != null) return((T) value);
		return(defval);
	}

	public static boolean delete(String file) throws Exception
	{
		return((new File(file)).delete());
	}

	public static boolean exists(String file) throws Exception
	{
		return((new File(file)).exists());
	}

	public static String load(String file, boolean check) throws Exception
	{
		if (check)
		{
			if (!exists(file))
				return(null);
		}

		int read = 0;
		byte[] buf = new byte[4096];
		FileInputStream in = new FileInputStream(file);
		ByteArrayOutputStream out = new ByteArrayOutputStream();

		while(read >= 0)
		{
			out.write(buf,0,read);
			read = in.read(buf);
		}

		in.close();

		String content =
			new String(out.toByteArray()).trim();

		if (content.length() == 0)
			return(null);

		return(content);
	}


	public static void save(String data, String file) throws Exception
	{
		save(data.getBytes("UTF-8"),file);
	}


	public static void save(byte[] data, String file) throws Exception
	{
		File dir = new File(file).getParentFile();
		dir.mkdirs();

		FileOutputStream out = new FileOutputStream(file);
		out.write(data);
		out.close();
	}
}
