// ConnectionRequestComponent.ts
import {Component} from "../Component";
import {WebSocket} from "ws";

export class ConnectionRequestComponent extends Component {
    constructor(public socket: WebSocket) {
        super();
    }
}