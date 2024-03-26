// GameSessionNetworking.ts
import WebSocket from 'ws';
import {v4 as uuidv4} from 'uuid';
import {PlayerAction} from "../server_networking/validation/messageType";
import {Player} from "./Player";
import {PlayerMetadata} from "./GameSessionManager";
import {NoConnectionTimeoutError, PlayerNotInSessionError} from "../error/Error";
import {NetworkEventEnum} from "./NetworkEventEnum";
import {TypedEventEmitter} from "../ecs/TypedEventEmitter";
import {
    ConnectionPayload,
    PlayerActionPayload,
    PlayerDisconnectionPayload
} from "../server_networking/WebSocketMessageHandler";
import {createScopedLogger} from "../logger/logger";

interface GameMessage {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
    gameSessionUUID: string;
    recipient: string | string[];
}

export interface GameSessionNetworking_Delegate {
    onPlayerJoined(playerName: string): void;
    onAction(fromPlayer: string, action: PlayerAction): void;
    onPlayerLeft(playerName: string): void;
}

export class GameSessionNetworking {
    private readonly players: Player[] = [];
    private readonly messages: GameMessage[] = [];
    private readonly cancelSubscriptions: (() => void)[] = [];
    private readonly reconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private readonly logger = createScopedLogger('GameSessionNetworking');
    private delegate: GameSessionNetworking_Delegate | undefined;

    constructor(
        private gameSessionUUID: string,
        private playersMetadata: PlayerMetadata[],
        private eventEmitter: TypedEventEmitter
    ) {
        // Initialize the awaited player
        this.players = this.playersMetadata.map((metadata: PlayerMetadata) => {
            return new Player(metadata.playerName);
        });

        // Register the game events
        this.gameEventsRegister();
    }

    //////////////////////////////////////////////////
    //                Networking API                //
    //////////////////////////////////////////////////

    public cleanup(): void {
        // Unsubscribe from the events
        this.cancelSubscriptions.forEach(cancel => cancel());

        // Disconnect all players
        this.disconnectAllPlayers();

        // Clear the state
        this.delegate = undefined;
        this.players.length = 0;
        this.messages.length = 0;
        this.cancelSubscriptions.length = 0;
        this.reconnectionTimeouts.clear();

        // Ready for garbage collection
        this.logger.context('cleanup').info('Cleaned up');
    }

    public setDelegate(delegate: GameSessionNetworking_Delegate): void {
        this.delegate = delegate;
    }

    public isAllPlayersConnected(): boolean {
        return this.players.every(player => player.getIsConnected());
    }

    public broadcastMessage(type: string, payload: any): void {
        this.players.forEach(player => {
            this.sendMessage(type, payload, player.getName());
        });
        this.logger.context('broadcastMessage').info('Broadcasted message', {type, payload});
    }

