import {GameSession} from "./GameSession";
import {Player} from "../QueueService";
import {WebSocket} from 'ws';
import {ExperimentalGameSession} from "./ExperimentalGameSession";

export class GameSessionManager {
    private gameSessions: Map<string, ExperimentalGameSession> = new Map(); // Map player UUID to GameSession

    public startNewGame(player1: Player, player2: Player, player1Uuid: string, player2Uuid: string) {
        const newGameSession = new ExperimentalGameSession(player1, player2);
        this.gameSessions.set(player1Uuid, newGameSession);
        this.gameSessions.set(player2Uuid, newGameSession);
    }

    public getGameSession(playerUuid: string): ExperimentalGameSession | undefined {
        return this.gameSessions.get(playerUuid);
    }

    public endGame(playerUuid: string) {
        // Retrieve the game session using the UUID of one of the players.
        const gameSession = this.gameSessions.get(playerUuid);

        if (gameSession) {
            // The actual end game logic and player notification is handled by GameSession.endGame()
            // Here, we focus on cleanup after GameSession has concluded its responsibilities.

            // Assuming GameSession.endGame() is called separately when the game logic determines the end has been reached.
            // If it's not automatically called, you might want to trigger it here, ensuring the game logic is neatly concluded before cleanup.
            // gameSession.endGame(); // Uncomment if you need to manually trigger game conclusion logic here.

            // Perform cleanup actions, such as logging, resource deallocation, or preparing players for a new game.

            // Finally, remove the session from the manager to free up resources and allow players to start new games.
            this.gameSessions.delete(gameSession.player1Uuid);
            this.gameSessions.delete(gameSession.player2Uuid);

            console.log(`Game session between ${gameSession.player1Username} and ${gameSession.player2Username} has been concluded and removed.`);
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
