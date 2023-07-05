import content from './Employees.html';

import { Employees } from '../datasources/database/Employees';
import { EventType, FilterStructure, Form, FormEvent, ILike, Key, datasource, formevent } from 'forms42core';


@datasource("employees",Employees)

export class Lesson01 extends Form
{
    constructor()
    {
        super(content);

        let master:Key = new Key("ctrl","id");
        let detail:Key = new Key("employees","department_id");

        this.link(master,detail);
    }


    @formevent({type: EventType.PostViewInit})
    public async init() : Promise<boolean>
    {
        this.getView().style.top = "30px";
		this.getView().style.left = "30px";
        return(true);
    }


    private last:string = null;
    @formevent({type: EventType.OnEdit, block: "ctrl", field: "name"})
    public async postchange() : Promise<boolean>
    {
        setTimeout(() =>
        {
            let name:string = this.getValue("ctrl","name");
            if (name != this.last) this.reQuery("employees");
        } , 300);

        return(true);
    }


    @formevent({type: EventType.PreQuery})
    public async prequery() : Promise<boolean>
    {
        let name:string = this.getValue("ctrl","name");
        this.getBlock("employees").filter.delete("employee_name");

        if (name)
        {
            let lname:ILike = new ILike("last_name").setConstraint("%"+name+"%");
            let fname:ILike = new ILike("first_name").setConstraint("%"+name+"%");
            let filter:FilterStructure = new FilterStructure().and(fname).or(lname);
            this.getBlock("employees").filter.and(filter,"employee_name");
        }

        this.last = name;
        return(true);
    }
}