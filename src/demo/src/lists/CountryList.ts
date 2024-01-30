import { FormsModule } from "../FormsModule";
import { BindValue, ListOfValues, QueryTable } from "forms42core";

export class CountryList extends ListOfValues
{
	public title:string = "Countries";

	public datasource: Countries;
	public bindvalue: BindValue;

	public sourcefields: string;
	public targetfields: string;
	public displayfields: string[];

	public inQueryMode:boolean = true;
	public inReadOnlyMode:boolean = true;
	public filterInitialValueFrom = "country_id";

	constructor()
	{
		super();

		this.datasource = new Countries();
		this.bindvalue = this.datasource.country;

		this.sourcefields = "country_id";
		this.targetfields = "country_id";
		this.displayfields = ["country_id","country_name"];
	}
}

class Countries extends QueryTable
{
	public country:BindValue = new BindValue("country","");

	constructor()
	{
		super(FormsModule.DATABASE);

		this.sql =
		`
			/* Oracle doesn't have ilike */
			select country_id, country_name from countries
			where upper(country_id||' '||country_name) like upper('%'||:country||'%')
		`;

		this.sorting = "country_id";
		this.addBindValue(this.country);
	}
}