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
 * List of values
 */
export class ListOfValues {
    title; /** Window title */
    rows; /** The number of rows to display */
    width; /** Width of the display fields */
    cssclass; /** CSS class to apply */
    inQueryMode; /** Use in Query By Example mode */
    inReadOnlyMode; /** Use even if field is readonly */
    datasource; /** The datasource providing the data */
    filter; /** Filters to apply when user restricts query */
    bindvalue; /** BindValues to apply when user restricts query */
    filterCase; /** Control the casing of the user input */
    filterPrefix; /** Prefix to query-string e.g % */
    filterPostfix; /** Postfix to query-string e.g % */
    filterMinLength; /** Minimum length of query-string before query the datasource */
    filterInitialValueFrom; /** Use value of a given field as initial filter */
    filterPreProcesser; /** Function to format the query-string if advanced */
    sourcefields; /** The fields from the datasource */
    targetfields; /** The fields in the target form */
    displayfields; /** The fields to display in the form */
}
