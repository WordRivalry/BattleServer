import {Player} from "../QueueService";
import {WebSocket} from 'ws';
import {GameEngine, GameEngineDelegate, Path, PlayerUUID, RoundData, Winner} from "./GameEngine";
import {clearTimeout} from "timers";
import {PlayerService} from "./PlayerService";
import {MessagingService} from "./MessagingService";

export class ExperimentalGameSession implements GameEngineDelegate {
    private readonly playerService: PlayerService = new PlayerService();
    private readonly messagingService: MessagingService = new MessagingService();
    private readonly gameEngine: GameEngine = new GameEngine();

    private readonly reconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map(); // Attributes to track reconnection timeouts
    private readonly playerReadyStates: Map<string, boolean> = new Map(); // Attributes to track player readiness
    private gameSessionState: 'sessionCreated' | 'exchangeInfo' | 'inGame' | 'ended' = 'sessionCreated';

    get playersUUIDs(): string[] {
        return this.playerService.getAllPlayerUUIDs();
    }

    get isSessionEnded() {
        return this.gameSessionState === 'ended';
    }

    constructor(players: Player[]) {
        // Initialize the game session with the provided players
        for (const player of players) {
            this.playerService.addPlayer(player);
            this.playerReadyStates.set(player.uuid, false);
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

        // Send each-other's usernames
        this.sendMetaData();
    }

    private sendMetaData(): void {
        this.gameSessionState = 'exchangeInfo';

        // Directly get all usernames
        const allUsernames = this.playerService.getAllUsernames();

        // Iterate over all players
        this.playerService.forEachPlayer(currentPlayer => {
            // Exclude the current player's username from the list of opponents
            const opponentsUsernames = allUsernames.filter(username => username !== currentPlayer.username);

            // Send opponentsUsernames to the current player
            this.messagingService.publish(
                'metaData',
                { opponentsUsernames: opponentsUsernames },
                currentPlayer.uuid
            );
        });
    }

    public playerAckToStart(playerUuid: string): void {
        // Mark the player as ready. Here, you'd track readiness in a map or similar structure.
        this.playerReadyStates.set(playerUuid, true);

        // Check if all players are ready
        if (this.areAllPlayersReady()) {
            this.startCountdown();
        }
    }

    private areAllPlayersReady(): boolean {
        // Check readiness for all players
        return Array.from(this.playerReadyStates.values()).every(isReady => isReady);
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
    //        Disconnection and reconnection        //
    //////////////////////////////////////////////////

    public handlePlayerDisconnection(playerUuid: string) {
        // Set a timeout for player reconnection
        const reconnectionTimeout = setTimeout(() => {
            // Handle the case where the player does not reconnect in time
            console.log(`Player ${playerUuid} did not reconnect in time.`);
            this.endGameDueToDisconnection(playerUuid);
        }, 10000); // Wait for 10 seconds

        // Store the timeout so it can be cleared upon successful reconnection
        this.reconnectionTimeouts.set(playerUuid, reconnectionTimeout);
    }

    private endGameDueToDisconnection(playerUuid: string) {
        // End the game prematurely due to a player not reconnecting in time
        // You might decide to declare the other player as the winner or handle it differently

        console.log(`Game ended due to player ${playerUuid} not reconnecting in time.`);

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

    public handlePlayerReconnection(playerUuid: string, newSocket: WebSocket) {
        // Clear any reconnection timeout
        const timeout = this.reconnectionTimeouts.get(playerUuid);
        if (timeout) {
            clearTimeout(timeout);
            this.reconnectionTimeouts.delete(playerUuid);
        }

        // Find the player and update their socket
        const player = this.playerService.getPlayer(playerUuid);
        if (!player) {
            console.error(`Player ${playerUuid} not found.`);
            return;
        }
        player.socket = newSocket;

        // Register the new socket with the messaging service
        this.messagingService.registerPlayerSocket(playerUuid, newSocket);

        // Handle the player's reconnection
        this.messagingService.handlePlayerReconnection(playerUuid);
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
        // TODO: Notify players of the game end
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

        console.log(`New round started. Grid and timer sent.`);
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
        this.playerService.forEachPlayer(player => {
            const playerData = round.playerData.get(player.uuid);
            const playerScore = playerData ? playerData.score : 0;

            // Calculate the total score of all opponents for comparison
            let opponentScoreTotal = 0;
            round.playerData.forEach((data, uuid) => {
                if (uuid !== player.uuid) {
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
                player.uuid
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

        console.log(`Game ended. Winner: ${winner}`);
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
}
