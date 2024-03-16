import {Component} from "../../../ecs/components/Component";


export class GameIdentityComponent extends Component {
    public uuid: string;

    constructor(uuid: string) {
        super();
        this.uuid = uuid;
    }
}