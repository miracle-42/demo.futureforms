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

/*
	OBS !!
	Pre- On- and When- cannot start new transaction in same block
*/

export enum EventType
{
	Key,
	Mouse,

	PreCommit,
	PostCommit,

	PreRollback,
	PostRollback,

	OnTransaction,

	Connect,
	Disconnect,

	onNewForm,
	OnCloseForm,

	PostViewInit,
	PostFormFocus,
	PostCloseForm,

	PreForm,
	PostForm,

	PreBlock,
	PostBlock,

	PreRecord,
	PostRecord,

	OnRecord,
	OnNewRecord,

	PreField,
	PostField,

	OnEdit,
	WhenValidateField,

	OnFetch,
	PreQuery,
	PostQuery,

	PreInsert,
	PostInsert,

	PreUpdate,
	PostUpdate,

	PreDelete,
	PostDelete,

	OnLockRecord,
	OnRecordLocked,
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
		EventType.PostFormFocus,
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