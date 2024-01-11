import { FormsModule } from "../FormsModule";
import { BindValue, ListOfValues, QueryTable } from "forms42core";

export class DepartmentsList extends ListOfValues
{
	public title:string = "Departments";

	public bindvalue: BindValue;
	public datasource: Departments;

	public sourcefields: string;
	public targetfields: string;
	public displayfields: string;

	public inQueryMode:boolean = true;
	public inReadOnlyMode:boolean = true;

	constructor()
	{
		super();
		
		this.datasource = new Departments();
		this.bindvalue = this.datasource.department;

		this.sourcefields = "department_id";
		this.targetfields = "department_id";
		this.displayfields = "department_name";
	}
}

class Departments extends QueryTable
{
	public department:BindValue = new BindValue("department","");

	constructor()
	{
		super(FormsModule.DATABASE);

		this.sql =
		`
			select department_id, department_name from departments
			where department_name ilike '%'||:department||'%'
		`;

		this.sorting = "department_id";
		this.addBindValue(this.department);
	}
}