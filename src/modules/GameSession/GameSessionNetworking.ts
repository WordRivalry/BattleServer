import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { PlayerUUID } from "../../types";
import { PlayerAction } from "../server_networking/validation/messageType";
import { Player } from "./Player";
import { PlayerMetadata } from "./GameSessionManager";
import { NoConnectionTimeoutError, PlayerNotInSessionError } from "../error/Error";
import { GameEvent, GameEventEmitter } from "./GameEventsEmitter";

interface GameMessage {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
    gameSessionUUID: string;
    recipient: string | string[];
}

export interface GameSessionNetworking_Delegate {
    onAPlayerJoined(player: string): void;
    onAllPlayersJoined(): void;
    onAction(fromPlayer: string, action: PlayerAction): void;
    onPlayerLeft(player: string): void;
}

export class GameSessionNetworking {
    private readonly reconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private readonly gameEvents: GameEventEmitter;
    private readonly messages: GameMessage[] = [];
    private delegate: GameSessionNetworking_Delegate | undefined;
    public readonly players: Player[] = [];

    constructor(
        private gameSessionUUID: string,
        private playersMetadata: PlayerMetadata[]
    ) {
        // Initialize the game event emitter for the game session
        this.gameEvents = new GameEventEmitter(gameSessionUUID);

        // Initialize the awaited player
        this.players = this.playersMetadata.map((metadata: PlayerMetadata) => {
            return new Player(metadata.uuid, metadata.username);
        });

        // Register the game events
        this.gameEventsRegister();
    }

    public setDelegate(delegate: GameSessionNetworking_Delegate): void {
        this.delegate = delegate;
    }

    public emitGameEnd(): void {
        this.gameEvents.emit(GameEvent.GAME_END);
        this.disconnectAllPlayers();
    }

    private disconnectAllPlayers() {
        this.players.forEach(player => {
            player.disconnect();
        });
    }

    private gameEventsRegister(): void {
        this.gameEvents.on(GameEvent.PLAYER_JOINED, (playerUUID: string, ws: WebSocket) => {
            this.handlePlayerJoined(playerUUID, ws);
        });

        this.gameEvents.on(GameEvent.PLAYER_ACTION, (playerUUID: string, action: PlayerAction) => {
            this.handlePlayerAction(playerUUID, action);
        });

        this.gameEvents.on(GameEvent.PLAYER_LOST_CONNECTION, (playerUUID: string) => {
            this.handleDisconnection(playerUUID);
        });

        this.gameEvents.on(GameEvent.PLAYER_LEFT, (playerUUID: string) => {
            this.handlePlayerLeft(playerUUID);
        });
    }

    private handlePlayerJoined(playerUUID: string, ws: WebSocket) {
        const player = this.findPlayerByUUID(playerUUID);
        const lastSeen = player.getLastSeen();
        if (lastSeen === undefined) {
            player.setConnection(ws);
        } else {
            this.clearReconnectionTimeout(playerUUID);
            player.setConnection(ws);
            this.sendMissedMessages(player.getPlayerUUID(), lastSeen);
        }

        this.delegate?.onAPlayerJoined(player.getUsername());
        this.checkAndStartGame();
    }

    private clearReconnectionTimeout(playerUUID: string) {
        const timeout = this.reconnectionTimeouts.get(playerUUID);
        if (timeout === undefined) {
            throw new NoConnectionTimeoutError(playerUUID);
        }
        clearTimeout(timeout);
        this.reconnectionTimeouts.delete(playerUUID);
    }

    private checkAndStartGame(): void {
        const allPlayersJoined: boolean = this.players.every(player => player.getIsConnected());
        if (allPlayersJoined) {
            this.delegate?.onAllPlayersJoined();
        }
    }

    private handlePlayerAction(playerUUID: string, action: PlayerAction) {
        const player = this.findPlayerByUUID(playerUUID);
        this.delegate?.onAction(player.getUsername(), action);
    }

    private handleDisconnection(playerUUID: string): void {
        const player = this.findPlayerByUUID(playerUUID);
        player.disconnect();
        this.setTimeOutForPlayerReconnection(playerUUID, 5);
    }

    private setTimeOutForPlayerReconnection(playerUUID: string, timeout: number) {
        // Set a timeout for player reconnection
        const reconnectionTimeout = setTimeout(() => {
            // Handle the case where the player does not reconnect in time
            this.handlePlayerLeft(playerUUID);
        }, timeout * 1000); // Seconds to milliseconds

        // Store the timeout, so it can be cleared upon successful reconnection
        this.reconnectionTimeouts.set(playerUUID, reconnectionTimeout);
    }

    private handlePlayerLeft(playerUUID: string): void {
        const player = this.findPlayerByUUID(playerUUID);
        player.disconnect();
        this.delegate?.onPlayerLeft(player.getUsername());
    }

    public sendData(type: string, payload: any, to: string | string[] = this.players.map(player => player.getUsername())): void {
        const message: GameMessage = {
            id: uuidv4(),
            type: type,
            payload: payload,
            gameSessionUUID: this.gameSessionUUID,
            recipient: to,
            timestamp: Date.now()
        };

        // Store the message
        this.messages.push(message);

        if (Array.isArray(to)) {
            // Send the message to the players
            to
                .map(playerUUID => this.findPlayerByUserName(playerUUID))
                .forEach(player => {
                    player.send(JSON.stringify(message));
                });
        } else {
            // Send the message to a player
            const player = this.findPlayerByUserName(to);
            player.send(JSON.stringify(message));
        }
    }

    private sendMissedMessages(playerUUID: string, lastSeen: number): void {
        const player = this.findPlayerByUUID(playerUUID);
        const messages: GameMessage[] = this.getMessagesSince(playerUUID, lastSeen);
        messages.forEach(message => {
            player.send(JSON.stringify(message));
        });
    }

    private getMessagesSince(playerUUID: PlayerUUID, lastSeen: number): GameMessage[] {
        return this.messages
        .filter(message => message.timestamp > lastSeen 
            && (message.recipient === 'all' 
            || message.recipient === playerUUID 
            || message.recipient.includes(playerUUID)));
    }

    private findPlayerByUUID(playerUUID: string): Player {
        const player: Player | undefined = this.players.find(player => player.getPlayerUUID() === playerUUID);
        if (player === undefined) {
            throw new PlayerNotInSessionError(playerUUID);
        }
        return player;
    }

    private findPlayerByUserName(username: string): Player {
        const player: Player | undefined = this.players.find(player => player.getUsername() === username);
        if (player === undefined) {
            throw new PlayerNotInSessionError(username);
        }
        return player;
    }
}
