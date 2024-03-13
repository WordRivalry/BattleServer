// PlayerConnectionComponent.ts
import { WebSocket } from 'ws';
import { Component } from "../Component";
import {createScopedLogger} from "../../../../logger/logger";

export class PlayerConnectionComponent extends Component {
    public lastSeen: number | undefined = undefined;
    public socket: WebSocket | undefined = undefined;
    private logger = createScopedLogger('PlayerConnectionComponent')

    constructor() {
        super();
        this.logger.debug(`PlayerConnectionComponent created:  ${this.lastSeen} ${this.socket}`)
    }
}