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
	Form triggers fire in context of a form and block.
	Triggers fires first at field level, then block and form level.

	Two or more form triggers cannot run simultaneously in that context.
	E.G. you cannot delete a row while navigating in the same block.

	A few select triggers are considered safe for further action.

	Triggers that fire before anything else happens in the form I.E. onNewForm and PostViewInit.
	And PostChange, that fires after everything else when modifying a field.


	In general if a trigger returns false, execution stops. On top of this

	On-triggers prevents the event to happen.
	When-triggers marks the row/field invalid.


	Non form triggers like PreCommit is not restricted, but should be used with great care.
*/

export enum EventType
{
	Key,
	Mouse,
	Custom,

	WhenMenuBlur,
	WhenMenuFocus,

	Connect,
	Disconnect,

	PreCommit,
	PostCommit,

	PreRollback,
	PostRollback,

	OnLockRecord,
	OnRecordLocked,

	OnTransaction,

	OnNewForm,
	OnCloseForm,

	OnFormEnabled,
	OnFormDisabled,

	PostViewInit,
	PostCloseForm,

	PreForm,
	PostForm,

	PreBlock,
	PostBlock,

	PreRecord,
	PostRecord,

	OnRecord,

	PreField,
	PostField,
	PostChange,

	OnEdit,
	WhenValidateField,

	OnFetch,
	PreQuery,
	PostQuery,

	OnCreateRecord,

	PreInsert,
	PostInsert,

	PreUpdate,
	PostUpdate,

	PreDelete,
	PostDelete,

	WhenValidateRecord
}

export class EventGroup
{
	private types:EventType[];

	public static FormEvents:EventGroup = new EventGroup
	([
		EventType.PreForm,
		EventType.PostForm,
		EventType.PostViewInit,
		EventType.PostCloseForm,
	]);

	public static ApplEvents:EventGroup = new EventGroup
	([
		EventType.Connect,
		EventType.Disconnect,
		EventType.PreCommit,
		EventType.PostCommit,
		EventType.PreRollback,
		EventType.PostRollback,
		EventType.OnTransaction,
	]);

	constructor(types:EventType[])
	{
		this.types = types;
	}

	public has(type:EventType) : boolean
	{
		return(this.types.includes(type));
	}
}