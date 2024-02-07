import {GameSession} from "./GameSession";
import {Player} from "../QueueService";
import {WebSocket} from 'ws';
import {ExperimentalGameSession} from "./ExperimentalGameSession";

export class GameSessionManager {
    private gameSessions: Map<string, ExperimentalGameSession> = new Map(); // Map player UUID to GameSession

    public startNewGame(players: Player[]) {
        const newGameSession = new ExperimentalGameSession(players);
        for (const player of players) {
            this.gameSessions.set(player.uuid, newGameSession);
        }
    }

    public getGameSession(playerUuid: string): ExperimentalGameSession | undefined {
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

            console.log(`Game session has been concluded and removed.`);
        } else {
            console.log(`No active game session found for player UUID: ${playerUuid}.`);
        }
    }

    public handleReconnection(playerUuid: string, newSocket: WebSocket) {
        const gameSession = this.getGameSession(playerUuid);
        if (gameSession) {
            gameSession.handlePlayerReconnection(playerUuid, newSocket);
            console.log(`Handled reconnection for player ${playerUuid}`);
        } else {
            console.log(`No active game session found for player ${playerUuid} to reconnect.`);
        }
    }

    public handlePlayerDisconnection(playerUuid: string) {
        const gameSession = this.getGameSession(playerUuid);
        if (gameSession) {
            gameSession.handlePlayerDisconnection(playerUuid);
            console.log(`Handled disconnection for player ${playerUuid}`);

            // End the game if gameSession is ended
            if (gameSession.isSessionEnded) {
                this.endGame(playerUuid);
            }
        } else {
            console.log(`No active game session found for player ${playerUuid} to disconnect.`);
        }
    }
}
