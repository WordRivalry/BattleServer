// GameMessageComponent.ts
import {Component} from "../Component";

export interface PlayerMessage {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
    gameSessionUUID: string;
    recipient: string;
}

export class PlayerMessageComponent extends Component {
    public messages: PlayerMessage[] = [];
}