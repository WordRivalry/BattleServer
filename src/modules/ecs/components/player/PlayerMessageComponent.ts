// PlayerMessageComponent.ts
import {Component} from "../Component";

export interface PlayerMessage {
    uuid: string;
    timestamp: number;
    type: string;
    payload: any;
}

export class PlayerMessageComponent extends Component {
    public messages: PlayerMessage[] = [];
}