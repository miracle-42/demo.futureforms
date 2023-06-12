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

package database.rest.database;


public class BindValue
{
  private final boolean out;
  private final BindValueDef bindvalue;

  public BindValue(BindValueDef bindvalue, boolean out)
  {
    this.out = out;
    this.bindvalue = bindvalue;
  }

  public boolean InOut()
  {
    return(out);
  }

  public boolean OutOnly()
  {
    return(bindvalue.outval);
  }

  public String getName()
  {
    return(bindvalue.name);
  }

  public int getType()
  {
    return(bindvalue.type);
  }

  public Object getValue()
  {
    return(bindvalue.value);
  }


  @Override
  public String toString()
  {
    String inout = "in";
    if (bindvalue.outval) inout = "out";
    else if (out)         inout = "inout";

    return(bindvalue.name+" "+bindvalue.type+" "+bindvalue.value+" ("+inout+")");
  }
}