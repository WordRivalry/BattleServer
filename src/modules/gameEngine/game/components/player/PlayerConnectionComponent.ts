// PlayerConnectionComponent.ts
import { WebSocket } from 'ws';
import { Component } from "../../../ecs/components/Component";

export class PlayerConnectionComponent extends Component {
    public isConnected: boolean = false;
    public lastSeen: number | undefined = undefined;
    public socket: WebSocket | undefined = undefined;
}