import { FormsModule } from "../FormsModule";
import { BindValue, Filter, FilterStructure, Filters, ListOfValues, DatabaseTable } from "forms42core";

export class CountryList2 implements ListOfValues
{
	public title:string = "Countries";

	public filter:Filter[];
	public datasource:Countries;

	public filterPrefix:string = "%";
	public filterPostfix:string = "%";

	public sourcefields: string;
	public targetfields: string;
	public displayfields: string[];

	public inQueryMode:boolean = true;
	public inReadOnlyMode:boolean = true;
	public filterInitialValueFrom = "country_id";

	constructor()
	{
		this.datasource = new Countries();

		this.sourcefields = "country_id";
		this.targetfields = "country_id";
		this.displayfields = ["country_id","country_name"];

		let where:FilterStructure = null;

		let filter1:Filter = Filters.ILike("country_id");
		let filter2:Filter = Filters.ILike("country_name");

		where = new FilterStructure().and(filter1).or(filter2);
		this.datasource.addFilter(where);

		this.filter = [filter1,filter2];
	}
}

class Countries extends DatabaseTable
{
	constructor()
	{
		super(FormsModule.DATABASE,"countries");
		this.sorting = "country_id";
	}
}