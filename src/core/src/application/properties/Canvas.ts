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

export class Canvas
{
	public static page:string =
	`
	<div name="canvas">
		<div name="modal"></div>
		<div name="content"></div>
	</div>
	`;

	public static ModalStyle:string =
	`
		top: 0;
		left: 0;
		width: 0;
		height: 0;
		position: absolute;
	`

	public static CanvasStyle:string =
	`
		overflow: hidden;
		position: absolute;
		width: fit-content;
		height: fit-content;
	`

	public static ContentStyle:string =
	`
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		position: relative;
	`

	public static ModalClasses:string = "modal";
	public static CanvasClasses:string = "canvas";
	public static ContentClasses:string = "canvas-content";
	public static CanvasHandleClass:string = "canvas-handle";
}