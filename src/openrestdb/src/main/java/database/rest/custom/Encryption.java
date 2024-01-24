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

package database.rest.custom;

import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

public class Encryption
{
   private final static int HASH = 8;

   public static String encrypt(String secret, String data) throws Exception
   {
      return(encrypt(secret,data.getBytes()));
   }

   public static String encrypt(String secret, byte[] data) throws Exception
   {
      for (int i = 0; secret.length() < 32; i++)
         secret += (char) ('a' + (i%26));

      if (secret.length() > 32)
         secret = secret.substring(0,32);

      byte[]    salt = secret.getBytes("UTF-8");
      Cipher    ciph = Cipher.getInstance("AES");
      SecretKey skey = new SecretKeySpec(salt,"AES");

      String time = System.currentTimeMillis()+"";
      byte[] hash = (time.substring(time.length()-HASH,time.length())).getBytes();

      for (int i = 0; i < data.length; i++)
      {
        byte s = hash[i % hash.length];
        data[i] = (byte) (data[i] ^ s);
      }

      byte[] enc = new byte[hash.length+data.length];

      System.arraycopy(hash,0,enc,0,hash.length);
      System.arraycopy(data,0,enc,hash.length,data.length);

      ciph.init(Cipher.ENCRYPT_MODE,skey);
      data = ciph.doFinal(enc);

      data = Base64.getEncoder().encode(data);

      int len = data.length;
      while(data[len-1] == '=') len--;

      String encr = new String(data,0,len);
      encr = encr.replaceAll("/","@");

      return(encr);
   }

   public static byte[] decrypt(String secret, String data) throws Exception
   {
      for (int i = 0; secret.length() < 32; i++)
         secret += (char) ('a' + (i%26));

      if (secret.length() > 32)
         secret = secret.substring(0,32);

      byte[]    salt = secret.getBytes("UTF-8");
      Cipher    ciph = Cipher.getInstance("AES");
      SecretKey skey = new SecretKeySpec(salt,"AES");

      data = data.replaceAll("@","/");
      while(data.length() % 4 != 0) data += "=";
      byte[] bytes = Base64.getDecoder().decode(data);

      ciph.init(Cipher.DECRYPT_MODE,skey);
      bytes = ciph.doFinal(bytes);

      byte[] hash = new byte[HASH];
      System.arraycopy(bytes,0,hash,0,HASH);

      byte[] decr = new byte[bytes.length-HASH];
      System.arraycopy(bytes,HASH,decr,0,bytes.length-HASH);

      for (int i = 0; i < decr.length; i++)
      {
        byte s = hash[i % hash.length];
        decr[i] = (byte) (decr[i] ^ s);
      }

      return(decr);
   }
}
