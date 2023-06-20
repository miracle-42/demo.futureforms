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

package database.rest.security;

import java.security.KeyStore;
import java.io.FileInputStream;
import javax.net.ssl.SSLContext;
import javax.net.ssl.KeyManager;
import java.security.PrivateKey;
import javax.net.ssl.TrustManager;
import java.security.cert.Certificate;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.TrustManagerFactory;
import java.security.cert.X509Certificate;


public class PKIContext
{
  private SSLContext ctx;
  private PrivateKey key;
  private KeyManager[] kmgrs;
  private TrustManager[] tmgrs;
  private X509Certificate[] chain;


  public PKIContext(Keystore identity, Keystore trust) throws Exception
  {
    this.setTrustStore(trust);
    this.setIdentity(identity);
  }


  private PKIContext setIdentity(Keystore def) throws Exception
  {
    this.ctx = null;

    FileInputStream stream = new FileInputStream(def.file);
    KeyStore keystore = KeyStore.getInstance(def.type);
    keystore.load(stream,def.password.toCharArray());

    // Create the temporary store containing the private key + chain

    KeyStore prvstore = KeyStore.getInstance("jks");
    prvstore.load(null,null);

    this.key = (PrivateKey) keystore.getKey(def.alias,def.password.toCharArray());

    Certificate[] pchain = keystore.getCertificateChain(def.alias);
    if (pchain == null) throw new Exception("Alias \""+def.alias+"\" does not exist in keystore "+def.file);

    this.chain = new X509Certificate[pchain.length];
    System.arraycopy(pchain,0,chain,0,chain.length);

    prvstore.setKeyEntry(def.alias,key,new char[0],chain);

    KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
    kmf.init(prvstore,new char[0]);
    this.kmgrs = kmf.getKeyManagers();

    return(this);
  }


  private PKIContext setTrustStore(Keystore def) throws Exception
  {
    this.ctx = null;

    FileInputStream stream = new FileInputStream(def.file);
    KeyStore pubstore = KeyStore.getInstance(def.type);
    pubstore.load(stream,def.password.toCharArray());

    TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
    tmf.init(pubstore);

    this.tmgrs = tmf.getTrustManagers();
    return(this);
  }


  public SSLContext getSSLContext() throws Exception
  {
    if (ctx == null)
    {
      ctx = SSLContext.getInstance("TLS");
      ctx.init(kmgrs,tmgrs,new java.security.SecureRandom());

      for (int i = 0; i < 256; i++)
      {
        try
        {
          ctx.createSSLEngine();
          return(ctx);
        }
        catch (Exception e)
        {
          Thread.sleep(1);
        }
      }

      throw new Exception("Unable to initialize SSLContext");
    }

    return(ctx);
  }
}