// IdentityComponent.ts
import {Component} from "../Component";
import {createScopedLogger} from "../../../logger/logger";

export class IdentityComponent extends Component {
    private logger = createScopedLogger('PlayerIdentityComponent')
    constructor(
        public identity: string
    ) {
        super();
        this.logger.debug(`PlayerIdentityComponent created for ${identity}`)
    }
}