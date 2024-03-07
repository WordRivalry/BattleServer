import { PlayerUUID, Timestamp } from "../../types";
import { WebSocket } from 'ws';

export class Player {
    private readonly playerId: string;
    private readonly username: string;
    private isConnected: boolean;
    private lastSeen: Timestamp | undefined;
    private socket: WebSocket | null;

    constructor(playerId: string, username: string) {
        this.playerId = playerId;
        this.username = username;
        this.isConnected = false;   // Initially not connected
        this.lastSeen = undefined;  // Last seen timestamp
        this.socket = null;         // WebSocket connection
    }

    public send(message: string): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(message);
        }
    }

    public setConnection(socket: WebSocket): void {
        this.socket = socket;
        this.isConnected = true;
        this.lastSeen = Date.now(); // Update last seen on connection
    }

    public disconnect(): void {
        if (this.socket) {

            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.close(1001, 'Game session ended');
            }
            this.socket = null;
        }

        this.isConnected = false;
        this.lastSeen = Date.now(); // Update last seen on disconnection
    }

    public getPlayerUUID(): PlayerUUID {
        return this.playerId;
    }

    public getUsername(): string {
        return this.username;
    }

    public getLastSeen(): Timestamp | undefined {
        return this.lastSeen;
    }

    public getIsConnected(): boolean {
        return this.isConnected;
    }
}
