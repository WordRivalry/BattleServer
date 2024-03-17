import {clearInterval} from "timers";
import {GameSession} from "./GameSession";
import {GameEngine, GameEngineDelegate, RoundData, WinnerResult} from "./GameEngine";
import {createScopedLogger} from "../logger/logger";
import {PlayerUUID} from "../../types";
import {PlayerMetadata} from "./GameSessionManager";
import {Path} from "./GameEngine";
import {PlayerAction_PublishWord} from "../server_networking/validation/messageType";

export class NormalRankGameSession extends GameSession implements GameEngineDelegate {
    private readonly gameEngine: GameEngine = new GameEngine();
    private NormalRankLogger = createScopedLogger('NormalRankGameSession');

    constructor(
        public uuid: string,
        public playersMetadata: PlayerMetadata[],
        public gameMode: string,
        public modeType: string
    ) {

        super(
            uuid,
            playersMetadata,
            gameMode,
            modeType
        );

        // Initialize the game engine
        this.gameEngine.setGridSize(4);
        this.gameEngine.setRoundDuration(30000);
       // this.gameEngine.setIntermissionDuration(5000);

        // Set the delegates
        this.gameEngine.setDelegate(this);
    }

    private startCountdown() {
        this.isProgressing = true;
        let countdown = 3;
        const intervalId = setInterval(async () => {
            // Send the countdown message to both players
            this.messagingService.publish('gameStartCountdown', countdown, 'all')

            if (countdown > 1) {
                countdown--; // Decrease the countdown
            } else {
                // Countdown has finished, clear the interval
                clearInterval(intervalId);

                // Now actually start the game
                await this.gameEngine.startGame();
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

        this.NormalRankLogger.context('notifyPlayersRoundStart').info('Round started', {round: roundData.roundNumber + 1, gameSessionUUID: this.uuid});
    }

    onScoreUpdate(playerUuid: PlayerUUID, score: number): void {

        const scoreUpdateMessage = {
            playerUuid: playerUuid, newScore: score,
        };

        // Broadcast the updated score to all players except the one who scored
        this.messagingService.publish('opponentScoreUpdate', scoreUpdateMessage, this.playersMetadata.filter(player => player.uuid !== playerUuid).map(player => player.uuid));

        this.NormalRankLogger.context('notifyPlayersScoreUpdate').info('Score updated', {playerUuid, newScore: score, gameSessionUUID: this.uuid});
    }

    onRoundEnd(round: RoundData): void {
        // Assume round.winner is already determined by the game engine and is of type WinnerResult
        let winnerResult: WinnerResult

        if (round.winner) {
            winnerResult = round.winner;
        } else {
            this.NormalRankLogger.context('notifyPlayersIntermission').warn('Winner result is not available', {gameSessionUUID: this.uuid});
            return;
        }

        // Notify each player with their personalized end round summary
        this.playersMetadata.forEach((metadata: PlayerMetadata) => {
            const playerData = round.playerData.get(metadata.uuid);
            const playerScore = playerData ? playerData.score : 0;
            const playerUUID = metadata.uuid as PlayerUUID;

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
                    endRoundPayload.winner = winnerResult.winners[0] === metadata.uuid ? 'You' : 'Opponent';
                    break;
                case 'tie':
                    endRoundPayload.winner = 'tie';
                    break;
                case 'ranked':
                    // If ranked, determine if the player is among the winners, and their rank
                    const rank = winnerResult.winners.indexOf(metadata.uuid) + 1; // +1 to make it 1-indexed
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
        this.NormalRankLogger.context('notifyPlayersGameEnd').debug('Game ended. Winner', {winner, gameSessionUUID: this.uuid});
        // Emit the game end event
        this.closeGameSession();
    }

    onTimeUpdate(remainingTime: number): void {
        this.messagingService.publish('timeUpdate', remainingTime, 'all');
    }

    //////////////////////////////////////////////////
    //                Abstract methods              //
    //////////////////////////////////////////////////

    override handlePlayerAction(playerUUID: string, action: PlayerAction_PublishWord): void {
        const round = this.gameEngine.getCurrentRound();
        if (!round) return;
        this.gameEngine.addWord(playerUUID, (action.payload.data.wordPath));
    }

    override handlePlayerLeaves(playerUUID: string): void {
        this.NormalRankLogger.context('handlePlayerLeaves').info('Ending game due to player leaving', {playerUUID, gameSessionUUID: this.uuid});

        // End the game and notify the other player of the disconnection
        const gameEndPayload = {
            winner: playerUUID ? this.playersMetadata.find(player => player.uuid !== playerUUID)?.uuid : undefined, rounds: this.gameEngine.getRounds()
        };

        // Send the game end message to all players
        this.messagingService.publish('gameEndByPlayerLeft', gameEndPayload, 'all');
        this.gameEngine.endGame();
    }

    override startGame(): void {
        // Send the metadata and start the countdown
        this.isProgressing = true;
        this.startCountdown();
    }
}