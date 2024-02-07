import {WebSocket} from 'ws';
import {GameSession} from "./gameSession/GameSession";
import {Player} from "./gameSession/GameSessionPlayerService";
import {createScopedLogger} from "../logger/Logger";

export class GameSessionManager {
    private gameSessions: Map<string, GameSession> = new Map(); // Map player UUID to GameSession
    private logger = createScopedLogger('GameSessionManager');

    public startNewGame(players: Player[]) {
        const newGameSession = new GameSession(players);
        for (const player of players) {
            this.gameSessions.set(player.uuid, newGameSession);
        }
    }

    public getGameSession(playerUuid: string): GameSession | undefined {
        return this.gameSessions.get(playerUuid);
    }

    public endGame(playerUuid: string) {
        // Retrieve the game session using the UUID of one of the players.
        const gameSession = this.gameSessions.get(playerUuid);

        if (gameSession) {
            // Remove the game session from the map.
            // For all the players in the game session
            for (const uuid of gameSession.playersUUIDs) {
                this.gameSessions.delete(uuid);
            }

            this.logger.info(`Game session ended for players: ${gameSession.playersUUIDs}`);
        } else {
            this.logger.warn(`No active game session found for player ${playerUuid} to end.`);
        }
    }

    public handleReconnection(playerUuid: string, newSocket: WebSocket) {
        const gameSession = this.getGameSession(playerUuid);
        if (gameSession) {
            gameSession.playerService.handleReconnection(playerUuid, newSocket);
            this.logger.info(`Handled reconnection for player ${playerUuid}`);
        } else {
            this.logger.warn(`No active game session found for player ${playerUuid} to reconnect.`);
        }
    }

    public handlePlayerDisconnection(playerUuid: string) {
        const gameSession = this.getGameSession(playerUuid);
        if (gameSession) {
            gameSession.playerService.handleDisconnection(playerUuid);
            this.logger.info(`Handled disconnection for player ${playerUuid}`);

            // End the game if gameSession is ended
            if (gameSession.isSessionEnded) {
                this.endGame(playerUuid);
            }
        } else {
            this.logger.warn(`No active game session found for player ${playerUuid} to disconnect.`);
        }
    }
}
