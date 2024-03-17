// WebSocketMessageHandler.ts
import {WebSocket, RawData} from 'ws';
import {IMessageHandler} from './WebSocketManager';
import {UnknownPlayerError, UnknownGameSessionError, ValidationFailedError} from "../error/Error";
import {MessageParsingService} from "./MessageParsingService";
import {ActionType, PlayerAction} from "./validation/messageType";
import {TypedEventEmitter} from "../ecs/TypedEventEmitter";
import {GameEvent} from "../ecs/systems/network/NetworkSystem";

export interface ConnectionPayload {
    gameSessionUUID: string,
    playerUUID: string,
    socket: WebSocket
}

export interface PlayerActionPayload {
    gameSessionUUID: string,
    playerUUID: string,
    action: PlayerAction
}

export interface PlayerDisconnectionPayload {
    gameSessionUUID: string,
    playerUUID: string
}

export class WebSocketMessageHandler implements IMessageHandler {

    constructor(private eventSystem: TypedEventEmitter) {
    }

    public handleConnection(ws: WebSocket, playerUUID: string, gameSessionUUID: string): void {
        this.eventSystem.emitTargeted<ConnectionPayload>(GameEvent.PLAYER_CONNECTS, gameSessionUUID,{
            gameSessionUUID: gameSessionUUID,
            playerUUID: playerUUID,
            socket: ws
        });
    }

    public handleMessage(message: RawData, playerUUID: string, gameSessionUUID: string): void {
        const parsedMessage = MessageParsingService.parseAndValidateMessage(message);

        switch (parsedMessage.type) {
            case ActionType.PLAYER_LEFT_SESSION:
                this.eventSystem.emitGeneric<PlayerDisconnectionPayload>(GameEvent.PLAYER_LEFT, {
                    gameSessionUUID: gameSessionUUID,
                    playerUUID: playerUUID
                });
                break;
            case ActionType.PLAYER_ACTION:
                this.eventSystem.emitGeneric<PlayerActionPayload>(GameEvent.PLAYER_ACTION, {
                    gameSessionUUID: gameSessionUUID,
                    playerUUID: playerUUID,
                    action: parsedMessage
                });
                break;
            default:
                throw new ValidationFailedError();
        }
    }

    public handleDisconnect(playerUUID: string | undefined, gameSessionUUID: string | undefined): void {
        if (playerUUID === undefined) {
            throw new UnknownPlayerError("Player UUID is undefined");
        }

        if (gameSessionUUID === undefined) {
            throw new UnknownGameSessionError("Game session UUID is undefined");
        }

        this.eventSystem.emitGeneric<PlayerDisconnectionPayload>(GameEvent.PLAYER_LOST_CONNECTION, {
            gameSessionUUID: gameSessionUUID,
            playerUUID: playerUUID
        });
    }
}