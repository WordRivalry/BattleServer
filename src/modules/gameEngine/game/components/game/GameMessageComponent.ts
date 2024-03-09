

export interface GameMessage {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
    gameSessionUUID: string;
    recipient: string | string[];
}


import {Component} from "../../../ecs/components/Component";

export class GameMessageComponent extends Component {
    public messages: GameMessage[] = [];

    public addMessage(message: GameMessage): void {
        this.messages.push(message);
    }
}