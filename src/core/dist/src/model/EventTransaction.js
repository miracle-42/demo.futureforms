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
export class EventTransaction {
    transactions = new Map();
    start(event, block, record) {
        let running = this.getTrxSlot(block);
        if (running)
            return (running);
        this.transactions.set(block?.name, new Transaction(event, block, record));
        return (null);
    }
    running() {
        return (this.transactions.size);
    }
    clear() {
        this.transactions.clear();
    }
    finish(block) {
        this.transactions.delete(block?.name);
    }
    getEvent(block) {
        return (this.transactions.get(block?.name)?.event);
    }
    getRecord(block) {
        return (this.transactions.get(block?.name)?.record);
    }
    getTrxSlot(block) {
        let trx = this.transactions.get(block?.name);
        return (trx?.event);
    }
}
class Transaction {
    block = null;
    record = null;
    event = null;
    constructor(event, block, record) {
        this.event = event;
        this.block = block;
        this.record = record;
    }
}
