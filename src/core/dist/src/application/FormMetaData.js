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
import { FormBacking } from "./FormBacking.js";
import { isClass } from '../public/Class.js';
export class FormMetaData {
    static metadata = new Map();
    static lsnrevents$ = new Map();
    static blockevents$ = new Map();
    static cleanup(form) {
        let meta = FormMetaData.metadata.get(form.constructor.name);
        if (meta != null) {
            meta.blockattrs.forEach((_block, attr) => { form[attr] = null; });
            FormBacking.getModelForm(form).getBlocks().forEach((blk) => { blk.reset(meta.blocksources$.get(blk.name) != null); });
        }
    }
    static setBlockEvent(block, method, filter) {
        let events = FormMetaData.blockevents$.get(block.constructor);
        if (events == null) {
            events = [];
            FormMetaData.blockevents$.set(block.constructor, events);
        }
        events.push(new BlockEvent(method, filter));
    }
    static getBlockEvents(block) {
        let events = FormMetaData.blockevents$.get(block.constructor);
        if (events == null)
            events = [];
        return (events);
    }
    static setListenerEvent(lsnr, method, filter) {
        let events = FormMetaData.lsnrevents$.get(lsnr.constructor);
        if (events == null) {
            events = [];
            FormMetaData.lsnrevents$.set(lsnr.constructor, events);
        }
        events.push(new BlockEvent(method, filter));
    }
    static getListenerEvents(lsnr) {
        let events = FormMetaData.lsnrevents$.get(lsnr.constructor);
        if (events == null)
            events = [];
        return (events);
    }
    static get(form, create) {
        let name = null;
        if (isClass(form))
            name = form.name;
        else
            name = form.constructor.name;
        let meta = FormMetaData.metadata.get(name);
        if (meta == null && create) {
            meta = new FormMetaData();
            FormMetaData.metadata.set(name, meta);
        }
        return (meta);
    }
    blockattrs = new Map();
    formevents = new Map();
    blocksources$ = new Map();
    getDataSources() {
        let sources = new Map();
        this.blocksources$.forEach((source, block) => {
            if (!isClass(source))
                sources.set(block, source);
            else
                sources.set(block, new source());
        });
        return (sources);
    }
    addDataSource(block, source) {
        this.blocksources$.set(block?.toLowerCase(), source);
    }
    getDataSource(block) {
        block = block?.toLowerCase();
        let source = this.blocksources$.get(block);
        if (source && isClass(source)) {
            source = new source();
            this.blocksources$.set(block, source);
        }
        return source;
    }
}
export class BlockEvent {
    method;
    filter;
    constructor(method, filter) {
        this.method = method;
        this.filter = filter;
    }
}
