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

export interface LOVFilterPreProcessor
{
    (filter?:string) : string;
}


export interface ListOfValues
{
	rows?:number;
	width?:string;
	title?:string;
	cssclass?:string;

	inQueryMode?:boolean;
	inReadOnlyMode?:boolean;

	datasource:DataSource;
	filter?:Filter|Filter[];
	bindvalue?:BindValue|BindValue[];

	filterCase?:Case;
	filterPrefix?:string;
	filterPostfix?:string;
	filterMinLength?:number;
	filterInitialValueFrom?:string;
	filterPreProcesser?:LOVFilterPreProcessor;

	sourcefields:string|string[];
	targetfields:string|string[];
	displayfields:string|string[];
}