    public sendMessage(type: string, payload: any, to: string | string[] = this.players.map(player => player.getName())): void {
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
                .map(playerName => this.findPlayerByName(playerName))
                .forEach(player => {
                    player.send(JSON.stringify(message));
                });
        } else {
            // Send the message to a player
            const player = this.findPlayerByName(to);
            player.send(JSON.stringify(message));
        }
    }

    //////////////////////////////////////////////////
    //                Private methods               //
    //////////////////////////////////////////////////

    private disconnectAllPlayers() {
        this.players.forEach(player => {
            player.disconnect();
        });
        this.logger.context('disconnectAllPlayers').info('Disconnected all players');
    }

    private gameEventsRegister(): void {
        this.cancelSubscriptions.push(this.eventEmitter.subscribeTargeted<ConnectionPayload>(NetworkEventEnum.PLAYER_JOINED, this.gameSessionUUID, (payload) => {
            this.handlePlayerJoined(payload.playerName, payload.socket);
        }));

        this.cancelSubscriptions.push(this.eventEmitter.subscribeTargeted<PlayerActionPayload>(NetworkEventEnum.PLAYER_ACTION, this.gameSessionUUID, (payload) => {
            this.handlePlayerAction(payload.playerName, payload.action);
        }));

        this.cancelSubscriptions.push(this.eventEmitter.subscribeTargeted<PlayerDisconnectionPayload>(NetworkEventEnum.PLAYER_LOST_CONNECTION, this.gameSessionUUID, (payload) => {
            this.handleDisconnection(payload.playerName);
        }));

        this.cancelSubscriptions.push(this.eventEmitter.subscribeTargeted<PlayerDisconnectionPayload>(NetworkEventEnum.PLAYER_LEFT, this.gameSessionUUID, (payload) => {
            this.handlePlayerLeft(payload.playerName);
        }));
    }

    private handlePlayerJoined(playerName: string, ws: WebSocket) {
        const player = this.findPlayerByName(playerName);
        const lastSeen = player.getLastSeen();
        if (lastSeen === undefined) {
            player.setConnection(ws);
            this.logger.context('handlePlayerJoined').info('Player joined', {playerName: player.getName()});
        } else {
            this.clearReconnectionTimeout(playerName);
            player.setConnection(ws);
            this.sendMissedMessages(player.getName(), lastSeen);
            this.logger.context('handlePlayerJoined').info('Player reconnected', {playerName: player.getName()});
        }

        this.delegate?.onPlayerJoined(player.getName());
    }

    private clearReconnectionTimeout(playerName: string) {
        const timeout = this.reconnectionTimeouts.get(playerName);
        if (timeout === undefined) {
            throw new NoConnectionTimeoutError(playerName);
        }
        clearTimeout(timeout);
        this.reconnectionTimeouts.delete(playerName);
        this.logger.context('clearReconnectionTimeout').info('Cleared reconnection timeout', {playerName});
    }

    private handlePlayerAction(playerName: string, action: PlayerAction) {
        this.logger.context('handlePlayerAction').info('Handling player action', {playerName, action: action.payload.playerAction});
        const player = this.findPlayerByName(playerName);
        this.delegate?.onAction(player.getName(), action);
        this.logger.context('handlePlayerAction').info('Player action', {playerName: player.getName(), action: action.payload.playerAction});
    }

    private handleDisconnection(playerName: string): void {
        const player = this.findPlayerByName(playerName);
        player.disconnect();
        this.setTimeOutForPlayerReconnection(playerName, 5);
        this.logger.context('handleDisconnection').info('Player lost connection', {playerName: player.getName()});
    }

    private setTimeOutForPlayerReconnection(playerName: string, timeout: number) {
        // Set a timeout for player reconnection
        const reconnectionTimeout = setTimeout(() => {
            // Handle the case where the player does not reconnect in time
            this.handlePlayerLeft(playerName);
        }, timeout * 1000); // Seconds to milliseconds

        // Store the timeout, so it can be cleared upon successful reconnection
        this.reconnectionTimeouts.set(playerName, reconnectionTimeout);
        this.logger.context('setTimeOutForPlayerReconnection').info('Set reconnection timeout', {playerName, timeout});
    }

    private handlePlayerLeft(playerName: string): void {
        const player = this.findPlayerByName(playerName);
        player.disconnect();
        this.delegate?.onPlayerLeft(player.getName());
        this.logger.context('handlePlayerLeft').info('Player left', {playerName: player.getName()});
    }

    private sendMissedMessages(playerName: string, lastSeen: number): void {
        const player = this.findPlayerByName(playerName);
        const messages: GameMessage[] = this.getMessagesSince(playerName, lastSeen);
        messages.forEach(message => {
            player.send(JSON.stringify(message));
        });
        this.logger.context('sendMissedMessages').info('Sent missed messages', {playerName: player.getName(), lastSeen});
    }

    private getMessagesSince(playerName: string, lastSeen: number): GameMessage[] {
        return this.messages
            .filter(message => message.timestamp > lastSeen
                && (message.recipient === 'all'
                    || message.recipient === playerName
                    || message.recipient.includes(playerName)));
    }

    private findPlayerByName(playerName: string): Player {
        const player: Player | undefined = this.players.find(player => player.getName() === playerName);
        if (player === undefined) {
            this.logger.context('findPlayerByName').error('Player not found', {playerName: playerName});
            throw new PlayerNotInSessionError(playerName);
        }
        return player;
    }
}