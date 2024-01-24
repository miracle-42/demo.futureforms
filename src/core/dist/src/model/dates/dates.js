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
import { utils } from "./utils.js";
import { MSGGRP } from "../../messages/Internal.js";
import { Messages } from "../../messages/Messages.js";
export var DatePart;
(function (DatePart) {
    DatePart[DatePart["Date"] = 0] = "Date";
    DatePart[DatePart["Year"] = 1] = "Year";
    DatePart[DatePart["Month"] = 2] = "Month";
    DatePart[DatePart["Day"] = 3] = "Day";
    DatePart[DatePart["Hour"] = 4] = "Hour";
    DatePart[DatePart["Minute"] = 5] = "Minute";
    DatePart[DatePart["Second"] = 6] = "Second";
})(DatePart || (DatePart = {}));
/** Used internally */
export var WeekDays;
(function (WeekDays) {
    WeekDays[WeekDays["Sun"] = 0] = "Sun";
    WeekDays[WeekDays["Mon"] = 1] = "Mon";
    WeekDays[WeekDays["Tue"] = 2] = "Tue";
    WeekDays[WeekDays["Wed"] = 3] = "Wed";
    WeekDays[WeekDays["Thu"] = 4] = "Thu";
    WeekDays[WeekDays["Fri"] = 5] = "Fri";
    WeekDays[WeekDays["Sat"] = 6] = "Sat";
})(WeekDays || (WeekDays = {}));
/**
 * Utility class for dealing with days
 */
export class dates {
    /** check the format mask */
    static validate() {
        let valid = true;
        let tokens = dates.tokenizeFormat();
        tokens.forEach((token) => {
            if (token.type == null) {
                // Token not supported
                Messages.severe(MSGGRP.FRAMEWORK, 11, token.mask);
                valid = false;
            }
        });
        return (valid);
    }
    /** parse a date-string into a Date using a given format. Optionally include the time part */
    static parse(datestr, format, withtime) {
        if (withtime == null)
            withtime = datestr.includes(' ');
        return (utils.parse(datestr, withtime, format));
    }
    /** Get next 7 days of week */
    static getDays(start) {
        let names = [];
        for (let i = 0; i < 7; i++)
            names.push(WeekDays[(i + start) % 7]);
        return (names);
    }
    /** Format a given date using a format (or default format) */
    static format(date, format) {
        return (utils.format(date, format));
    }
    /** Tokenize a given date into the DateTokens */
    static tokenizeDate(date, format) {
        return (utils.tokenize(date, format));
    }
    /** Get the DatePart of a giveb token i.e. DD, MM, ... */
    static getTokenType(token) {
        switch (token) {
            case "DD": return (DatePart.Day);
            case "MM": return (DatePart.Month);
            case "YYYY": return (DatePart.Year);
            case "HH": return (DatePart.Hour);
            case "mm": return (DatePart.Minute);
            case "ss": return (DatePart.Second);
            default: return (null);
        }
    }
    /** Split a given format into FormatTokens */
    static tokenizeFormat(format) {
        let tokens = [];
        if (format == null)
            format = utils.full();
        let last = 0;
        let start = 0;
        let delim = utils.delim();
        for (let i = 0; i < format.length; i++) {
            if (delim.includes(format.charAt(i))) {
                if (i - last == 1) {
                    Messages.severe(MSGGRP.FRAMEWORK, 12);
                    throw "@dates: Date delimitors can only be 1 character";
                }
                let token = {
                    pos: start,
                    length: i - start,
                    delimitor: format.charAt(i),
                    mask: format.substring(start, i),
                    type: this.getTokenType(format.substring(start, i))
                };
                tokens.push(token);
                last = i;
                start = i + 1;
            }
        }
        tokens.push({
            pos: start,
            delimitor: '',
            mask: format.substring(start),
            length: format.length - start,
            type: this.getTokenType(format.substring(start))
        });
        return (tokens);
    }
}
