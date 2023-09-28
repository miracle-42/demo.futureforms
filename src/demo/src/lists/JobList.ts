import { FormsModule } from "../FormsModule";
import { BindValue, ListOfValues, QueryTable } from "forms42core";

export class JobList implements ListOfValues
{
	public title:string = "Jobs";

	public datasource: Jobs;
	public bindvalue: BindValue;

	public sourcefields: string;
	public targetfields: string;
	public displayfields: string[];

	public inQueryMode:boolean = true;
	public inReadOnlyMode:boolean = true;

	constructor()
	{
		this.datasource = new Jobs();
		this.bindvalue = this.datasource.job;

		this.sourcefields = "job_id";
		this.targetfields = "job_id";
		this.displayfields = ["job_title"];
	}
}

class Jobs extends QueryTable
{
	public job:BindValue = new BindValue("job","");

	constructor()
	{
		super(FormsModule.DATABASE);

		this.sql =
		`
			select job_id, job_title from jobs
			where job_id||' '||job_title ilike '%'||:job||'%'
		`;

		this.sorting = "job_title";
		this.addBindValue(this.job);
	}
}