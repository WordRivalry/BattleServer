// WebSocketMessageHandler.ts
import { WebSocket, RawData } from 'ws';
import { GameSessionManager } from './GameSessionManager';
import { IMessageHandler } from './WebSocketManager';
import { PlayerSessionValidationAndManagement } from './PlayerSessionValidationAndManagement';
import {
    UnknownPlayerError,
    UnknownGameSessionError,
    ValidationFailedError, SessionNotFoundError
} from "../error/Error";
import {GameSession} from "./GameSession";
import {MessageParsingService} from "./MessageParsingService";
import {ActionType} from "../validation/messageType";

export class WebSocketMessageHandler implements IMessageHandler {

    constructor(
        private gameSessionManager: GameSessionManager,
        private playerService: PlayerSessionValidationAndManagement,
        ) {}
    
    handleConnection(ws: WebSocket, playerUUID: string, gameSessionUUID: string): void {
        this.playerService.validatePlayerConnection(playerUUID, gameSessionUUID)
        ws.send(JSON.stringify({ type: 'success', message: 'Connection established' }));
        // Check if session is in progress
        const session = this.gameSessionManager.getSession(gameSessionUUID);
        if (session.isInProgress()) {
            // Reconnection handling for in-progress game session
            this.playerService.handleReconnection(playerUUID, gameSessionUUID, ws);
        }
    }

    handleMessage(ws: WebSocket, message: RawData, playerUUID: string, gameSessionUUID: string): void {

        const session: GameSession = this.gameSessionManager.getSession(gameSessionUUID);
        session.validatePlayerIsInSession(playerUUID);
        const parsedMessage = MessageParsingService.parseAndValidateMessage(message);

        switch (parsedMessage.type) {
            case ActionType.JOIN_GAME_SESSION:
                session.playerJoins(playerUUID, ws);
                break;
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