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

export enum Type
{
	metadata,
	database,
	htmlparser,
	eventparser,
	classloader,
	formbinding,
	eventhandling,
	eventlisteners,
}

/**
 * The Logger class is meant for debugging the code.
 */
export class Logger
{
	public static all:boolean = false;
	public static metadata:boolean = false;
	public static database:boolean = false;
	public static htmlparser:boolean = false;
	public static eventparser:boolean = false;
	public static classloader:boolean = false;
	public static formbinding:boolean = false;
	public static eventhandling:boolean = false;
	public static eventlisteners:boolean = false;

	public static log(type:Type, msg:string) : void
	{
		let flag:string = Type[type];
		if (Logger[flag] || Logger.all) console.log(msg);
	}
}