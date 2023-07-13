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

export class Departments
{
	public static columns:string[] =
	[
		"department_id","department_name","manager_id","location_id"
	];

	public static get data() : any[][]
	{
		return(Departments.rawdata);
	}

	private static rawdata:any[][] =
	[
		[10    , "Administration"       , 200    , 1700],
		[20    , "Marketing"            , 201    , 1800],
		[30    , "Purchasing"           , 114    , 1700],
		[40    , "Human Resources"      , 203    , 2400],
		[50    , "Shipping"             , 121    , 1500],
		[60    , "IT"                   , 103    , 1400],
		[70    , "Public Relations"     , 204    , 2700],
		[80    , "Sales"                , 145    , 2500],
		[90    , "Executive"            , 100    , 1700],
		[100   , "Finance"              , 108    , 1700],
		[110   , "Accounting"           , 205    , 1700],
		[120   , "Treasury"             , null   , 1700],
		[130   , "Corporate Tax"        , null   , 1700],
		[140   , "Control And Credit"   , null   , 1700],
		[150   , "Shareholder Services" , null   , 1700],
		[160   , "Benefits"             , null   , 1700],
		[170   , "Manufacturing"        , null   , 1700],
		[180   , "Construction"         , null   , 1700],
		[190   , "Contracting"          , null   , 1700],
		[200   , "Operations"           , null   , 1700],
		[210   , "IT Support"           , null   , 1700],
		[220   , "NOC"                  , null   , 1700],
		[230   , "IT Helpdesk"          , null   , 1700],
		[240   , "Government Sales"     , null   , 1700],
		[250   , "Retail Sales"         , null   , 1700],
		[260   , "Recruiting"           , null   , 1700],
		[270   , "Payroll"              , null   , 1700]
	]
}