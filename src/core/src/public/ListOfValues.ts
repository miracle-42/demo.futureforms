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

import { Case } from "./Case.js";
import { BindValue } from "../database/BindValue.js";
import { Filter } from "../model/interfaces/Filter.js";
import { DataSource } from "../model/interfaces/DataSource.js";

/**
 * Function that preprocesses user input
 * before applying it to the LOV query
 */
export interface LOVFilterPreProcessor
{
    (filter?:string) : string;
}


/**
 * List of values
 */
export class ListOfValues
{
	title:string; 											/** Window title */

	rows?:number; 											/** The number of rows to display */
	width?:string; 										/** Width of the display fields */
	cssclass?:string; 									/** CSS class to apply */

	inQueryMode?:boolean;								/** Use in Query By Example mode */
	inReadOnlyMode?:boolean; 							/** Use even if field is readonly */

	datasource:DataSource; 								/** The datasource providing the data */
	filter?:Filter|Filter[]; 							/** Filters to apply when user restricts query */
	bindvalue?:BindValue|BindValue[]; 				/** BindValues to apply when user restricts query */

	filterCase?:Case; 									/** Control the casing of the user input */
	filterPrefix?:string; 								/** Prefix to query-string e.g % */
	filterPostfix:string; 								/** Postfix to query-string e.g % */
	filterMinLength:number; 							/** Minimum length of query-string before query the datasource */
	filterInitialValueFrom:string; 					/** Use value of a given field as initial filter */
	filterPreProcesser:LOVFilterPreProcessor; 	/** Function to format the query-string if advanced */

	sourcefields:string|string[]; 					/** The fields from the datasource */
	targetfields:string|string[]; 					/** The fields in the target form */
	displayfields:string|string[]; 					/** The fields to display in the form */
}