import {WebSocket} from 'ws';
import {GameEngine, GameEngineDelegate, Path, PlayerUUID, RoundData, Winner} from "./GameEngine";
import {clearTimeout} from "timers";
import {MessagingService} from "./MessagingService";
import {Player, GameSessionPlayerDelegate, GameSessionPlayerService} from "./GameSessionPlayerService";
import {createScopedLogger} from "../../logger/Logger";

export class GameSession implements GameEngineDelegate, GameSessionPlayerDelegate {
    private readonly messagingService: MessagingService = new MessagingService();
    private readonly gameEngine: GameEngine = new GameEngine();
    playerService: GameSessionPlayerService = new GameSessionPlayerService();
    private readonly reconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map(); // Attributes to track reconnection timeouts
    private gameSessionState: 'sessionCreated' | 'exchangeInfo' | 'inGame' | 'ended' = 'sessionCreated';
    private logger = createScopedLogger('ExperimentalGameSession');

    get playersUUIDs(): string[] {
        return this.playerService.getAllPlayerUUIDs();
    }

    get isSessionEnded() {
        return this.gameSessionState === 'ended';
    }

    constructor(players: Player[]) {
        this.playerService.setDelegate(this);

        // Initialize the game session with the provided players
        for (const player of players) {
            this.playerService.addPlayer(player);
            this.messagingService.registerPlayerSocket(player.uuid, player.socket);
        }

        // Initialize the game engine
        this.gameEngine.setGridSize(4);
        this.gameEngine.setRoundDuration(30000);
        this.gameEngine.setIntermissionDuration(5000);
        this.gameEngine.setCheckGameOver((rounds: RoundData[]) => {
            // Check best of 3 rounds
            const wins = {player1: 0, player2: 0};
            for (const round of rounds) {
                if (round.winner === 'player1') wins.player1++;
                if (round.winner === 'player2') wins.player2++;
            }
            return wins.player1 > 1 || wins.player2 > 1;
        });
        this.gameEngine.setDelegate(this);

        this.logger.info(`Creating new game session with players: ${players.map(player => player.uuid)}`);

        // Send each-other's usernames
        this.sendMetaData();
    }

    private sendMetaData(): void {
        this.gameSessionState = 'exchangeInfo';

        // Directly get all usernames
        const allUsernames = this.playerService.getAllUsernames();

        // Iterate over all players
        this.playerService.forEachPlayer((playerUUID, username) => {
            const opponentUsernames = allUsernames.filter(name => name !== username);
            this.messagingService.publish('opponentUsernames', opponentUsernames, playerUUID);
        });
    }

    public playerAckToStart(playerUuid: string): void {
        // Mark the player as ready. Here, you'd track readiness in a map or similar structure.
        this.playerService.setPlayerReady(playerUuid, true);

        // Check if all players are ready
        if (this.playerService.isAllPlayersReady()) {
            this.startCountdown();
        }
    }

    private startCountdown() {
        let countdown = 3; // Start the countdown at 3
        const intervalId = setInterval(() => {
            // Send the countdown message to both players
            this.messagingService.publish('countdown', countdown, 'all')

            if (countdown > 1) {
                countdown--; // Decrease the countdown
            } else {
                // Countdown has finished, clear the interval
                clearInterval(intervalId);

                // Now actually start the game
                this.gameEngine.startGame();
            }
        }, 1000); // Set the interval to 1 second (1000 milliseconds)
    }

    public updateScore(playerUuid: PlayerUUID, wordPath: Path): void {
        const round = this.gameEngine.getCurrentRound();
        if (!round) return;
        this.gameEngine.addWord(playerUuid, wordPath);
    }

    //////////////////////////////////////////////////
    //             Game engine delegates            //
    //////////////////////////////////////////////////
    onRoundStart(roundData: RoundData): void {
        this.notifyPlayersRoundStart(roundData);
    }

    onRoundEnd(roundData: RoundData): void {
        this.notifyPlayersIntermission(roundData);
    }

    onScoreUpdate(playerUuid: PlayerUUID, score: number): void {
        this.notifyScoreToOpponent(playerUuid, score);
    }

    onGameEnd(winner: Winner): void {
        this.notifyPlayersGameEnd(winner);
    }

    onGameInitialize(): void {
    }

    onTimeUpdate(remainingTime: number): void {
        this.messagingService.publish('timeUpdate', remainingTime, 'all');
    }

    private notifyPlayersRoundStart(roundData: RoundData) {
        this.gameSessionState = 'inGame';

        let payload = {
            round: roundData.roundNumber,
            duration: roundData.duration,
            grid: roundData.grid,
        };

        // Send the grid to all players
        this.messagingService.publish(
            'roundStart',
            payload,
            'all'
        );

        this.logger.info(`Round ${roundData.roundNumber} started`);
    }

