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
import { Like } from "./Like.js";
import { ILike } from "./ILike.js";
import { AnyOf } from "./AnyOf.js";
import { Equals } from "./Equals.js";
import { IsNull } from "./IsNull.js";
import { NoneOf } from "./NoneOf.js";
import { Between } from "./Between.js";
import { LessThan } from "./LessThan.js";
import { Contains } from "./Contains.js";
import { SubQuery } from "./SubQuery.js";
import { GreaterThan } from "./GreaterThan.js";
import { DateInterval } from "./DateInterval.js";
/**
 * Filters is a key component when communicating with a backend.
 * This is just a convinience class gathering all basic filters into one common entry.
 */
export class Filters {
    static Like(column) { return (new Like(column)); }
    ;
    static AnyOf(column) { return (new AnyOf(column)); }
    ;
    static ILike(column) { return (new ILike(column)); }
    ;
    static Equals(column) { return (new Equals(column)); }
    ;
    static NoneOf(column) { return (new NoneOf(column)); }
    ;
    static IsNull(column) { return (new IsNull(column)); }
    ;
    static Contains(columns) { return (new Contains(columns)); }
    ;
    static SubQuery(columns) { return (new SubQuery(columns)); }
    ;
    static DateInterval(column) { return (new DateInterval(column)); }
    ;
    static LessThan(column, incl) { return (new LessThan(column, incl)); }
    ;
    static Between(column, incl) { return (new Between(column, incl)); }
    ;
    static GreaterThan(column, incl) { return (new GreaterThan(column, incl)); }
    ;
}
