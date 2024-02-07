import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { PlayerUUID } from "./gameSession/GameEngine";

export class PlayerLifecycleEvents extends EventEmitter {
    // Define event names as static properties or types to avoid typos in event names.
    static PLAYER_STATE_CHANGED = (playerUUID: string) => `playerStateChanged:${playerUUID}`;
    static PLAYER_READY = "playerReady";
    static PLAYER_DISCONNECTED = "playerDisconnected";
    static PLAYER_RECONNECTED = "playerReconnected";
}

export enum PlayerState {
    Idle = "Idle",  // The player is neither in a queue nor in a game
    InQueue = "InQueue",  // The player is waiting in a matchmaking queue
    Matched = "Matched", // The player has been matched with another player
    IsReady = "IsReady", // The player is ready to start a game
    InGame = "InGame", // The player is currently in a game session
}

export class PlayerInfo {
    uuid: string;
    username: string;
    socket: WebSocket;
    state: PlayerState;
    gameSessionId?: string;

    constructor(uuid:string, username: string, socket: WebSocket, state: PlayerState) {
        this.uuid = uuid;
        this.username = username;
        this.socket = socket;
        this.state = state;
    }
}

export class ExperimentalPlayerLifecycleService {
    private playerStates: Map<string, PlayerInfo> = new Map();
    public events: PlayerLifecycleEvents;

    constructor() {
        this.events = new PlayerLifecycleEvents();
    }

    public getAllPlayerUUIDs(): PlayerUUID[] {
        return Array.from(this.playerStates.keys());
    }

    public getAllUsernames(): string[] {
        return Array.from(this.playerStates.values()).map(playerState => playerState.username);
    }

    public addPlayer(playerUUID: string, username: string, socket: WebSocket) {
        const newPlayer: PlayerInfo = new PlayerInfo(playerUUID, username, socket, PlayerState.Idle);
        this.playerStates.set(playerUUID, newPlayer);
    }

    public updatePlayerState(playerUUID: string, newState: PlayerState) {
        const player = this.playerStates.get(playerUUID);
        if (player && player.state !== newState) { // Check if state actually changed
            player.state = newState;
            this.playerStates.set(playerUUID, player);
            this.events.emit(PlayerLifecycleEvents.PLAYER_STATE_CHANGED(playerUUID), player, newState);
        }
    }

    public removePlayer(playerUUID: string) {
        this.playerStates.delete(playerUUID);
        this.events.emit(PlayerLifecycleEvents.PLAYER_DISCONNECTED, playerUUID);
    }

    // Call this method when a player leaves a game session
    public playerLeavesGameSession(playerUUID: string) {
        const player = this.playerStates.get(playerUUID);
        if (player) {
            player.state = PlayerState.Idle;
            player.gameSessionId = undefined; // Remove player from the game session
            this.playerStates.set(playerUUID, player);
            this.events.emit(PlayerLifecycleEvents.PLAYER_STATE_CHANGED(playerUUID), playerUUID, PlayerState.Idle);
        }
    }

    public getPlayersInSession(gameSessionId: string): PlayerInfo[] {
        return Array.from(this.playerStates.values()).filter(player => player.gameSessionId === gameSessionId);
    }

    public handleDisconnection(playerUUID: string) {
        this.events.emit(PlayerLifecycleEvents.PLAYER_DISCONNECTED, playerUUID);
    }

    public handleReconnection(playerUUID: string, newSocket: WebSocket) {
        const playerState = this.playerStates.get(playerUUID);
        if (playerState) {
            playerState.socket = newSocket;
            this.events.emit(PlayerLifecycleEvents.PLAYER_RECONNECTED, playerUUID, newSocket);
        }
    }
}
