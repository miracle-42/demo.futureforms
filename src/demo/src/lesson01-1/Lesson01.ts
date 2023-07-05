import content from './Employees.html';

import { Employees } from '../datasources/database/Employees';
import { EventType, Form, Key, datasource, formevent } from 'forms42core';


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
}