// WebSocketMessageHandler.ts
import { WebSocket, RawData } from 'ws';
import { IMessageHandler } from './WebSocketManager';
import { UnknownPlayerError, UnknownGameSessionError, ValidationFailedError } from "../error/Error";
import { MessageParsingService } from "./MessageParsingService";
import { ActionType } from "./validation/messageType";
import { EventEmitter } from 'stream';
import { GameEvent } from "../GameSession/GameEventsEmitter";

export class WebSocketMessageHandler extends EventEmitter implements IMessageHandler {

    emitSessionEvent(eventName: GameEvent, gameSessionUUID: string, ...args: any[]): boolean {
        const scopedEventName = `${gameSessionUUID}:${eventName}`;
        return super.emit(scopedEventName, ...args);
    }
    
    public handleConnection(ws: WebSocket, playerUUID: string, gameSessionUUID: string): void {
         this.emitSessionEvent(GameEvent.PLAYER_JOINED, gameSessionUUID, playerUUID, ws);
    }

    public handleMessage(message: RawData, playerUUID: string, gameSessionUUID: string): void {
        const parsedMessage = MessageParsingService.parseAndValidateMessage(message);

        switch (parsedMessage.type) {
            case ActionType.PLAYER_LEFT_SESSION:
                this.emitSessionEvent(GameEvent.PLAYER_LEFT, gameSessionUUID, playerUUID);
                break;
            case ActionType.PLAYER_ACTION:
                this.emitSessionEvent(GameEvent.PLAYER_ACTION, gameSessionUUID, playerUUID, parsedMessage);
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

        this.emitSessionEvent(GameEvent.PLAYER_LOST_CONNECTION, gameSessionUUID, playerUUID);
    }
}