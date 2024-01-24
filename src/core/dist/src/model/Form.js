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
import { DataModel } from './DataModel.js';
import { MSGGRP } from '../messages/Internal.js';
import { Messages } from '../messages/Messages.js';
import { Logger, Type } from '../application/Logger.js';
import { EventTransaction } from './EventTransaction.js';
import { QueryManager } from './relations/QueryManager.js';
import { EventType } from '../control/events/EventType.js';
import { FormBacking } from '../application/FormBacking.js';
import { FormEvents } from '../control/events/FormEvents.js';
import { FormMetaData } from '../application/FormMetaData.js';
import { BlockCoordinator } from './relations/BlockCoordinator.js';
export class Form {
    block$ = null;
    viewfrm$ = null;
    finalized$ = false;
    parent$ = null;
    datamodel$ = new DataModel();
    qrymgr$ = new QueryManager();
    blocks$ = new Map();
    evttrans$ = new EventTransaction();
    blkcord$ = new BlockCoordinator(this);
    constructor(parent) {
        this.parent$ = parent;
        FormBacking.setModelForm(parent, this);
        this.viewfrm$ = FormBacking.getViewForm(this.parent, true);
        Logger.log(Type.formbinding, "Create modelform: " + this.parent.name);
    }
    get name() {
        return (this.parent.name);
    }
    get block() {
        return (this.block$);
    }
    get view() {
        return (this.viewfrm$);
    }
    get parent() {
        return (this.parent$);
    }
    set dirty(flag) {
        let blocks = Array.from(this.blocks$.values());
        for (let i = 0; i < blocks.length; i++)
            blocks[i].dirty = flag;
    }
    get dirty() {
        let blocks = Array.from(this.blocks$.values());
        for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].dirty)
                return (true);
        }
        return (false);
    }
    get finalized() {
        return (this.finalized$);
    }
    get QueryManager() {
        return (this.qrymgr$);
    }
    get BlockCoordinator() {
        return (this.blkcord$);
    }
    getDirtyCount() {
        let dirty = 0;
        let blocks = Array.from(this.blocks$.values());
        for (let i = 0; i < blocks.length; i++)
            dirty += blocks[i].getDirtyCount();
        return (dirty);
    }
    synchronize() {
        this.blocks$.forEach((block) => { block.wrapper.setSynchronized(); });
    }
    async undo() {
        let dirty = [];
        let requery = new Set();
        let blocks = Array.from(this.blocks$.values());
        for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].dirty) {
                dirty.push(blocks[i]);
                if (!await blocks[i].undo(false))
                    return (false);
            }
        }
        // Only requery top-level blocks
        for (let i = 0; i < dirty.length; i++)
            requery.add(dirty[i]);
        for (let i = 0; i < dirty.length; i++) {
            this.blkcord$.getDetailBlocks(dirty[i], true).forEach((detail) => {
                if (!detail.ctrlblk)
                    requery.delete(detail);
            });
        }
        dirty = [...requery];
        for (let i = 0; i < dirty.length; i++) {
            if (!dirty[i].ctrlblk) {
                if (!dirty[i].queried)
                    await dirty[i].clear(false);
                else
                    await this.executeQuery(dirty[i], true, false);
            }
        }
        return (true);
    }
    clear() {
        let blocks = Array.from(this.blocks$.values());
        for (let i = 0; i < blocks.length; i++) {
            blocks[i].dirty = false;
            if (!blocks[i].ctrlblk)
                blocks[i].wrapper.clear(false);
        }
    }
    async flush() {
        let blocks = Array.from(this.blocks$.values());
        for (let i = 0; i < blocks.length; i++) {
            if (!await blocks[i].flush())
                return (false);
        }
        return (true);
    }
    getBlocks() {
        let blocks = [];
        this.blocks$.forEach((block) => { blocks.push(block); });
        return (blocks);
    }
    getBlock(name) {
        return (this.blocks$.get(name));
    }
    get datamodel() {
        return (this.datamodel$);
    }
    setDataSource(blk, source) {
        let block = this.getBlock(blk);
        if (block)
            block.datasource = source;
        else
            this.datamodel.setDataSource(blk, source);
    }
    get eventTransaction() {
        return (this.evttrans$);
    }
    hasEventTransaction(block) {
        return (this.eventTransaction.getEvent(block) != null);
    }
    async checkEventTransaction(event, block) {
        let running = this.eventTransaction.getTrxSlot(block);
        if (running) {
            // cannot start transaction
            if (!block)
                Messages.severe(MSGGRP.FRAMEWORK, 9, this.name, EventType[event], EventType[running]);
            else
                Messages.severe(MSGGRP.FRAMEWORK, 10, this.name, EventType[event], block.name, EventType[running]);
            return (false);
        }
        return (true);
    }
    async setEventTransaction(event, block, record) {
        let running = this.eventTransaction.start(event, block, record);
        if (running) {
            // cannot start transaction
            if (!block)
                Messages.severe(MSGGRP.FRAMEWORK, 9, this.name, EventType[event], EventType[running]);
            else
                Messages.severe(MSGGRP.FRAMEWORK, 10, this.name, EventType[event], block.name, EventType[running]);
            return (false);
        }
        return (true);
    }
    endEventTransaction(_event, block, _success) {
        this.eventTransaction.finish(block);
    }
    addBlock(block) {
        this.datamodel$.setWrapper(block);
        this.blocks$.set(block.name, block);
        Logger.log(Type.formbinding, "Add block '" + block.name + "' to modelform: " + this.parent.name);
    }
    async finalize() {
        let meta = FormMetaData.get(this.parent);
        meta?.formevents.forEach((filter, method) => {
            let handle = FormEvents.addListener(this.parent, this.parent, method, filter);
            FormBacking.getBacking(this.parent).listeners.push(handle);
        });
        meta?.getDataSources().forEach((source, block) => {
            let blk = this.getBlock(block);
            if (blk != null)
                blk.datasource = source;
        });
        this.blocks$.forEach((block) => { block.finalize(); });
        meta?.blockattrs.forEach((block, attr) => { this.parent[attr] = this.parent.getBlock(block); });
        FormBacking.getBacking(this.parent).links.
            forEach((link) => this.BlockCoordinator.link(link));
        this.blocks$.forEach((block) => {
            FormMetaData.getBlockEvents(block.pubblk).forEach((event) => {
                if (!event.filter)
                    event.filter = {};
                if (!Array.isArray(event.filter))
                    event.filter = [event.filter];
                for (let i = 0; i < event.filter.length; i++)
                    event.filter[i].block = block.name;
                let handle = FormEvents.addListener(this.parent, block.pubblk, event.method, event.filter);
                FormBacking.getBacking(this.parent).listeners.push(handle);
            });
        });
        this.blocks$.forEach((block) => { block.addColumns(this.BlockCoordinator.getLinkedColumns(block)); });
        await this.initControlBlocks();
        this.finalized$ = true;
    }
    getQueryMaster() {
        return (this.qrymgr$.QueryMaster);
    }
    async enterQuery(block) {
        if (typeof block === "string")
            block = this.getBlock(block);
        if (block.ctrlblk)
            return (false);
        if (block.querymode)
            return (true);
        this.QueryManager.stopAllQueries();
        while (this.QueryManager.hasRunning()) {
            await QueryManager.sleep(10);
            // Wait for stale query to finish displaying rows
        }
        if (!block.view.validated) {
            if (!await block.view.validate())
                return (false);
        }
        await this.flush();
        if (!this.blkcord$.allowQueryMode(block))
            return (false);
        if (!block.view.hasQueryableFields())
            return (false);
        this.clearDetailDepencies(block);
        let inst = this.view.current;
        if (inst) {
            inst.blur(true);
            if (!await this.view.leaveField(inst))
                return (false);
            if (!await this.view.leaveRecord(inst.field.block))
                return (false);
        }
        await this.enterQueryMode(block);
        inst = block.view.getQBEInstance(inst);
        if (!inst)
            inst = block.view.findFirstEditable(block.qberec);
        if (inst) {
            inst.focus(true);
            block.view.form.current = null;
            if (!await this.view.enterRecord(inst.field.block, 0))
                return (false);
            if (!await this.view.enterField(inst, 0))
                return (false);
        }
        block.view.current = inst;
        block.view.form.current = inst;
        await this.view.onRecord(block.view);
        return (true);
    }
    clearBlock(block) {
        block.queried = false;
        block.view.clear(true, true, true);
        let blocks = this.blkcord$.getDetailBlocks(block, true);
        for (let i = 0; i < blocks.length; i++)
            this.clearBlock(blocks[i]);
    }
    clearQueryFilters(block) {
        block.qberec.clear();
        block.QueryFilter.clear();
        let blocks = this.blkcord$.getDetailBlocks(block, true);
        for (let i = 0; i < blocks.length; i++)
            this.clearQueryFilters(blocks[i]);
    }
    clearDetailDepencies(block) {
        block.DetailFilter.clear();
        let blocks = this.blkcord$.getDetailBlocks(block, true);
        for (let i = 0; i < blocks.length; i++)
            this.clearDetailDepencies(blocks[i]);
    }
    async enterQueryMode(block) {
        if (!await block.enterQuery())
            return;
        let blocks = this.blkcord$.getDetailBlocks(block, false);
        for (let i = 0; i < blocks.length; i++) {
            if (this.blkcord$.allowMasterLess(block, blocks[i]))
                await this.enterQueryMode(blocks[i]);
        }
    }
    cancelQueryMode(block) {
        if (typeof block === "string")
            block = this.getBlock(block);
        block.view.cancel();
        let blocks = this.blkcord$.getDetailBlocks(block, false);
        for (let i = 0; i < blocks.length; i++) {
            if (this.blkcord$.allowMasterLess(block, blocks[i]))
                this.cancelQueryMode(blocks[i]);
        }
    }
    async queryFieldDetails(block, field) {
        let blk = this.getBlock(block);
        let qryid = this.QueryManager.startNewChain();
        let blocks = this.blkcord$.getDetailBlocksForField(blk, field);
        for (let i = 0; i < blocks.length; i++) {
            blocks[i].executeQuery(qryid);
            let filters = false;
            if (!blocks[i].QueryFilter.empty)
                filters = true;
            if (!blocks[i].DetailFilter.empty)
                filters = true;
            this.view.setFilterIndicator(blocks[i], filters);
        }
        return (true);
    }
    async executeQuery(block, keep, flush) {
        if (typeof block === "string")
            block = this.getBlock(block);
        if (block == null)
            return (false);
        if (block.ctrlblk)
            return (false);
        if (!block.view.validated) {
            if (!await block.view.validate())
                return (false);
        }
        let inst = this.view.current;
        let init = inst?.field.block.model == block;
        if (flush)
            await this.flush();
        if (init) {
            if (!await this.view.leaveField())
                return (false);
            if (!await this.view.leaveRecord(block.view))
                return (false);
        }
        if (block.querymode) {
            block = this.blkcord$.getQueryMaster(block);
        }
        else {
            if (!keep) {
                this.clearQueryFilters(block);
                this.clearDetailDepencies(block);
            }
        }
        this.qrymgr$.QueryMaster = block;
        let blocks = block.getAllDetailBlocks(true);
        for (let i = 0; i < blocks.length; i++)
            blocks[i].view.clear(true, true, true);
        for (let i = blocks.length - 1; i >= 0; i--) {
            if (!await blocks[i].preQuery())
                return (false);
        }
        for (let i = 0; i < blocks.length; i++) {
            if (!await blocks[i].setDetailDependencies())
                return (false);
            let filters = false;
            if (!blocks[i].QueryFilter.empty)
                filters = true;
            if (!blocks[i].DetailFilter.empty)
                filters = true;
            this.view.setFilterIndicator(blocks[i], filters);
        }
        if (init && inst) {
            inst.blur(true);
            this.view.current = null;
        }
        let success = await block.executeQuery(this.qrymgr$.startNewChain());
        if (!success)
            return (false);
        for (let i = blocks.length - 1; i >= 0; i--) {
            if (!await blocks[i].postQuery()) {
                success = false;
                break;
            }
        }
        if (init) {
            if (!await this.view.enterRecord(block.view, 0))
                return (success);
            if (await this.view.enterField(inst, 0)) {
                if (block.getRecord())
                    success = await this.view.onRecord(inst?.field.block);
            }
            // Make sure onRecord doesn't fire twice
            if (inst)
                inst.field.block.current = inst;
        }
        if (init && inst && inst.field.row.exist) {
            inst.focus(true);
            this.view.current = inst;
        }
        return (success);
    }
    async initControlBlocks() {
        for (let block of this.blocks$.values()) {
            if (block.datasource == null) {
                block.datasource = block.createMemorySource();
                block.ctrlblk = true;
                await block.executeQuery(null);
            }
        }
    }
    clearEventTransactions() {
        this.eventTransaction.clear();
    }
}
