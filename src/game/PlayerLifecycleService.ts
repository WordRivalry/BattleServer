import {WebSocket} from 'ws';
import {PlayerUUID} from "./gameSession/GameEngine";

export interface PlayerLifecycleDelegate {
    onPlayerReady(playerUUID: string): void;
    onPlayerDisconnected(playerUUID: string): void;
    onPlayerReconnected(playerUUID: string, newSocket: WebSocket): void;
}

export class PlayerLifecycleService {
    private playerStates: Map<string, {username: string, socket: WebSocket, isReady: boolean }> = new Map();
    private delegate: PlayerLifecycleDelegate | undefined;

    constructor() {
    }

    public setDelegate(delegate: PlayerLifecycleDelegate) {
        this.delegate = delegate;
    }

    public addPlayer(player: Player) {
        this.playerStates.set(player.uuid, {username: player.username, socket: player.socket, isReady: false });
    }

    public removePlayer(playerUUID: string) {
        this.playerStates.delete(playerUUID);
        // Additional cleanup as needed
    }

    public isAllPlayersReady(): boolean {
        return Array.from(this.playerStates.values()).every(playerState => playerState.isReady);
    }

    public setPlayerReady(playerUUID: string, isReady: boolean) {
        const playerState = this.playerStates.get(playerUUID);
        if (playerState) {
            playerState.isReady = isReady;
            this.delegate?.onPlayerReady(playerUUID);
        }
    }

    public getAllPlayerUUIDs(): PlayerUUID[] {
        return Array.from(this.playerStates.keys());
    }

    public getAllUsernames(): string[] {
        return Array.from(this.playerStates.values()).map(playerState => playerState.username);
    }


    // Delegate methods

    public handleDisconnection(playerUUID: string) {
        // Implementation of handling disconnection logic
        this.delegate?.onPlayerDisconnected(playerUUID);
    }

    public handleReconnection(playerUUID: string, newSocket: WebSocket) {
        const playerState = this.playerStates.get(playerUUID);
        if (playerState) {
            playerState.socket = newSocket;
            this.delegate?.onPlayerReconnected(playerUUID, newSocket);
        }
    }
}
