import {WebSocket} from 'ws';
import {GameSession} from "./gameSession/GameSession";
import {Player} from "./gameSession/GameSessionPlayerService";
import {createScopedLogger} from "../logger/Logger";
import { v4 as uuidv4 } from 'uuid';

export interface GameSessionCallback {
    onGameEnd: (gameSessionUUID: string) => void;
}

export class GameSessionManager implements GameSessionCallback {
    private gameSessions: Map<string, GameSession> = new Map(); // Map game session UUID to GameSession
    private playersToSessions: Map<string, string> = new Map(); // Map player UUID to game session UUID
    private logger = createScopedLogger('GameSessionManager');
    public startNewGame(players: Player[]) {
        // Generate a unique identifier for the new game session
        const gameSessionUUID = uuidv4();
        const newGameSession = new GameSession(players, gameSessionUUID, this);

        // Store the game session by its UUID
        this.gameSessions.set(gameSessionUUID, newGameSession);

        // Link each player to the new game session
        for (const player of players) {
            player.setGameSessionUUID(gameSessionUUID);
            this.playersToSessions.set(player.uuid, gameSessionUUID);
        }
    }

    public getGameSession(playerUuid: string): GameSession | undefined {
        const gameSessionUUID = this.playersToSessions.get(playerUuid);
        if (gameSessionUUID) {
            return this.gameSessions.get(gameSessionUUID);
        }
        return undefined;
    }

    public onGameEnd(gameSessionUUID: string) {
        const gameSession = this.gameSessions.get(gameSessionUUID);
        if (gameSessionUUID && gameSession) {
            // Remove the game session and player-session associations
            this.gameSessions.delete(gameSessionUUID);
            gameSession.playersUUIDs.forEach(uuid => this.playersToSessions.delete(uuid));

            this.logger.context('endGame').debug('Game session ended', { gameSessionUUID });
        } else {
            this.logger.context('endGame').warn('No active game session found', { gameSessionUUID });
        }
    }

    public handleReconnection(playerUuid: string, newSocket: WebSocket) {
        const gameSession = this.getGameSession(playerUuid);
        if (gameSession) {
            gameSession.playerService.handleReconnection(playerUuid, newSocket);

            this.logger.context('handleReconnection').debug('Handled reconnection for player', { playerUuid });
        } else {
            this.logger.context('handleReconnection').warn('No active game session found for player to reconnect', { playerUuid });
        }
    }

    public handlePlayerDisconnection(playerUuid: string) {
        const gameSession = this.getGameSession(playerUuid);
        if (gameSession) {
            gameSession.playerService.handleDisconnection(playerUuid);
            this.logger.context('handlePlayerDisconnection').debug('Handled disconnection for player', { playerUuid });
        } else {
            this.logger.context('handlePlayerDisconnection').warn('No active game session found for player to disconnect', { playerUuid });
        }
    }
}
