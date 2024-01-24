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
export class QueryManager {
    qid$ = 0;
    qmaster$ = null;
    running$ = new Map();
    getQueryID() {
        return this.qid$;
    }
    startNewChain() {
        this.qid$ = this.qid$ + 1;
        return this.qid$;
    }
    stopAllQueries() {
        this.startNewChain();
    }
    setRunning(block, qid) {
        this.running$.set(block, qid);
    }
    getRunning(block) {
        return (this.running$.get(block));
    }
    hasRunning() {
        let active = false;
        this.running$.forEach((qid) => { if (qid)
            active = true; });
        return (active);
    }
    get QueryMaster() {
        return (this.qmaster$);
    }
    set QueryMaster(qmaster) {
        this.qmaster$ = qmaster;
    }
    static sleep(ms) {
        return (new Promise(resolve => setTimeout(resolve, ms)));
    }
}
