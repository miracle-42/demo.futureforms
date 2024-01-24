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
import { Block } from "../Block.js";
import { MSGGRP } from "../../messages/Internal.js";
import { Messages } from "../../messages/Messages.js";
export class BlockCoordinator {
    form;
    constructor(form) {
        this.form = form;
    }
    blocks$ = new Map();
    getQueryMaster(block) {
        let master = block;
        let masters = this.getMasterBlocks(block);
        for (let i = 0; i < masters.length; i++) {
            if (masters[i].querymode)
                master = this.getQueryMaster(masters[i]);
        }
        return (master);
    }
    allowQueryMode(block) {
        let masters = this.getMasterBlocks(block);
        for (let i = 0; i < masters.length; i++) {
            if (masters[i].querymode) {
                let rel = this.findRelation(masters[i].name, block.name);
                let master = this.getBlock(rel.master.block);
                if (master?.querymode && !rel.orphanQueries)
                    return (false);
            }
            else if (masters[i].empty) {
                return (false);
            }
        }
        return (true);
    }
    getMasterBlock(link) {
        return (this.getBlock(link.master.block));
    }
    getDetailBlock(link) {
        return (this.getBlock(link.detail.block));
    }
    getDetailBlocks(block, all) {
        let blocks = [];
        this.blocks$.get(block.name)?.details.forEach((link) => {
            let block = this.getBlock(link.detail.block);
            if (block == null)
                return ([]);
            if (all || link.orphanQueries)
                blocks.push(block);
        });
        return (blocks);
    }
    getMasterBlocks(block) {
        let blocks = [];
        if (block == null) {
            this.blocks$.forEach((dep, blk) => {
                if (dep.masters.length == 0) {
                    let master = this.getBlock(blk);
                    if (master != null)
                        blocks.push(master);
                }
            });
        }
        else {
            this.blocks$.get(block.name)?.masters.forEach((link) => {
                let master = this.getBlock(link.master.block);
                if (master != null)
                    blocks.push(master);
            });
        }
        return (blocks);
    }
    getDetailBlocksForField(block, field) {
        let blocks = [];
        this.blocks$.get(block.name)?.getFieldRelations(field)?.
            forEach((rel) => blocks.push(this.getBlock(rel.detail.block)));
        return (blocks);
    }
    getMasterLinks(block) {
        let blocks = [];
        this.blocks$.get(block.name)?.masters.forEach((link) => {
            let block = this.getBlock(link.master.block);
            if (block == null)
                return ([]);
            blocks.push(link);
        });
        return (blocks);
    }
    getDetailLinks(block) {
        let blocks = [];
        this.blocks$.get(block.name)?.details.forEach((link) => {
            let block = this.getBlock(link.master.block);
            if (block == null)
                return ([]);
            blocks.push(link);
        });
        return (blocks);
    }
    allowMasterLess(master, detail) {
        if (master == detail)
            return (true);
        return (this.findRelation(master.name, detail.name)?.orphanQueries);
    }
    findRelation(master, detail) {
        if (master instanceof Block)
            master = master.name;
        if (detail instanceof Block)
            detail = detail.name;
        let details = this.blocks$.get(master).details;
        for (let i = 0; i < details.length; i++) {
            if (details[i].detail.block == detail)
                return (details[i]);
        }
        return (null);
    }
    link(link) {
        if (link.detail.block == link.master.block) {
            // Self referencing
            Messages.severe(MSGGRP.FRAMEWORK, 13, link.master.name, link.detail.name);
            return;
        }
        let dependency = null;
        dependency = this.blocks$.get(link.master.block);
        if (dependency == null) {
            dependency = new Dependency(link.master.block);
            this.blocks$.set(dependency.block, dependency);
        }
        dependency.link(link);
        dependency = this.blocks$.get(link.detail.block);
        if (dependency == null) {
            dependency = new Dependency(link.detail.block);
            this.blocks$.set(dependency.block, dependency);
        }
        dependency.link(link);
    }
    getBlock(name) {
        let block = this.form.getBlock(name);
        if (block == null) {
            // Block does not exist
            Messages.severe(MSGGRP.FORM, 1, name);
            return (null);
        }
        return (block);
    }
    getLinkedColumns(block) {
        let fields = new Set();
        this.getDetailLinks(block)?.forEach((rel) => {
            rel.master.fields.forEach((fld) => { fields.add(fld); });
        });
        this.getMasterLinks(block)?.forEach((rel) => {
            rel.detail.fields.forEach((fld) => { fields.add(fld); });
        });
        return (Array.from(fields));
    }
}
class Dependency {
    block;
    constructor(block) {
        this.block = block;
    }
    masters$ = new Map();
    details$ = new Map();
    fldmap$ = new Map();
    get details() {
        let links = Array.from(this.details$.values());
        return (links != null ? links : []);
    }
    get masters() {
        let links = Array.from(this.masters$.values());
        return (links != null ? links : []);
    }
    getFieldRelations(field) {
        return (this.fldmap$.get(field));
    }
    link(link) {
        if (link.detail.block == this.block) {
            this.masters$.set(link.master.block, link);
        }
        else {
            let links = null;
            this.details$.set(link.detail.block, link);
            link.master.fields.forEach((fld) => {
                links = this.fldmap$.get(fld);
                if (links == null) {
                    links = [];
                    this.fldmap$.set(fld, links);
                }
                links.push(link);
            });
        }
    }
}