    private notifyPlayersIntermission(round: RoundData): void {
        // First, determine the winner based on the updated scores within the round
        let highestScore = -1;
        let winnerUuid: Winner | undefined = 'tie'; // Default to 'tie'
        round.playerData.forEach((data, uuid) => {
            if (data.score > highestScore) {
                highestScore = data.score;
                winnerUuid = uuid; // Update winner to current UUID
            } else if (data.score === highestScore) {
                winnerUuid = 'tie'; // If scores are equal, mark as tie
            }
        });

        // Updating the winner in round data
        round.winner = winnerUuid;

        // Notify each player with their personalized end round summary
        this.playerService.forEachPlayer((uuid, username) => {
            const playerData = round.playerData.get(uuid);
            const playerScore = playerData ? playerData.score : 0;
            const playerUUID = uuid as PlayerUUID;

            // Calculate the total score of all opponents for comparison
            let opponentScoreTotal = 0;
            round.playerData.forEach((data, uuid) => {
                if (uuid !== playerUUID) {
                    opponentScoreTotal += data.score;
                }
            });

            const endRoundPayload = {
                round: round.roundNumber,
                yourScore: playerScore,
                opponentScoreTotal: opponentScoreTotal, // This might need adjustment based on how you want to present opponent scores
                winner: winnerUuid
            };

            // Send the customized payload to each player
            this.messagingService.publish(
                'endRound',
                endRoundPayload,
                playerUUID
            );
        });
    }

    private notifyPlayersGameEnd(winner: Winner) {
        this.gameSessionState = 'ended';

        const gameEndPayload = {
            winner: winner,
            rounds: this.gameEngine.getRounds(),
        };

        // Send the game end message to all players
        this.messagingService.publish('gameEnd', gameEndPayload, 'all');

        this.logger.info(`Game ended. Winner: ${winner}`);
    }

    private notifyScoreToOpponent(playerUuid: string, score: number) {

        const scoreUpdateMessage = {
            playerUuid: playerUuid,
            newScore: score,
        };

        // Broadcast the updated score to all players except the one who scored
        this.messagingService.publish(
            'opponentScoreUpdate',
            scoreUpdateMessage,
            this.playerService.getAllPlayerUUIDs().filter(uuid => uuid !== playerUuid)
        );
    }

    //////////////////////////////////////////////////
    //           PlayerLifeCycle delegates          //
    //////////////////////////////////////////////////
    onPlayerReady(playerUUID: string): void {
        if (this.playerService.isAllPlayersReady()) {
            this.startCountdown();
        }
    }
    // TODO: REVISE RELATIONSHIP BETWEEN GAMESESSION AND PLAYERLIFECYCLE
    onPlayerDisconnected(playerUUID: string): void {
        // Set a timeout for player reconnection
        const reconnectionTimeout = setTimeout(() => {
            // Handle the case where the player does not reconnect in time
            this.logger.info(`Player ${playerUUID} did not reconnect in time.`);
            this.endGameDueToDisconnection(playerUUID);
        }, 10000); // Wait for 10 seconds

        // Store the timeout so it can be cleared upon successful reconnection
        this.reconnectionTimeouts.set(playerUUID, reconnectionTimeout);
    }

    onPlayerReconnected(playerUUID: string, newSocket: WebSocket): void {
        // Clear any reconnection timeout
        const timeout = this.reconnectionTimeouts.get(playerUUID);
        if (timeout) {
            clearTimeout(timeout);
            this.reconnectionTimeouts.delete(playerUUID);
        }

        this.messagingService.registerPlayerSocket(playerUUID, newSocket);
        this.messagingService.handlePlayerReconnection(playerUUID);
    }

    //////////////////////////////////////////////////
    //        Game ended du to disconnection        //
    //////////////////////////////////////////////////

    private endGameDueToDisconnection(playerUuid: string) {
        this.logger.info(`Ending game due to disconnection of player ${playerUuid}`);

        // End the game and notify the other player of the disconnection
        const gameEndPayload = {
            // Declare the other player as the winner
            // TODO: You might want to handle this differently
            winner: playerUuid ? this.playerService.getAllPlayerUUIDs().find(uuid => uuid !== playerUuid) : undefined,
            rounds: this.gameEngine.getRounds()
        };

        // Send the game end message to all players
        this.messagingService.publish('gameEndByDisconnection', gameEndPayload, 'all');

        this.gameEngine.endGame();
    }

}

// public handlePlayerReconnection(playerUuid: string, newSocket: WebSocket) {
//     // Clear any reconnection timeout
//     const timeout = this.reconnectionTimeouts.get(playerUuid);
//     if (timeout) {
//         clearTimeout(timeout);
//         this.reconnectionTimeouts.delete(playerUuid);
//     }
//
//     // Register the new socket with the messaging service
//     this.messagingService.registerPlayerSocket(playerUuid, newSocket);
//
//     // Handle the player's reconnection
//     this.messagingService.handlePlayerReconnection(playerUuid);
// }


// public handlePlayerDisconnection(playerUuid: string) {
//     // Set a timeout for player reconnection
//     const reconnectionTimeout = setTimeout(() => {
//         // Handle the case where the player does not reconnect in time
//         console.log(`Player ${playerUuid} did not reconnect in time.`);
//         this.endGameDueToDisconnection(playerUuid);
//     }, 10000); // Wait for 10 seconds
//
//     // Store the timeout so it can be cleared upon successful reconnection
//     this.reconnectionTimeouts.set(playerUuid, reconnectionTimeout);
// }