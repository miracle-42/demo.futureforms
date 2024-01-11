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

import { KeyCodes } from "./KeyCodes.js";
import { Class } from "../../public/Class.js";
import { BrowserEvent } from "./BrowserEvent.js";


/**
 * Map over key events
 * Can be overridden by application
 */
export class KeyMap
{
	public static copy:KeyMap = new KeyMap({key: 'c', ctrl: true});
	public static undo:KeyMap = new KeyMap({key: 'z', ctrl: true});
	public static paste:KeyMap = new KeyMap({key: 'v', ctrl: true});

	public static dump:KeyMap = new KeyMap({key: KeyCodes.f12, shift: true}, "debug", "Debug");
	public static now:KeyMap = new KeyMap({key: ' ', ctrl: true}, "now", "Todays date");

	public static commit:KeyMap = new KeyMap({key: KeyCodes.f10},"commit","commit all transactions");
	public static rollback:KeyMap = new KeyMap({key: KeyCodes.f12},"rollback","rollback all transactions");
	public static refresh:KeyMap = new KeyMap({key: 'u', ctrl: true}, "refresh","Refresh value from backend");

	public static clearblock:KeyMap = new KeyMap({key: KeyCodes.f4},"clear block","clear block");
	public static clearform:KeyMap = new KeyMap({key: KeyCodes.f4, shift: true},"clear form","clear form");

	public static enterquery:KeyMap = new KeyMap({key: KeyCodes.f7},"enter query","start query by example mode");
	public static executequery:KeyMap = new KeyMap({key: KeyCodes.f8},"execute query","execute query");
	public static lastquery:KeyMap = new KeyMap({key: KeyCodes.f7, shift: true},"last query","recall last query");
	public static queryeditor:KeyMap = new KeyMap({key: KeyCodes.f7, ctrl: true},"advanced query","enter advanced query criterias");

	public static space:KeyMap = new KeyMap({key: ' '});
	public static enter:KeyMap = new KeyMap({key: KeyCodes.Enter});
	public static escape:KeyMap = new KeyMap({key: KeyCodes.Escape});

	public static pageup:KeyMap = new KeyMap({key: KeyCodes.ArrowUp, shift:true},"previous page","scroll up");
	public static pagedown:KeyMap = new KeyMap({key: KeyCodes.ArrowDown, shift:true},"next page","scroll down");

	public static nextfield:KeyMap = new KeyMap({key: KeyCodes.Tab});
	public static prevfield:KeyMap = new KeyMap({key: KeyCodes.Tab, shift: true});

	public static prevrecord:KeyMap = new KeyMap({key: KeyCodes.ArrowUp});
	public static nextrecord:KeyMap = new KeyMap({key: KeyCodes.ArrowDown});

   public static prevblock:KeyMap = new KeyMap({key: KeyCodes.PageUp},"previous block","go to previous block");
	public static nextblock:KeyMap = new KeyMap({key: KeyCodes.PageDown},"next block","go to next block");

	public static delete:KeyMap = new KeyMap({key: KeyCodes.f6},"delete","delete record");

	public static insert:KeyMap = new KeyMap({key: KeyCodes.Enter, shift: true},"insert","insert record");
	public static insertAbove:KeyMap = new KeyMap({key: KeyCodes.Enter, ctrl: true},"insert above","insert record above the current");

	public static lov:KeyMap = new KeyMap({key: KeyCodes.f9},"list of values","show valid values");
	public static calendar:KeyMap = new KeyMap({key: KeyCodes.f9},"datepicker","show datepicker");

	public static from(key:string) : KeyMap
	{
		return(KeyMap[key]);
	}

