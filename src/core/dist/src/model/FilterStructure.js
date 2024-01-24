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
 * Filters is a key component when communicating with a backend.
 *
 * A FilterStructure is a tree like collection of filters. It embraces
 * the where-clause in sql.
 */
export class FilterStructure {
    name = null;
    entries$ = [];
    fieldidx$ = new Map();
    filteridx$ = new Map();
    constructor(name) {
        this.name = name;
    }
    get empty() {
        return (this.getFilters().length == 0);
    }
    size() {
        return (this.entries$.length);
    }
    getName(filter) {
        let cstr = this.filteridx$.get(filter);
        return (cstr.name);
    }
    clone() {
        let clone = new FilterStructure();
        for (let i = 0; i < this.entries$.length; i++) {
            let cstr = this.entries$[i];
            if (cstr.isFilter()) {
                if (cstr.and)
                    clone.and(cstr.filter.clone(), cstr.name);
                else
                    clone.or(cstr.filter.clone(), cstr.name);
            }
            else {
                if (cstr.and)
                    clone.and(cstr.getFilterStructure().clone(), cstr.name);
                else
                    clone.or(cstr.getFilterStructure().clone(), cstr.name);
            }
        }
        return (clone);
    }
    hasChildFilters() {
        for (let i = 0; i < this.entries$.length; i++) {
            if (this.entries$[i].isFilter())
                return (true);
        }
        return (false);
    }
    clear(name) {
        if (name == null) {
            this.entries$ = [];
            this.fieldidx$.clear();
            this.filteridx$.clear();
        }
        else {
            this.delete(name);
        }
    }
    or(filter, name) {
        if (filter == this)
            return;
        if (!(filter instanceof FilterStructure) && name == null)
            name = filter.getBindValueName();
        this.delete(name);
        if (!this.filteridx$.has(filter)) {
            let cstr = new Constraint(false, filter, name);
            if (name)
                this.fieldidx$.set(name.toLowerCase(), cstr);
            this.filteridx$.set(filter, cstr);
            this.entries$.push(cstr);
        }
        return (this);
    }
    and(filter, name) {
        if (filter == this)
            return;
        if (!(filter instanceof FilterStructure) && name == null)
            name = filter.getBindValueName();
        this.delete(name);
        if (!this.filteridx$.has(filter)) {
            let cstr = new Constraint(true, filter, name);
            if (name)
                this.fieldidx$.set(name.toLowerCase(), cstr);
            this.filteridx$.set(filter, cstr);
            this.entries$.push(cstr);
        }
        return (this);
    }
    get(field) {
        return (this.fieldidx$.get(field?.toLowerCase())?.filter);
    }
    getFilter(field) {
        let constr = this.fieldidx$.get(field?.toLowerCase());
        if (!constr || !constr.isFilter())
            return (null);
        return constr.filter;
    }
    getFilterStructure(field) {
        let constr = this.fieldidx$.get(field?.toLowerCase());
        if (!constr || constr.isFilter())
            return (null);
        return constr.filter;
    }
    delete(filter) {
        let found = false;
        for (let i = 0; i < this.entries$.length; i++) {
            if (!this.entries$[i].isFilter()) {
                if ((this.entries$[i].getFilterStructure()).delete(filter))
                    found = true;
            }
        }
        if (typeof filter === "string")
            filter = this.get(filter);
        let cstr = this.filteridx$.get(filter);
        if (cstr != null) {
            let pos = this.entries$.indexOf(cstr);
            if (pos >= 0) {
                found = true;
                this.entries$.splice(pos, 1);
                this.filteridx$.delete(filter);
                this.fieldidx$.delete(cstr.name);
            }
        }
        return (found);
    }
    async evaluate(record) {
        let match = true;
        for (let i = 0; i < this.entries$.length; i++) {
            if (match && this.entries$[i].or)
                continue;
            if (!match && this.entries$[i].and)
                continue;
            match = await this.entries$[i].matches(record);
        }
        return (match);
    }
    asSQL() {
        return (this.build(0));
    }
    getBindValues() {
        let bindvalues = [];
        let filters = this.getFilters();
        filters.forEach((filter) => bindvalues.push(...filter.getBindValues()));
        return (bindvalues);
    }
    build(clauses) {
        let stmt = "";
        let first = true;
        for (let i = 0; i < this.entries$.length; i++) {
            let constr = this.entries$[i];
            if (constr.filter instanceof FilterStructure) {
                if (constr.filter.hasChildFilters()) {
                    let clause = constr.filter.build(clauses);
                    if (clause != null && clause.length > 0) {
                        if (clauses > 0)
                            stmt += " " + constr.opr + " ";
                        stmt += "(" + clause + ")";
                        first = false;
                        clauses++;
                    }
                }
                else {
                    let clause = constr.filter.build(clauses);
                    if (clause != null && clause.length > 0) {
                        clauses++;
                        stmt += clause;
                    }
                }
            }
            else {
                let clause = constr.filter.asSQL();
                if (clause != null && clause.length > 0) {
                    if (!first)
                        stmt += " " + constr.opr + " ";
                    stmt += clause;
                    first = false;
                    clauses++;
                }
            }
        }
        return (stmt);
    }
    getFilters(start) {
        let filters = [];
        if (start == null)
            start = this;
        for (let i = 0; i < start.entries$.length; i++) {
            if (start.entries$[i].isFilter()) {
                filters.push(start.entries$[i].filter);
            }
            else {
                filters.push(...this.getFilters(start.entries$[i].filter));
            }
        }
        return (filters);
    }
    printable() {
        let name = null;
        let p = new Printable();
        for (let i = 0; i < this.entries$.length; i++) {
            name = this.entries$[i].name;
            if (name == null)
                name = this.name;
            if (this.entries$[i].isFilter()) {
                p.entries.push({ name: name, filter: this.entries$[i].filter.toString() });
            }
            else {
                let sub = this.entries$[i].getFilterStructure();
                p.entries.push({ name: name, sub: sub.printable() });
            }
        }
        return (p);
    }
    toString() {
        return (this.asSQL());
    }
}
class Constraint {
    and$;
    filter;
    name;
    constructor(and$, filter, name) {
        this.and$ = and$;
        this.filter = filter;
        this.name = name;
    }
    get or() {
        return (!this.and$);
    }
    get and() {
        return (this.and$);
    }
    get opr() {
        if (this.and)
            return ("and");
        return ("or");
    }
    isFilter() {
        return (!(this.filter instanceof FilterStructure));
    }
    getFilter() {
        return this.filter;
    }
    getFilterStructure() {
        return this.filter;
    }
    async matches(record) {
        return (this.filter.evaluate(record));
    }
}
export class Printable {
    entries = [];
}
