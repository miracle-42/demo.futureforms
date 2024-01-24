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
export var EventType;
(function (EventType) {
    EventType[EventType["Key"] = 0] = "Key";
    EventType[EventType["Mouse"] = 1] = "Mouse";
    EventType[EventType["Custom"] = 2] = "Custom";
    EventType[EventType["WhenMenuBlur"] = 3] = "WhenMenuBlur";
    EventType[EventType["WhenMenuFocus"] = 4] = "WhenMenuFocus";
    EventType[EventType["Connect"] = 5] = "Connect";
    EventType[EventType["Disconnect"] = 6] = "Disconnect";
    EventType[EventType["PreCommit"] = 7] = "PreCommit";
    EventType[EventType["PostCommit"] = 8] = "PostCommit";
    EventType[EventType["PreRollback"] = 9] = "PreRollback";
    EventType[EventType["PostRollback"] = 10] = "PostRollback";
    EventType[EventType["OnLockRecord"] = 11] = "OnLockRecord";
    EventType[EventType["OnRecordLocked"] = 12] = "OnRecordLocked";
    EventType[EventType["OnTransaction"] = 13] = "OnTransaction";
    EventType[EventType["OnNewForm"] = 14] = "OnNewForm";
    EventType[EventType["OnCloseForm"] = 15] = "OnCloseForm";
    EventType[EventType["OnFormEnabled"] = 16] = "OnFormEnabled";
    EventType[EventType["OnFormDisabled"] = 17] = "OnFormDisabled";
    EventType[EventType["PostViewInit"] = 18] = "PostViewInit";
    EventType[EventType["PostCloseForm"] = 19] = "PostCloseForm";
    EventType[EventType["PreForm"] = 20] = "PreForm";
    EventType[EventType["PostForm"] = 21] = "PostForm";
    EventType[EventType["PreBlock"] = 22] = "PreBlock";
    EventType[EventType["PostBlock"] = 23] = "PostBlock";
    EventType[EventType["PreRecord"] = 24] = "PreRecord";
    EventType[EventType["PostRecord"] = 25] = "PostRecord";
    EventType[EventType["OnRecord"] = 26] = "OnRecord";
    EventType[EventType["PreField"] = 27] = "PreField";
    EventType[EventType["PostField"] = 28] = "PostField";
    EventType[EventType["PostChange"] = 29] = "PostChange";
    EventType[EventType["OnEdit"] = 30] = "OnEdit";
    EventType[EventType["WhenValidateField"] = 31] = "WhenValidateField";
    EventType[EventType["OnFetch"] = 32] = "OnFetch";
    EventType[EventType["PreQuery"] = 33] = "PreQuery";
    EventType[EventType["PostQuery"] = 34] = "PostQuery";
    EventType[EventType["OnCreateRecord"] = 35] = "OnCreateRecord";
    EventType[EventType["PreInsert"] = 36] = "PreInsert";
    EventType[EventType["PostInsert"] = 37] = "PostInsert";
    EventType[EventType["PreUpdate"] = 38] = "PreUpdate";
    EventType[EventType["PostUpdate"] = 39] = "PostUpdate";
    EventType[EventType["PreDelete"] = 40] = "PreDelete";
    EventType[EventType["PostDelete"] = 41] = "PostDelete";
    EventType[EventType["WhenValidateRecord"] = 42] = "WhenValidateRecord";
})(EventType || (EventType = {}));
export class EventGroup {
    types;
    static FormEvents = new EventGroup([
        EventType.PreForm,
        EventType.PostForm,
        EventType.PostViewInit,
        EventType.PostCloseForm,
    ]);
    static ApplEvents = new EventGroup([
        EventType.Connect,
        EventType.Disconnect,
        EventType.PreCommit,
        EventType.PostCommit,
        EventType.PreRollback,
        EventType.PostRollback,
        EventType.OnTransaction,
    ]);
    constructor(types) {
        this.types = types;
    }
    has(type) {
        return (this.types.includes(type));
    }
}
