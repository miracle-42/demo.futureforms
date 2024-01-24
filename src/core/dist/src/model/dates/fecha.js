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
const token = /d{1,4}|M{1,4}|YY(?:YY)?|S{1,3}|Do|ZZ|Z|([HhMsDm])\1?|[aA]|"[^"]*"|'[^']*'/g;
const twoDigitsOptional = "[1-9]\\d?";
const twoDigits = "\\d\\d";
const threeDigits = "\\d{3}";
const fourDigits = "\\d{4}";
const word = "[^\\s]+";
const literal = /\[([^]*?)\]/gm;
function shorten(arr, sLen) {
    const newArr = [];
    for (let i = 0, len = arr.length; i < len; i++) {
        newArr.push(arr[i].substr(0, sLen));
    }
    return newArr;
}
const monthUpdate = (arrName) => (v, i18n) => {
    const lowerCaseArr = i18n[arrName].map(v => v.toLowerCase());
    const index = lowerCaseArr.indexOf(v.toLowerCase());
    if (index > -1) {
        return index;
    }
    return null;
};
export function assign(origObj, ...args) {
    for (const obj of args) {
        for (const key in obj) {
            origObj[key] = obj[key];
        }
    }
    return origObj;
}
const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];
const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];
const monthNamesShort = shorten(monthNames, 3);
const dayNamesShort = shorten(dayNames, 3);
const defaultI18n = {
    dayNamesShort,
    dayNames,
    monthNamesShort,
    monthNames,
    amPm: ["am", "pm"],
    DoFn(dayOfMonth) {
        return (dayOfMonth +
            ["th", "st", "nd", "rd"][dayOfMonth % 10 > 3
                ? 0
                : ((dayOfMonth - (dayOfMonth % 10) !== 10 ? 1 : 0) * dayOfMonth) % 10]);
    }
};
let globalI18n = assign({}, defaultI18n);
const setGlobalDateI18n = (i18n) => (globalI18n = assign(globalI18n, i18n));
const regexEscape = (str) => str.replace(/[|\\{()[^$+*?.-]/g, "\\$&");
const pad = (val, len = 2) => {
    val = String(val);
    while (val.length < len) {
        val = "0" + val;
    }
    return val;
};
const formatFlags = {
    D: (dateObj) => String(dateObj.getDate()),
    DD: (dateObj) => pad(dateObj.getDate()),
    Do: (dateObj, i18n) => i18n.DoFn(dateObj.getDate()),
    d: (dateObj) => String(dateObj.getDay()),
    dd: (dateObj) => pad(dateObj.getDay()),
    ddd: (dateObj, i18n) => i18n.dayNamesShort[dateObj.getDay()],
    dddd: (dateObj, i18n) => i18n.dayNames[dateObj.getDay()],
    M: (dateObj) => String(dateObj.getMonth() + 1),
    MM: (dateObj) => pad(dateObj.getMonth() + 1),
    MMM: (dateObj, i18n) => i18n.monthNamesShort[dateObj.getMonth()],
    MMMM: (dateObj, i18n) => i18n.monthNames[dateObj.getMonth()],
    YY: (dateObj) => pad(String(dateObj.getFullYear()), 4).substr(2),
    YYYY: (dateObj) => pad(dateObj.getFullYear(), 4),
    h: (dateObj) => String(dateObj.getHours() % 12 || 12),
    hh: (dateObj) => pad(dateObj.getHours() % 12 || 12),
    H: (dateObj) => String(dateObj.getHours()),
    HH: (dateObj) => pad(dateObj.getHours()),
    m: (dateObj) => String(dateObj.getMinutes()),
    mm: (dateObj) => pad(dateObj.getMinutes()),
    s: (dateObj) => String(dateObj.getSeconds()),
    ss: (dateObj) => pad(dateObj.getSeconds()),
    S: (dateObj) => String(Math.round(dateObj.getMilliseconds() / 100)),
    SS: (dateObj) => pad(Math.round(dateObj.getMilliseconds() / 10), 2),
    SSS: (dateObj) => pad(dateObj.getMilliseconds(), 3),
    a: (dateObj, i18n) => dateObj.getHours() < 12 ? i18n.amPm[0] : i18n.amPm[1],
    A: (dateObj, i18n) => dateObj.getHours() < 12
        ? i18n.amPm[0].toUpperCase()
        : i18n.amPm[1].toUpperCase(),
    ZZ(dateObj) {
        const offset = dateObj.getTimezoneOffset();
        return ((offset > 0 ? "-" : "+") +
            pad(Math.floor(Math.abs(offset) / 60) * 100 + (Math.abs(offset) % 60), 4));
    },
    Z(dateObj) {
        const offset = dateObj.getTimezoneOffset();
        return ((offset > 0 ? "-" : "+") +
            pad(Math.floor(Math.abs(offset) / 60), 2) +
            ":" +
            pad(Math.abs(offset) % 60, 2));
    }
};
const monthParse = (v) => +v - 1;
const emptyDigits = [null, twoDigitsOptional];
const emptyWord = [null, word];
const amPm = [
    "isPm",
    word,
    (v, i18n) => {
        const val = v.toLowerCase();
        if (val === i18n.amPm[0]) {
            return 0;
        }
        else if (val === i18n.amPm[1]) {
            return 1;
        }
        return null;
    }
];
const timezoneOffset = [
    "timezoneOffset",
    "[^\\s]*?[\\+\\-]\\d\\d:?\\d\\d|[^\\s]*?Z?",
    (v) => {
        const parts = (v + "").match(/([+-]|\d\d)/gi);
        if (parts) {
            const minutes = +parts[1] * 60 + parseInt(parts[2], 10);
            return parts[0] === "+" ? minutes : -minutes;
        }
        return 0;
    }
];
const parseFlags = {
    D: ["day", twoDigitsOptional],
    DD: ["day", twoDigits],
    Do: ["day", twoDigitsOptional + word, (v) => parseInt(v, 10)],
    M: ["month", twoDigitsOptional, monthParse],
    MM: ["month", twoDigits, monthParse],
    YY: [
        "year",
        twoDigits,
        (v) => {
            const now = new Date();
            const cent = +("" + now.getFullYear()).substr(0, 2);
            return +("" + (+v > 68 ? cent - 1 : cent) + v);
        }
    ],
    h: ["hour", twoDigitsOptional, undefined, "isPm"],
    hh: ["hour", twoDigits, undefined, "isPm"],
    H: ["hour", twoDigitsOptional],
    HH: ["hour", twoDigits],
    m: ["minute", twoDigitsOptional],
    mm: ["minute", twoDigits],
    s: ["second", twoDigitsOptional],
    ss: ["second", twoDigits],
    YYYY: ["year", fourDigits],
    S: ["millisecond", "\\d", (v) => +v * 100],
    SS: ["millisecond", twoDigits, (v) => +v * 10],
    SSS: ["millisecond", threeDigits],
    d: emptyDigits,
    dd: emptyDigits,
    ddd: emptyWord,
    dddd: emptyWord,
    MMM: ["month", word, monthUpdate("monthNamesShort")],
    MMMM: ["month", word, monthUpdate("monthNames")],
    a: amPm,
    A: amPm,
    ZZ: timezoneOffset,
    Z: timezoneOffset
};
// Some common format strings
const globalMasks = {
    default: "ddd MMM DD YYYY HH:mm:ss",
    shortDate: "M/D/YY",
    mediumDate: "MMM D, YYYY",
    longDate: "MMMM D, YYYY",
    fullDate: "dddd, MMMM D, YYYY",
    isoDate: "YYYY-MM-DD",
    isoDateTime: "YYYY-MM-DDTHH:mm:ssZ",
    shortTime: "HH:mm",
    mediumTime: "HH:mm:ss",
    longTime: "HH:mm:ss.SSS"
};
const setGlobalDateMasks = (masks) => assign(globalMasks, masks);
/***
 * Format a date
 * @method format
 * @param {Date|number} dateObj
 * @param {string} mask Format of the date, i.e. 'mm-dd-yy' or 'shortDate'
 * @returns {string} Formatted date string
 */
const format = (dateObj, mask = globalMasks["default"], i18n = {}) => {
    if (typeof dateObj === "number") {
        dateObj = new Date(dateObj);
    }
    if (Object.prototype.toString.call(dateObj) !== "[object Date]" ||
        isNaN(dateObj.getTime())) {
        throw new Error("Invalid Date pass to format");
    }
    mask = globalMasks[mask] || mask;
    const literals = [];
    // Make literals inactive by replacing them with @@@
    mask = mask.replace(literal, function ($0, $1) {
        literals.push($1);
        return "@@@";
    });
    const combinedI18nSettings = assign(assign({}, globalI18n), i18n);
    // Apply formatting rules
    mask = mask.replace(token, $0 => formatFlags[$0](dateObj, combinedI18nSettings));
    // Inline literal values back into the formatted value
    return mask.replace(/@@@/g, () => literals.shift());
};
/**
 * Parse a date string into a Javascript Date object /
 * @method parse
 * @param {string} dateStr Date string
 * @param {string} format Date parse format
 * @param {i18n} I18nSettingsOptional Full or subset of I18N settings
 * @returns {Date|null} Returns Date object. Returns null what date string is invalid or doesn't match format
 */
function parse(dateStr, format, i18n = {}) {
    if (typeof format !== "string") {
        throw new Error("Invalid format in fecha parse");
    }
    // Check to see if the format is actually a mask
    format = globalMasks[format] || format;
    // Avoid regular expression denial of service, fail early for really long strings
    // https://www.owasp.org/index.php/Regular_expression_Denial_of_Service_-_ReDoS
    if (dateStr.length > 1000) {
        return null;
    }
    // Default to the beginning of the year.
    const today = new Date();
    const dateInfo = {
        year: today.getFullYear(),
        month: 0,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        millisecond: 0,
        isPm: null,
        timezoneOffset: null
    };
    const parseInfo = [];
    const literals = [];
    // Replace all the literals with @@@. Hopefully a string that won't exist in the format
    let newFormat = format.replace(literal, ($0, $1) => {
        literals.push(regexEscape($1));
        return "@@@";
    });
    const specifiedFields = {};
    const requiredFields = {};
    // Change every token that we find into the correct regex
    newFormat = regexEscape(newFormat).replace(token, $0 => {
        const info = parseFlags[$0];
        const [field, regex, , requiredField] = info;
        // Check if the person has specified the same field twice. This will lead to confusing results.
        if (specifiedFields[field]) {
            throw new Error(`Invalid format. ${field} specified twice in format`);
        }
        specifiedFields[field] = true;
        // Check if there are any required fields. For instance, 12 hour time requires AM/PM specified
        if (requiredField) {
            requiredFields[requiredField] = true;
        }
        parseInfo.push(info);
        return "(" + regex + ")";
    });
    // Check all the required fields are present
    Object.keys(requiredFields).forEach(field => {
        if (!specifiedFields[field]) {
            throw new Error(`Invalid format. ${field} is required in specified format`);
        }
    });
    // Add back all the literals after
    newFormat = newFormat.replace(/@@@/g, () => literals.shift());
    // Check if the date string matches the format. If it doesn't return null
    const matches = dateStr.match(new RegExp(newFormat, "i"));
    if (!matches) {
        return null;
    }
    const combinedI18nSettings = assign(assign({}, globalI18n), i18n);
    // For each match, call the parser function for that date part
    for (let i = 1; i < matches.length; i++) {
        const [field, , parser] = parseInfo[i - 1];
        const value = parser
            ? parser(matches[i], combinedI18nSettings)
            : +matches[i];
        // If the parser can't make sense of the value, return null
        if (value == null) {
            return null;
        }
        dateInfo[field] = value;
    }
    if (dateInfo.isPm === 1 && dateInfo.hour != null && +dateInfo.hour !== 12) {
        dateInfo.hour = +dateInfo.hour + 12;
    }
    else if (dateInfo.isPm === 0 && +dateInfo.hour === 12) {
        dateInfo.hour = 0;
    }
    const dateWithoutTZ = new Date(dateInfo.year, dateInfo.month, dateInfo.day, dateInfo.hour, dateInfo.minute, dateInfo.second, dateInfo.millisecond);
    const validateFields = [
        ["month", "getMonth"],
        ["day", "getDate"],
        ["hour", "getHours"],
        ["minute", "getMinutes"],
        ["second", "getSeconds"]
    ];
    for (let i = 0, len = validateFields.length; i < len; i++) {
        // Check to make sure the date field is within the allowed range. Javascript dates allows values
        // outside the allowed range. If the values don't match the value was invalid
        if (specifiedFields[validateFields[i][0]] &&
            dateInfo[validateFields[i][0]] !== dateWithoutTZ[validateFields[i][1]]()) {
            return null;
        }
    }
    if (dateInfo.timezoneOffset == null) {
        return dateWithoutTZ;
    }
    return new Date(Date.UTC(dateInfo.year, dateInfo.month, dateInfo.day, dateInfo.hour, dateInfo.minute - dateInfo.timezoneOffset, dateInfo.second, dateInfo.millisecond));
}
export default {
    format,
    parse,
    defaultI18n,
    setGlobalDateI18n,
    setGlobalDateMasks
};
export { format, parse, defaultI18n, setGlobalDateI18n, setGlobalDateMasks };
