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
/**
 * Some styling of the popup windows is necessary but made public through this class.
 * It is also possible for expert users to replace all popup classes completely if needed.
 */
export class Internals {
    static CloseButtonText = null;
    static OKButtonText = "Ok";
    static CancelButtonText = "Cancel";
    static header = `
		<div name="popup" class="canvas-handle">
			<div name="popup-header" class="canvas-handle">
				<span name="title"></span>
				<div name="close-button" onclick="this.close(true)"></div>
			</div>
		</div>
	`;
    static footer = `
		<div name="popup-footer"></div>
	`;
    static PopupHeaderStyle = `
		width: 100%;
		height: 20px;
		text-align: center;
		position: relative;
	`;
    static PopupStyle = `
		gap:2px;
		display:grid;
		hyphens:auto;
		align-items: center;
		overflow-wrap: normal;
		align-content: center;
		justify-content: center;
	`;
    static PopupStyleLabel = `
		margin-top: 10px;
		font-weight: bold;
		user-select: none;
	`;
    static PopupStyleLogin = `
		display:grid;
	`;
    static PopupStyleButtonArea = `
		gap:3px;
		right:0;
		bottom:0;
		margin:10px;
		position: absolute;
	`;
    static PopupStyleLowerRight = `
		height:30px;
	`;
    static PopupStyleIndexing = `
		display:grid;
		margin-top:0px;
		grid-template-columns: 1fr 1fr;
	`;
    static PopupFooterStyle = null;
    static PopupCloseButton = `
		top: 0px;
		right: 0px;
		width: 20px;
		height: 20px;
		display: flex;
		font-size:20px;
		cursor: default;
		line-height: 15px;
		position: absolute;
		justify-content: center;
	`;
    static LoaderStyle = `
		width: 30px;
		height: 30px;
		position: absolute;
		border-radius: 50%;
		top: calc(40% - 15px);
		left: calc(50% - 15px);
		border: 4px solid #f3f3f3;
		border-top: 4px solid #3498db;
	`;
    static stylePopupWindow(view, title, height, width) {
        let scope = view.querySelector('div[name="scope"]');
        let login = view.querySelector('div[name="login"]');
        let loading = view.querySelector('div[name="loading"]');
        let body = view.querySelector('div[name="popup-body"]');
        let indexing = view.querySelector('div[name="indexing"]');
        let database = view.querySelector('div[name="database"]');
        let close = view.querySelector('div[name="close-button"]');
        let header = view.querySelector('div[name="popup-header"]');
        let footer = view.querySelector('div[name="popup-footer"]');
        let lowerright = view.querySelector('div[name="lowerright"]');
        let buttonarea = lowerright?.querySelector('div[name="buttonarea"]');
        let labels = view.querySelectorAll('div[name="popup-body"] label');
        if (Internals.PopupStyleLabel)
            labels.forEach((label) => label.style.cssText = Internals.PopupStyleLabel);
        if (body && Internals.PopupStyle)
            body.style.cssText = Internals.PopupStyle;
        if (close && Internals.PopupCloseButton)
            close.style.cssText = Internals.PopupCloseButton;
        if (header && Internals.PopupHeaderStyle)
            header.style.cssText = Internals.PopupHeaderStyle;
        if (footer && Internals.PopupFooterStyle)
            footer.style.cssText = Internals.PopupFooterStyle;
        if (indexing && Internals.PopupStyleIndexing)
            indexing.style.cssText = Internals.PopupStyleIndexing;
        if (close && Internals.CloseButtonText)
            close.innerHTML = Internals.CloseButtonText;
        if (scope != null) {
            if (scope.hasAttribute("true"))
                scope.style.display = "grid";
            else
                scope.style.display = "none";
        }
        if (database != null) {
            if (database.hasAttribute("true"))
                database.style.display = "grid";
            else
                database.style.display = "none";
        }
        if (login && Internals.PopupStyleLogin)
            login.style.cssText = Internals.PopupStyleLogin;
        if (lowerright && Internals.PopupStyleLowerRight)
            lowerright.style.cssText = Internals.PopupStyleLowerRight;
        if (buttonarea && Internals.PopupStyleButtonArea)
            buttonarea.style.cssText = Internals.PopupStyleButtonArea;
        if (loading && Internals.LoaderStyle) {
            loading.style.cssText = Internals.LoaderStyle;
            loading.animate([
                { transform: 'rotate(0deg)' },
                { transform: 'rotate(360deg)' }
            ], {
                duration: 1000,
                iterations: Infinity
            });
            return;
        }
        if (title) {
            let titlearea = header.querySelector('span[name="title"]');
            if (titlearea)
                titlearea.textContent = title;
        }
        if (width) {
            view.style.width = width + "px";
            view.style.minWidth = (width / 6 * 5) + "px";
        }
        if (height) {
            view.style.maxHeight = height + "px";
        }
        let top = view.parentElement.offsetTop;
        let left = view.parentElement.offsetLeft;
        left += (view.parentElement.offsetWidth - view.offsetWidth) / 1.50;
        top += (view.parentElement.offsetHeight - view.offsetHeight) / 4.00;
        if (top < 0)
            top = 50;
        if (left < 0)
            left = 50;
        view.style.top = top + "px";
        view.style.left = left + "px";
    }
}
