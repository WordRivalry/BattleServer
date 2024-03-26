// WebSocketMessageHandler.ts
import {RawData, WebSocket} from 'ws';
import {IMessageHandler} from './WebSocketManager';
import {UnknownGameSessionError, UnknownPlayerError, ValidationFailedError} from "../error/Error";
import {MessageParsingService} from "./MessageParsingService";
import {ActionType, PlayerAction} from "./validation/messageType";
import {NetworkEventEnum} from "../framework/NetworkEventEnum";
import {TypedEventEmitter} from "../ecs/TypedEventEmitter";

export interface ConnectionPayload {
    playerName: string,
    socket: WebSocket
}

export interface PlayerActionPayload {
    playerName: string,
    action: PlayerAction
}

export interface PlayerDisconnectionPayload {
    playerName: string
}

export class WebSocketMessageHandler implements IMessageHandler {

    constructor(private eventEmitter: TypedEventEmitter) {
    }

    public handleConnection(ws: WebSocket, playerName: string, gameSessionUUID: string): void {
        this.eventEmitter.emitTargeted<ConnectionPayload>(NetworkEventEnum.PLAYER_JOINED, gameSessionUUID, {
            playerName: playerName,
            socket: ws
        });
    }

    public handleMessage(message: RawData, playerName: string, gameSessionUUID: string): void {
        const parsedMessage = MessageParsingService.parseAndValidateMessage(message);

        switch (parsedMessage.type) {
            case ActionType.PLAYER_LEFT_SESSION:
                this.eventEmitter.emitTargeted(NetworkEventEnum.PLAYER_LEFT, gameSessionUUID, {
                    playerName: playerName
                });
                break;
            case ActionType.PLAYER_ACTION:
                this.eventEmitter.emitTargeted<PlayerActionPayload>(NetworkEventEnum.PLAYER_ACTION, gameSessionUUID, {
                    playerName: playerName,
                    action: parsedMessage
                });
                break;
            default:
                throw new ValidationFailedError();
        }
    }

    public handleDisconnect(playerName: string | undefined, gameSessionUUID: string | undefined): void {
        if (playerName === undefined) {
            throw new UnknownPlayerError("Player Name is undefined");
        }

        if (gameSessionUUID === undefined) {
            throw new UnknownGameSessionError("Game session UUID is undefined");
        }

        this.eventEmitter.emitTargeted<PlayerDisconnectionPayload>(NetworkEventEnum.PLAYER_LOST_CONNECTION, gameSessionUUID, {
            playerName: playerName
        });
    }
}