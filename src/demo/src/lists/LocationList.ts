import { FormsModule } from "../FormsModule";
import { BindValue, ListOfValues, QueryTable } from "forms42core";

export class LocationList extends ListOfValues
{
	public title:string = "Locations";

	public datasource: Locations;
	public bindvalue: BindValue;

	public sourcefields: string;
	public targetfields: string;
	public displayfields: string[];

	public inQueryMode:boolean = true;
	public inReadOnlyMode:boolean = true;

	constructor()
	{
		super();

		this.datasource = new Locations();
		this.bindvalue = this.datasource.loc;

		this.sourcefields = "loc_id";
		this.targetfields = "loc_id";
		this.displayfields = ["city","street_address"];
	}
}

class Locations extends QueryTable
{
	public loc:BindValue = new BindValue("loc","");

	constructor()
	{
		super(FormsModule.DATABASE);

		this.sql =
		`
			select loc_id, city, street_address from locations
			where upper(city||' '||street_address) like upper('%'||:loc||'%')
		`;

		this.sorting = "city,street_address";
		this.addBindValue(this.loc);
	}
}