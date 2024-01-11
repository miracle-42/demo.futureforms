import { FormsModule } from "../FormsModule";
import { BindValue, ListOfValues, QueryTable } from "forms42core";

export class ManagerList extends ListOfValues
{
	public title:string = "Employees";

	public bindvalue: BindValue;
	public datasource: Employees;

	public sourcefields: string;
	public targetfields: string;
	public displayfields: string[];

	public inQueryMode:boolean = true;
	public inReadOnlyMode:boolean = true;

	constructor()
	{
		super();

		this.datasource = new Employees();
		this.bindvalue = this.datasource.emp;

		this.targetfields = "manager_id";
		this.sourcefields = "employee_id";
		this.displayfields = ["first_name","last_name"];
	}
}

class Employees extends QueryTable
{
	public emp:BindValue = new BindValue("emp","");

	constructor()
	{
		super(FormsModule.DATABASE);

		this.sql =
		`
			select employee_id, first_name, last_name from employees
			where first_name||' '||last_name ilike '%'||:emp||'%'
		`;

		this.sorting = "first_name, last_name";
		this.addBindValue(this.emp);
	}
}