	public static list(map?:Class<any>) : string[][]
	{
		let list:string[][] = [];

		if (!map) map = KeyMap;
		else list = KeyMap.list();

		Object.keys(map).forEach((mapped) =>
		{
			if (map[mapped] != null && (map[mapped] instanceof KeyMap))
			{
				if (map[mapped].name && map[mapped].desc)
				{
					let key:string[] = [];
					key.push(map[mapped].toString());
					key.push(map[mapped].name);
					key.push(map[mapped].desc);
					list.push(key);
				}
			}
		});

		list.sort((k0,k1) =>
		{
			if (k0[1] > k1[1]) return(1);
			if (k0[1] < k1[1]) return(-1);
			return(0);
		})

		let unique:string[][] = [];

		list.forEach((entry) =>
		{
			let len:number = unique.length;
			let last:string = len > 0 ? unique[len-1][1] : null;
			if (entry[1] != last) unique.push(entry);
		})

		return(unique);
	}

	private key$:string;
	private name$:string;
	private desc$:string;
	private alt$:boolean;
	private ctrl$:boolean;
	private meta$:boolean;
	private shift$:boolean;

	private signature$:string = null;

	public constructor(def:KeyDefinition, name?:string, desc?:string)
	{
		if (def == null)
			return;

		if (def.shift == null)
		{
			if (def.key == def.key.toUpperCase() && def.key != def.key.toLowerCase())
				def.shift = true;
		}

		this.name = name;
		this.desc = desc;

		this.key$ = def.key.toLowerCase();

		this.alt$ = (def.alt ? true : false);
		this.ctrl$ = (def.ctrl ? true : false);
		this.meta$ = (def.meta ? true : false);
		this.shift$ = (def.shift ? true : false);

		this.signature$ = ""+this.key$ + "|";

		this.signature$ += (this.alt$   ? 't' : 'f');
		this.signature$ += (this.ctrl$  ? 't' : 'f');
		this.signature$ += (this.meta$  ? 't' : 'f');
		this.signature$ += (this.shift$ ? 't' : 'f');
	}

	public get name() : string
	{
		return(this.name$);
	}

	public set name(name:string)
	{
		this.name$ = name;
	}

	public get desc() : string
	{
		return(this.desc$);
	}

	public set desc(desc:string)
	{
		this.desc$ = desc;
	}

	public get key() : string
	{
		return(this.key$);
	}

	public get alt() : boolean
	{
		return(this.alt$);
	}

	public get ctrl() : boolean
	{
		return(this.ctrl$);
	}

	public get meta() : boolean
	{
		return(this.meta$);
	}

	public get shift() : boolean
	{
		return(this.shift$);
	}

	public get signature() : string
	{
		return(this.signature$);
	}

	public get definition() : KeyDefinition
	{
		let def:KeyDefinition =
		{
			key: this.key$,
			alt:	this.alt$,
			ctrl:	this.ctrl$,
			meta: this.meta$,
			shift: this.shift$
		}

		return(def);
	}

	public setSignature(def:KeyDefinition) : void
	{
		this.key$ = def.key;
		this.alt$ = def.alt;
		this.ctrl$ = def.ctrl;
		this.meta$ = def.meta;
		this.shift$ = def.shift;

		this.signature$ = ""+this.key$ + "|";

		this.signature$ += (this.alt$   ? 't' : 'f');
		this.signature$ += (this.ctrl$  ? 't' : 'f');
		this.signature$ += (this.meta$  ? 't' : 'f');
		this.signature$ += (this.shift$ ? 't' : 'f');
	}

	public toString() : string
	{
		let str:string = "";

		if (this.ctrl$)
			str += "ctrl";

		if (this.alt$)
		{
			if (str.length > 0) str += " + ";
			str += "alt";
		}

		if (this.shift$)
		{
			if (str.length > 0) str += " + ";
			str += "shift";
		}

		if (this.meta$)
		{
			if (str.length > 0) str += " + ";
			str += "meta";
		}

		if (str.length > 0)
			str += " ";

		if (this.key$ == ' ') str += "space";
		else str += this.key$;

		return(str);
	}
}

/**
 * Data describing a key event
 */
export interface KeyDefinition
{
	key:string;
	alt?:boolean;
	ctrl?:boolean;
	meta?:boolean;
	shift?:boolean;
}

