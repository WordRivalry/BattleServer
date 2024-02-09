import {WebSocket} from 'ws';
import {GameEngine, GameEngineDelegate, Path, PlayerUUID, RoundData, WinnerResult} from "./GameEngine";
import {clearInterval} from "timers";
import {MessagingService} from "./MessagingService";
import {GameSessionPlayerDelegate, GameSessionPlayerService, Player} from "./GameSessionPlayerService";
import {createScopedLogger} from "../../logger/Logger";
import {GameSessionCallback} from "../GameSessionManager";

export class GameSession implements GameEngineDelegate, GameSessionPlayerDelegate {
    private readonly messagingService: MessagingService = new MessagingService();
    private readonly gameEngine: GameEngine = new GameEngine();
    playerService: GameSessionPlayerService = new GameSessionPlayerService();
    private logger = createScopedLogger('GameSession');
    private gameSessionCallback: GameSessionCallback;
    private readonly gameSessionUUID: string;

    get playersUUIDs(): string[] {
        return this.playerService.getAllPlayerUUIDs();
    }

    constructor(players: Player[], gameSessionUUID: string, gameSessionCallback: GameSessionCallback) {
        // Initialize the game session with the provided players
        for (const player of players) {
            this.playerService.addPlayer(player);
            this.messagingService.registerPlayerSocket(player.uuid, player.socket);
        }

        this.gameSessionUUID = gameSessionUUID;
        this.gameSessionCallback = gameSessionCallback;

        // Initialize the game engine
        this.gameEngine.setGridSize(4);
        this.gameEngine.setRoundDuration(30000);
        this.gameEngine.setIntermissionDuration(5000);

        // Set the delegates
        this.gameEngine.setDelegate(this);
        this.playerService.setDelegate(this);

        // Send the metadata and start the countdown
        this.sendMetaData();
        this.startCountdown();
    }

    private sendMetaData(): void {
        const allUsernames = this.playerService.getAllUsernames();
        this.playerService.forEachPlayer((playerUUID, username) => {
            const opponentUsernames = allUsernames.filter(name => name !== username);
            this.messagingService.publish('opponentUsernames', opponentUsernames, playerUUID);
        });
    }

    private startCountdown() {
        let countdown = 3;
        const intervalId = setInterval(() => {
            // Send the countdown message to both players
            this.messagingService.publish('gameStartCountdown', countdown, 'all')

            if (countdown > 1) {
                countdown--; // Decrease the countdown
            } else {
                // Countdown has finished, clear the interval
                clearInterval(intervalId);

                // Now actually start the game
                this.gameEngine.startGame();
            }
        }, 1000);
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
        let payload = {
            round: roundData.roundNumber + 1, duration: roundData.duration, grid: roundData.grid,
        };

        // Send the grid to all players
        this.messagingService.publish('roundStart', payload, 'all');

        this.logger.context('notifyPlayersRoundStart').info('Round started', {round: roundData.roundNumber + 1, gameSessionUUID: this.gameSessionUUID});
    }

    onScoreUpdate(playerUuid: PlayerUUID, score: number): void {

        const scoreUpdateMessage = {
            playerUuid: playerUuid, newScore: score,
        };

        // Broadcast the updated score to all players except the one who scored
        this.messagingService.publish('opponentScoreUpdate', scoreUpdateMessage, this.playerService.getAllPlayerUUIDs().filter(uuid => uuid !== playerUuid));

        this.logger.context('notifyPlayersScoreUpdate').info('Score updated', {playerUuid, newScore: score, gameSessionUUID: this.gameSessionUUID});
    }

    onRoundEnd(round: RoundData): void {
        // Assume round.winner is already determined by the game engine and is of type WinnerResult
        let winnerResult: WinnerResult

        if (round.winner) {
            winnerResult = round.winner;
        } else {
            this.logger.context('notifyPlayersIntermission').warn('Winner result is not available', {gameSessionUUID: this.gameSessionUUID});
            return;
        }

        // Notify each player with their personalized end round summary
        this.playerService.forEachPlayer((uuid, username) => {
            const playerData = round.playerData.get(uuid);
            const playerScore = playerData ? playerData.score : 0;
            const playerUUID = uuid as PlayerUUID;

            // Calculate the total score of all opponents for comparison
            let opponentScoreTotal = 0;
            round.playerData.forEach((data, opUuid) => {
                if (opUuid !== playerUUID) {
                    opponentScoreTotal += data.score;
                }
            });

            // Prepare the payload for the end of round summary
            let endRoundPayload: any = {
                round: round.roundNumber, yourScore: playerScore, opponentScoreTotal: opponentScoreTotal, // This could be adjusted based on presentation preferences
            };

            // Adjust the payload based on the winner result
            switch (winnerResult.status) {
                case 'singleWinner':
                    endRoundPayload.winner = winnerResult.winners[0] === uuid ? 'You' : 'Opponent';
                    break;
                case 'tie':
                    endRoundPayload.winner = 'tie';
                    break;
                case 'ranked':
                    // If ranked, determine if the player is among the winners, and their rank
                    const rank = winnerResult.winners.indexOf(uuid) + 1; // +1 to make it 1-indexed
                    endRoundPayload.winner = rank > 0 ? `Rank ${rank}` : 'Not ranked';
                    break;
            }

            // Send the customized payload to each player
            this.messagingService.publish('endRound', endRoundPayload, playerUUID);
        });
    }

    onGameEnd(winner: WinnerResult): void {
        const gameEndPayload = {
            winner: winner, rounds: this.gameEngine.getRounds(),
        };

        // Send the game end message to all players
        this.messagingService.publish('gameEnd', gameEndPayload, 'all');
        this.logger.context('notifyPlayersGameEnd').debug('Game ended. Winner', {winner, gameSessionUUID: this.gameSessionUUID});
        this.gameSessionCallback.onGameEnd(this.gameSessionUUID);
    }

    onTimeUpdate(remainingTime: number): void {
        this.messagingService.publish('timeUpdate', remainingTime, 'all');
    }

    //////////////////////////////////////////////////
    //           PlayerLifeCycle delegates          //
    //////////////////////////////////////////////////
    onPlayerReconnected(playerUUID: string, newSocket: WebSocket): void {
        this.logger.context('onPlayerReconnected').info('Player reconnected', {playerUUID, gameSessionUUID: this.gameSessionUUID});
        this.messagingService.registerPlayerSocket(playerUUID, newSocket);
        this.messagingService.handlePlayerReconnection(playerUUID);
    }

    onPlayerTimedOut(playerUuid: string) {
        this.logger.context('endGameDueToDisconnection').info('Ending game due to disconnection of player', {playerUuid, gameSessionUUID: this.gameSessionUUID});

        // End the game and notify the other player of the disconnection
        const gameEndPayload = {
            // TODO: handle this differently
            winner: playerUuid ? this.playerService.getAllPlayerUUIDs().find(uuid => uuid !== playerUuid) : undefined, rounds: this.gameEngine.getRounds()
        };

        // Send the game end message to all players
        this.messagingService.publish('gameEndByDisconnection', gameEndPayload, 'all');

        this.gameEngine.endGame();
    }
}