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
 * Javascript doesn't have a lot of datatypes which often causes
 * problems with e.g databases. DataType is used for specifying the
 * mapping to a data type on the backend.
 */
export var DataType;
(function (DataType) {
    DataType[DataType["int"] = 0] = "int";
    DataType[DataType["integer"] = 1] = "integer";
    DataType[DataType["smallint"] = 2] = "smallint";
    DataType[DataType["long"] = 3] = "long";
    DataType[DataType["float"] = 4] = "float";
    DataType[DataType["double"] = 5] = "double";
    DataType[DataType["number"] = 6] = "number";
    DataType[DataType["numeric"] = 7] = "numeric";
    DataType[DataType["decimal"] = 8] = "decimal";
    DataType[DataType["date"] = 9] = "date";
    DataType[DataType["datetime"] = 10] = "datetime";
    DataType[DataType["timestamp"] = 11] = "timestamp";
    DataType[DataType["string"] = 12] = "string";
    DataType[DataType["varchar"] = 13] = "varchar";
    DataType[DataType["varchar2"] = 14] = "varchar2";
    DataType[DataType["text"] = 15] = "text";
    DataType[DataType["boolean"] = 16] = "boolean";
})(DataType || (DataType = {}));
