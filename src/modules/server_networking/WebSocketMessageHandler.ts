// WebSocketMessageHandler.ts
import {WebSocket, RawData} from 'ws';
import {IMessageHandler} from './WebSocketManager';
import {UnknownPlayerError, UnknownGameSessionError, ValidationFailedError} from "../error/Error";
import {MessageParsingService} from "./MessageParsingService";
import {ActionType, PlayerAction} from "./validation/messageType";
import {GameSessionManager} from "../oldButNew/GameSessionManager";
import {PlayerSessionValidationAndManagement} from "../oldButNew/PlayerSessionValidationAndManagement";
import {GameSession} from "../oldButNew/GameSession";

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

    // constructor(private eventSystem: TypedEventEmitter) {
    // }

    constructor(
        private gameSessionManager: GameSessionManager,
        private playerService: PlayerSessionValidationAndManagement,
    ) {}


    public handleConnection(ws: WebSocket, playerUUID: string, gameSessionUUID: string): void {
        this.playerService.validatePlayerConnection(playerUUID, gameSessionUUID)
        ws.send(JSON.stringify({ type: 'success', message: 'Connection established' }));

        const session = this.gameSessionManager.getSession(gameSessionUUID);
        if (session.isInProgress()) {
            // Reconnection handling for in-progress game session
            this.playerService.handleReconnection(playerUUID, gameSessionUUID, ws);
        } else {
            session.playerJoins(playerUUID, ws);
        }
    }

    handleMessage(ws: WebSocket, message: RawData, playerUUID: string, gameSessionUUID: string): void {
        const session: GameSession = this.gameSessionManager.getSession(gameSessionUUID);
        session.validatePlayerIsInSession(playerUUID);
        const parsedMessage = MessageParsingService.parseAndValidateMessage(message);

        switch (parsedMessage.type) {
            case ActionType.LEAVE_GAME_SESSION:
                session.playerLeaves(playerUUID);
                break;
            case ActionType.PLAYER_ACTION:
                session.handlePlayerAction(playerUUID, parsedMessage);
                break;
            default:
                throw new ValidationFailedError();
        }
    }

    handleDisconnect(playerUUID: string | undefined, gameSessionUUID: string | undefined): void {
        if (playerUUID === undefined) {
            throw new UnknownPlayerError("Player UUID is undefined");
        }

        if (gameSessionUUID === undefined) {
            throw new UnknownGameSessionError("Game session UUID is undefined");
        }

        this.playerService.handleDisconnection(playerUUID, gameSessionUUID);
    }
}