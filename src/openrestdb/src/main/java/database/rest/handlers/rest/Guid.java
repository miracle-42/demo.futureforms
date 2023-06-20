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

import java.math.BigInteger;
import java.security.SecureRandom;


public class Guid
{
  private final String guid;

  public Guid()
  {
    BigInteger bi = null;
    byte[] bytes = new byte[4];
    SecureRandom random = new SecureRandom();

    random.nextBytes(bytes);
    bi = new BigInteger(bytes);
    String p1 = Integer.toHexString(bi.intValue());

    random.nextBytes(bytes);
    bi = new BigInteger(bytes);
    String p2 = Integer.toHexString(bi.intValue());

    String guid = (p1 + p2);

    while(guid.length() < 16)
      guid += random.nextInt(9);

    this.guid = guid;
  }


  @Override
  public String toString()
  {
    return(guid);
  }
}