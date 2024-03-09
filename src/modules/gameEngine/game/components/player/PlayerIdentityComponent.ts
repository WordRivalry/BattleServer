import {Component} from "../../../ecs/components/Component";

export class PlayerIdentityComponent extends Component {
    constructor(
        public playerUUID: string,
        public username: string
    ) {
        super();
    }
}