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
 * Some styling of the date-picker is necessary but made public through this class.
 * It is also possible for expert users to replace the date-picker class completely if needed.
 */
export class DatePicker
{
	public static datePickerDateStyle:string =
	`
		margin-top: 10px;
    	display: flex;
    	justify-content: center;
	`;

	public static datePickerMonthStyle:string =
	`
		display:flex;
		font-size: 13px;
		margin-bottom:10px;
		align-items: center;
		justify-content: space-between;
		border-bottom: 2px solid rgb(155, 155, 155);
	`;

	public static datePickerMthTextStyle:string =
	`
		margin-top:0px;
	`

	public static datePickerArrowStyle:string =
	`
		width: 35px;
		height:35px;
		display:flex;
		cursor: default;
		font-size: 20px;
		align-items: center;
		justify-content: center;
	`;

	public static datePickerWeekStyle:string =
	`
		display:grid;
		grid-template-columns: repeat(7,1fr);
	`;

	public static datePickerDayStyle:string =
	`
		height:15px;
		display:flex;
		font-size: 12px;
		cursor: default;
		align-items: center;
		justify-content: center;
	`;

	public static datePickerSelectedDay:string =
	`
		background-color: #a8a8a8;
	`;

	public static datePickerSelectedDate:string =
	`
		width:100%;
		height: 100%;
		display:flex;
		font-size: 14px;
		align-items: center;
		justify-content: center;
	`;

	public static styleDatePicker(view:HTMLElement) : void
	{
		let body:HTMLElement = view.querySelector("div[name='date-picker']")
		if(body)
		{
			let mth:HTMLElement = body.querySelector("div[name='mth']");
			let date:HTMLElement = body.querySelector("div[name='date']");
			let month:HTMLElement = body.querySelector("div[name='month']");
			let day:NodeListOf<HTMLElement>= body.querySelectorAll("div[name='day']");
			let week:NodeListOf<HTMLElement> = body.querySelectorAll("div[name='week']");
			let arrow:NodeListOf<HTMLElement>= body.querySelectorAll("div[name='prev'],div[name='next']");

			if(mth && DatePicker.datePickerMthTextStyle) mth.style.cssText = DatePicker.datePickerMthTextStyle;
			if(month && DatePicker.datePickerMonthStyle) month.style.cssText = DatePicker.datePickerMonthStyle;

			if (DatePicker.datePickerDayStyle) day.forEach((day) => day.style.cssText = DatePicker.datePickerDayStyle);
			if (DatePicker.datePickerWeekStyle) week.forEach((week) => week.style.cssText = DatePicker.datePickerWeekStyle);
			if (DatePicker.datePickerArrowStyle) arrow.forEach((arrow) => arrow.style.cssText = DatePicker.datePickerArrowStyle);
		}
	}
}