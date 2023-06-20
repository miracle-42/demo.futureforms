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

export class Internals
{
	public static header:string =
	`
		<div name="popup" class="canvas-handle">
			<div name="popup-header" class="canvas-handle">
				<span name="title"></span>
				<div name="close-button" onclick="this.close(true)">x</div>
			</div>
		</div>
	`;

	public static footer:string =
	`
		<div name="popup-footer"></div>
	`;

	public static PopupHeaderStyle =
	`
		width: 100%;
		height: 20px;
		text-align: center;
		position: relative;
		border-bottom: 1px solid black;
	`;

	public static PopupStyle =
	`
		gap:2px;
		display:grid;
		overflow: hidden;
		padding:10px 20px;
		align-items: center;
		align-content: center;
		justify-content: center;
	`;

	public static PopupStyleDiv =
	`
		margin-top:10px;
	`;

	public static PopupStyleLabel =
	`
		margin-right: 8px;
	`;

	public static PopupStyleLogin:string =
	`
		display:grid;
	`;

	public static PopupStyleButtonArea =
	`
		gap:3px;
		right:0;
		bottom:0;
		margin:10px;
		position: absolute;
	`;

	public static PopupStyleLowerRight =
	`
		height:30px;
		padding-top:10px;
	`;

	public static PopupFooterStyle = null;

	public static PopupCloseButton =
	`
		top: 0px;
		right: 0px;
		width: 20px;
		height: 20px;
		display: grid;
		cursor: default;
		text-align:right;
		font-weight: bold;
		text-align:center;
		position: absolute;
	`;

	public static LoaderStyle:string =
	`
		width: 30px;
		height: 30px;
		position: absolute;
		border-radius: 50%;
		top: calc(40% - 15px);
		left: calc(50% - 15px);
		border: 4px solid #f3f3f3;
		border-top: 4px solid #3498db;
	`;



	public static stylePopupWindow(view:HTMLElement, title?:string, height?:number, width?:number) : void
	{
		let login:HTMLElement = view.querySelector('div[name="login"]');
		let loading:HTMLElement = view.querySelector('div[name="loading"]');
		let body:HTMLElement = view.querySelector('div[name="popup-body"]');
		let close:HTMLElement = view.querySelector('div[name="close-button"]');
		let header:HTMLElement = view.querySelector('div[name="popup-header"]');
		let footer:HTMLElement = view.querySelector('div[name="popup-footer"]');
		let lowerright:HTMLElement = view.querySelector('div[name="lowerright"]');
		let buttonarea:HTMLElement = lowerright?.querySelector('div[name="buttonarea"]');
		let divs:NodeListOf<HTMLElement> = view.querySelectorAll('div[name="popup-body"] div');
		let labels:NodeListOf<HTMLElement> = view.querySelectorAll('div[name="popup-body"] label');

		if (Internals.PopupStyleDiv) divs.forEach((div) => div.style.cssText = Internals.PopupStyleDiv);
		if (Internals.PopupStyleLabel) labels.forEach((label) => label.style.cssText = Internals.PopupStyleLabel);

		if (body && Internals.PopupStyle) body.style.cssText = Internals.PopupStyle;
		if (close && Internals.PopupCloseButton) close.style.cssText = Internals.PopupCloseButton;
		if (header && Internals.PopupHeaderStyle) header.style.cssText = Internals.PopupHeaderStyle;
		if (footer && Internals.PopupFooterStyle) footer.style.cssText = Internals.PopupFooterStyle;


		if (login && Internals.PopupStyleLogin) login.style.cssText = Internals.PopupStyleLogin;
		if (lowerright && Internals.PopupStyleLowerRight) lowerright.style.cssText = Internals.PopupStyleLowerRight;
		if (buttonarea && Internals.PopupStyleButtonArea) buttonarea.style.cssText = Internals.PopupStyleButtonArea;

		if (loading && Internals.LoaderStyle)
		{
			loading.style.cssText = Internals.LoaderStyle;

			loading.animate(
			[
				{ transform: 'rotate(0deg)'},
				{ transform: 'rotate(360deg)' }
			],
			{
				duration: 1000,
				iterations: Infinity
			})

			return;
		}

		if (title)
		{
			let titlearea:HTMLElement = header.querySelector('span[name="title"]');
			if (titlearea) titlearea.textContent = title;
		}

		if (width)
		{
			view.style.maxWidth = width + "px";
			view.style.minWidth = (width / 1.5 ) + "px";
		}

		if (height)
		{
			view.style.maxHeight = height + "px";
		}

		let top:number = view.parentElement.offsetTop;
		let left:number = view.parentElement.offsetLeft;

		left += (view.parentElement.offsetWidth - view.offsetWidth)/1.50;
		top += (view.parentElement.offsetHeight - view.offsetHeight)/4.00;

		view.style.top = top+"px";
		view.style.left = left+"px";
	}
}