import content from './MasterDetail.html';

import { Jobs } from '../../datasources/database/Jobs';
import { Employees } from '../../datasources/database/Employees';
import { Departments } from '../../datasources/database/Departments';

import { Block, DatabaseResponse, EventType, Form, FormEvent, Key, datasource, formevent } from 'forms42core';


@datasource("employees", Employees)
@datasource("departments", Departments)

export class Lesson02 extends Form
{
	private emp:Block = null;
	private dept:Block = null;

	constructor()
	{
		super(content);

		let empkey:Key = new Key("employees","department_id");
		let deptkey:Key = new Key("departments","department_id");

		this.link(deptkey,empkey);
	}


	//@formevent()
	public async showAllEvents(event:FormEvent) : Promise<boolean>
	{
		let dest:string = "";
		if (event.block) dest = " "+event.block;
		if (event.field) dest += "."+event.field;
		console.log(EventType[event.type]+dest);
		return(true);
	}


	@formevent({type: EventType.PostViewInit})
	public async init(): Promise<boolean>
	{
		this.getView().style.top = "30px";
		this.getView().style.left = "30px";

		this.emp = this.getBlock("employees");
		this.dept = this.getBlock("departments");

		return (true);
	}


	@formevent({type: EventType.PostInsert, block: "employees"})
	public async setPrimaryKey() : Promise<boolean>
	{
		let response:DatabaseResponse = this.emp.getRecord().response;
		this.emp.setValue("employee_id",response.getValue("employee_id"));

		console.log("setPrimaryKey "+this.emp.getValue("employee_id"));
		return(true);
	}

	@formevent({type: EventType.WhenValidateField, block: "employees", field: "job_id"})
	public async validateJob() : Promise<boolean>
	{
		console.log("Validate Job");

		let jobid:string = this.emp.getValue("job_id");
		let title:string = await Jobs.getTitle(jobid);

		this.emp.setValue("job_title",title);

		if (!title)
		{
			this.warning("Unknown job '"+jobid+"'","Validate Job");
			return(false);
		}

		return(true);
	}


	@formevent({type: EventType.WhenValidateField, block: "employees"})
	public async validateSalary(event:FormEvent) : Promise<boolean>
	{
		if (event.field != "salary" && event.field != "job_id")
			return(true);

		console.log("Validate Salary");

		let code:string = this.emp.getValue("job_id");
		let salary:number = this.emp.getValue("salary");

		if (code == null || salary == null)
			return(true);

		let limit:number[] = await Jobs.getSalaryLimit(code);

		if (salary < limit[0]*0.75 || salary > 1.25*limit[1])
		{
			this.warning("Salary is out of range ("+(limit[0]*0.75)+" - "+(1.25*limit[1])+" ) ","Validate Salary");
			return(false);
		}

		if (salary < limit[0] || salary > limit[1])
		{
			this.warning("Salary should be between "+limit[0]+" and "+limit[1],"Validate Salary");

			this.emp.getRecord().setStyle("salary","color","deeppink");
			this.emp.getRecord().setStyle("last_name","color","deeppink");
			this.emp.getRecord().setStyle("first_name","color","deeppink");
		}
		else
		{
			this.emp.getRecord().clearProperties("salary");
			this.emp.getRecord().clearProperties("last_name");
			this.emp.getRecord().clearProperties("first_name");
		}

		return(true);
	}
}