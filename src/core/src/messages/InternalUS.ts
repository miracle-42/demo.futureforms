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

import { MSGGRP } from "./Internal.js";
import { Group } from "./interfaces/Group.js";
import { Bundle } from "./interfaces/Bundle.js";
import { Message } from "./interfaces/Message.js";


export class InternalUS implements Bundle
{
	public lang:string = "US";
	public name:string = "Internal";

	public groups: Group[] =
	[
		{grpno: MSGGRP.SQL, title: "Database"},
		{grpno: MSGGRP.TRX, title: "Transaction"},
		{grpno: MSGGRP.ORDB, title: "OpenRestDB"},
		{grpno: MSGGRP.FORM, title: "Form Failure"},
		{grpno: MSGGRP.BLOCK, title: "Block/Section"},
		{grpno: MSGGRP.FIELD, title: "HTML Field tag"},
		{grpno: MSGGRP.FRAMEWORK, title: "FutureForms"},
		{grpno: MSGGRP.VALIDATION, title: "Validation"},
	];

	public messages: Message[] =
	[
		{grpno: MSGGRP.TRX, errno: 1,  message: "Transactions successfully comitted"},
		{grpno: MSGGRP.TRX, errno: 2,  message: "Failed to push transactions to backend"},
		{grpno: MSGGRP.TRX, errno: 3,  message: "Failed to undo transactions for form '%'"},
		{grpno: MSGGRP.TRX, errno: 4,  message: "Failed to roll back transactions"},
		{grpno: MSGGRP.TRX, errno: 5,  message: "Transactions successfully rolled back"},
		{grpno: MSGGRP.TRX, errno: 6,  message: "Maximum number of locks reached. Transaction will be rolled back in % seconds"},
		{grpno: MSGGRP.TRX, errno: 7,  message: "Transaction is being rolled back"},
		{grpno: MSGGRP.TRX, errno: 8,  message: "Transaction will be rolled back in % seconds"},
		{grpno: MSGGRP.TRX, errno: 9,  message: "Record has been changed by another user '%'"},
		{grpno: MSGGRP.TRX, errno: 10, message: "Record at row % has been changed by another user"},
		{grpno: MSGGRP.TRX, errno: 11, message: "Record has been delete by another user"},
		{grpno: MSGGRP.TRX, errno: 12, message: "Record is locked by another user"},
		{grpno: MSGGRP.TRX, errno: 13, message: "Record at row % is locked by another user"},
		{grpno: MSGGRP.TRX, errno: 14, message: "Cannot lock records on datasource based on a query"},
		{grpno: MSGGRP.TRX, errno: 15, message: "Cannot insert records on datasource based on a query"},
		{grpno: MSGGRP.TRX, errno: 16, message: "Cannot update records on datasource based on a query"},
		{grpno: MSGGRP.TRX, errno: 17, message: "Cannot delete records on datasource based on a query"},

		{grpno: MSGGRP.SQL, errno: 1, message: "Record has been deleted by another user"},
		{grpno: MSGGRP.SQL, errno: 2, message: "Unable to describe table '%' [%]"},
		{grpno: MSGGRP.SQL, errno: 3, message: "Unable to describe query '%'"},

		{grpno: MSGGRP.ORDB, errno: 1, message: "Connection scope cannot be changed after connect"},
		{grpno: MSGGRP.ORDB, errno: 2, message: "Failed to create %, connection is null"},
		{grpno: MSGGRP.ORDB, errno: 3, message: "% Not connected"},

		{grpno: MSGGRP.FRAMEWORK, errno:  1, message: "Attribute '%' on component '%' is null"},
		{grpno: MSGGRP.FRAMEWORK, errno:  2, message: "Attribute '%' on component '%' does not exist"},
		{grpno: MSGGRP.FRAMEWORK, errno:  3, message: "Invoking method '%' on component '%' failed with %s"},
		{grpno: MSGGRP.FRAMEWORK, errno:  4, message: "Cannot find '%' on this or parent elements"},
		{grpno: MSGGRP.FRAMEWORK, errno:  5, message: "Use of @formevent on non compatable class '%'"},
		{grpno: MSGGRP.FRAMEWORK, errno:  6, message: "% returned %"},
		{grpno: MSGGRP.FRAMEWORK, errno:  7, message: "EventListner '%' did not return Promise<boolean>, but '%'"},
		{grpno: MSGGRP.FRAMEWORK, errno:  8, message: "EventListner '%' did not return boolean, but '%'"},
		{grpno: MSGGRP.FRAMEWORK, errno:  9, message: "Form '%', cannot start transaction % while running %"},
		{grpno: MSGGRP.FRAMEWORK, errno: 10, message: "Form '%', cannot start transaction % in '%' while running %"},
		{grpno: MSGGRP.FRAMEWORK, errno: 11, message: "Token '%' is not supported in default format"},
		{grpno: MSGGRP.FRAMEWORK, errno: 12, message: "Date delimitors can only be 1 character"},
		{grpno: MSGGRP.FRAMEWORK, errno: 13, message: "Relation '%' -> '%' is self referencing"},
		{grpno: MSGGRP.FRAMEWORK, errno: 14, message: "Invalid key definition, block: 'null'"},
		{grpno: MSGGRP.FRAMEWORK, errno: 15, message: "Invalid key definition, fields: 'null'"},
		{grpno: MSGGRP.FRAMEWORK, errno: 16, message: "During transaction % only current record can be accessed"},
		{grpno: MSGGRP.FRAMEWORK, errno: 17, message: "Sendkey unable to locate field or block %"},
		{grpno: MSGGRP.FRAMEWORK, errno: 18, message: "Class % is not an instance of DataMapper"},
		{grpno: MSGGRP.FRAMEWORK, errno: 19, message: "% is mapped to a class"},
		{grpno: MSGGRP.FRAMEWORK, errno: 20, message: "% is cannot be parsed as a valid date"},

		{grpno: MSGGRP.FORM, errno: 1, message: "Block '%' does not exist"},
		{grpno: MSGGRP.FORM, errno: 2, message: "Form must be validated before layout can be changed"},
		{grpno: MSGGRP.FORM, errno: 3, message: "Replacing view will remove all event listeners"},
		{grpno: MSGGRP.FORM, errno: 4, message: "ListOfValues does not exist"},
		{grpno: MSGGRP.FORM, errno: 5, message: "No datasource defined in ListOfValues"},
		{grpno: MSGGRP.FORM, errno: 6, message: "No display fields defined in ListOfValues"},

		{grpno: MSGGRP.BLOCK, errno: 1, message: "Block '%', Has no insertable fields"},
		{grpno: MSGGRP.BLOCK, errno: 2, message: "Block '%', Cannot navigate to record"},
		{grpno: MSGGRP.BLOCK, errno: 3, message: "Block '%', Waiting for previous query to finish"},
		{grpno: MSGGRP.BLOCK, errno: 4, message: "Block '%', Datasource is lacking"},

		{grpno: MSGGRP.FIELD, errno: 1, message: "'%', Data type cannot be changed"},
	];
}
