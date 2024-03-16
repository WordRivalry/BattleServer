// PlayerIdentityComponent.ts
import {Component} from "../Component";
import {createScopedLogger} from "../../../logger/logger";

export class PlayerIdentityComponent extends Component {
    private logger = createScopedLogger('PlayerIdentityComponent')
    constructor(
        public playerUUID: string,
        public username: string
    ) {
        super();
        this.logger.debug(`PlayerIdentityComponent created for player ${username} with UUID ${playerUUID}`)
    }
}