import {Component} from "../../../ecs/components/Component";


export class ReconnectionTimoutComponent extends Component {
    public timeRemaining: number = 0;

    constructor(public timeout: number) {
        super();
        this.timeRemaining = timeout;
    }
}