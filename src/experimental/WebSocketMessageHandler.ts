// WebSocketMessageHandler.ts
import { WebSocket } from 'ws';
import { createScopedLogger } from '../logger/logger';
import { GameSessionManager } from './GameSessionManager';
import { IMessageHandler } from './WebSocketManager';
import { PlayerSessionValidationAndManagement } from './PlayerSessionValidationAndManagement';

export class WebSocketMessageHandler implements IMessageHandler {
    private logger = createScopedLogger('WebSocketMessageHandler');

    constructor(
        private gameSessionManager: GameSessionManager,
        private playerService: PlayerSessionValidationAndManagement,
        ) {}
    
    handleConnection(ws: WebSocket, playerUUID: string, gameSessionUUID: string): void {
        if (this.playerService.validatePlayerConnection(playerUUID, gameSessionUUID)) {
            // Establish connection
            ws.send(JSON.stringify({ type: 'success', message: 'Connection established' }));

            // Check if session is in progress
            const session = this.gameSessionManager.getSession(gameSessionUUID);
            if (session !== undefined && session.isInProgress()) {
                // Reconnection handling for in-progress game session
                this.playerService.handleReconnection(playerUUID, gameSessionUUID, ws);
            }
        } else {
            // Reject connection
            ws.close(1008, 'Session not found');
        }
    }

    handleMessage(ws: WebSocket, action: any, playerUUID: string, gameSessionUUID: string): void {
        try {

            const session = this.gameSessionManager.getSession(gameSessionUUID);
            if (session === undefined) {
                this.logger.context('handleMessage.joinGameSession').warn('Game session not found', { gameSessionUUID });
                ws.close(1008, 'Session not found');
                return;
            }

            if (!session.hasPlayer(playerUUID)) {
                this.logger.context('handleMessage.joinGameSession').warn('Player not found in the game session', { playerUUID });
                ws.close(1008, 'Session not found');
                return;
            }

            switch (action.type) {
                case 'joinGameSession':
                    session.playerJoins(playerUUID, ws);
                    break;
                case 'leaveGameSession':
                    session.playerLeaves(playerUUID);
                    break;
                case 'reJoinGameSession':

                case 'scoreUpdate':
                    const { wordPath } = action;
                    this.logger.debug('Submitted a word', { playerUUID: playerUUID, wordPath });
                    session.handlePlayerAction(playerUUID, action);
                    break;
                default:
                    this.logger.error('Unknown Action type', { playerUUID: playerUUID, gameSessionUUID, action });
                    // Disconnect the client if an unknown action type is received
                    ws.close(1003, 'Teapot Error');
                    break;
            }
        } catch (error) {
            this.logger.context("handleMessage").error('Error handling message:', error);
            ws.send(JSON.stringify({ type: 'error', message: (error as Error).message }));
        }
    }

    handleDisconnect(playerUUID: string | undefined, gameSessionUUID: string | undefined): void {
        if (playerUUID === undefined) {
            this.logger.context('handleDisconnect').warn('Player UUID is undefined');
            return;
        }

        if (gameSessionUUID === undefined) {
            this.logger.context('handleDisconnect').warn('Game session UUID is undefined');
            return;
        }

        this.playerService.handleDisconnection(playerUUID, gameSessionUUID);
    }
}