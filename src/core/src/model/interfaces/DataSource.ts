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

import { Filter } from './Filter.js';
import { Record } from '../Record.js';
import { FilterStructure } from '../FilterStructure.js';

/** Lock strategy */
export enum LockMode
{
	None,
	Optimistic,
	Pessimistic
}

/**
 * Definition of a datasource.
 * Any class implementing this interface
 * can be used as a datasource.
 */
export interface DataSource
{
	name:string;
	sorting:string;
	columns:string[];
	arrayfecth:number;

	rowlocking:LockMode;
	queryallowed:boolean;
	insertallowed:boolean;
	updateallowed:boolean;
	deleteallowed:boolean;
	transactional:boolean;

	clear() : void;
	clone() : DataSource;
	undo() : Promise<Record[]>;
	fetch() : Promise<Record[]>;
	flush() : Promise<Record[]>;
	closeCursor() : Promise<boolean>;
	lock(record:Record) : Promise<boolean>;
	insert(record:Record) : Promise<boolean>;
	update(record:Record) : Promise<boolean>;
	delete(record:Record) : Promise<boolean>;
	refresh(record:Record) : Promise<boolean>;
	query(filters?:FilterStructure) : Promise<boolean>;

	getFilters() : FilterStructure;
	addColumns(columns:string|string[]) : DataSource;
	removeColumns(columns:string|string[]) : DataSource;
	addFilter(filter:Filter|FilterStructure) : DataSource;
}