export class KeyMapping
{
	private static map:Map<string,KeyMap> = null;

	public static init() : void
	{
		KeyMapping.map = new Map<string,KeyMap>();

		Object.keys(KeyMap).forEach((mapped) =>
		{
			if (KeyMap[mapped] != null && (KeyMap[mapped] instanceof KeyMap))
				KeyMapping.add(KeyMap[mapped]);
		});
	}

	public static update(map:Class<KeyMap>) : void
	{
		Object.keys(map).forEach((mapped) =>
		{
			if (map[mapped] != null && (map[mapped] instanceof KeyMap))
			{
				let existing:KeyMap = KeyMapping.get(KeyMap[mapped]?.signature);

				if (existing == null) KeyMapping.add(map[mapped]);
				else
				{
					let def:KeyDefinition =
						map[mapped].definition;

					map[mapped] = existing;
					KeyMapping.remove(existing);

					existing.setSignature(def);
					KeyMapping.add(existing);
				}
			}
		});
	}

	public static isRowNav(key:KeyMap) : boolean
	{
		switch(key)
		{
			case KeyMap.prevfield : return(true);
			case KeyMap.nextfield : return(true);
			default 			  		 : return(false);
		}
	}

	public static isBlockNav(key:KeyMap) : boolean
	{
		switch(key)
		{
			case KeyMap.pageup 	  : return(true);
			case KeyMap.pagedown   : return(true);
			case KeyMap.prevrecord : return(true);
			case KeyMap.nextrecord : return(true);
			default 			   	  : return(false);
		}
	}

	public static isFormNav(key:KeyMap) : boolean
	{
		switch(key)
		{
			case KeyMap.prevblock : return(true);
			case KeyMap.nextblock : return(true);
			default 			  		 : return(false);
		}
	}

	public static add(keymap:KeyMap) : void
	{
		if (keymap != null && KeyMapping.map.get(keymap.signature) == null)
			KeyMapping.map.set(keymap.signature,keymap);
	}

	public static remove(keymap:KeyMap) : void
	{
		KeyMapping.map.delete(keymap.signature);
	}

	public static get(signature:string, validated?:boolean) : KeyMap
	{
		if (!signature)
			return(null);

		if (!validated)
			signature = KeyMapping.complete(signature);

		let key:KeyMap = KeyMapping.map.get(signature);

		if (key == null) key = KeyMapping.create(signature);
		return(key);
	}

	public static parseBrowserEvent(event:BrowserEvent) : KeyMap
	{
		if (event.key == null) return(null);
		let key:string = event.key.toLowerCase();

		let signature:string = key+"|";
		signature += event.alt ? 't' : 'f';
		signature += event.ctrl ? 't' : 'f';
		signature += event.meta ? 't' : 'f';
		signature += event.shift ? 't' : 'f';

		return(KeyMapping.get(signature,true));
	}

	private static complete(signature:string) : string
	{
		let pos:number = signature.indexOf('|');

		if (pos <= 0)
		{
			signature += "|";
			pos = signature.length - 1;
		}

		while(signature.length - pos < 5)
			signature += 'f';

		return(signature);
	}

	private static create(signature:string) : KeyMap
	{
		let pos:number = signature.indexOf('|');
		let key:string = signature.substring(0,pos);

		let a:string = signature.substring(pos+1,pos+2);
		let c:string = signature.substring(pos+2,pos+3);
		let m:string = signature.substring(pos+3,pos+4);
		let s:string = signature.substring(pos+4,pos+5);

		let def:KeyDefinition =
		{
			key: key,
			alt: (a == 't' ? true : false),
			ctrl: (c == 't' ? true : false),
			meta: (m == 't' ? true : false),
			shift: (s == 't' ? true : false),
		};

		let keymap:KeyMap = new KeyMap(def);
		KeyMapping.map.set(keymap.signature,keymap);

		return(keymap);
	}
}