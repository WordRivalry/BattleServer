import { clearInterval } from "timers";
import { GameSession } from "../GameSession";
import { GameEngine, GameEngineDelegate, RoundData, WinnerResult } from "../../gameEngine/GameEngine";
import { createScopedLogger } from "../../logger/logger";
import { PlayerUUID } from "../../../types";
import { PlayerMetadata } from "../GameSessionManager";
import { PlayerAction_PublishWord } from "../../server_networking/validation/messageType";

export class NormalRankGameSession extends GameSession implements GameEngineDelegate {
    private readonly gameEngine: GameEngine = new GameEngine();
    private logger = createScopedLogger('NormalRankGameSession');

    constructor(
        public gameSessionId: string,
        public playersMetadata: PlayerMetadata[],
        public gameMode: string,
        public modeType: string
    ) {

        super(
            gameSessionId,
            playersMetadata,
            gameMode,
            modeType
        );

        // Initialize the game engine
        this.gameEngine.setGridSize(4);
        this.gameEngine.setCheckGameOver("BestOfOne")
        this.gameEngine.setRoundDuration(90000);

        // Set the delegates
        this.gameEngine.setDelegate(this);
    }

    private startCountdown() {
        this.changeStateToInProgress();
        let countdown = 3;
        const intervalId = setInterval(async () => {
            // Send the countdown message to both players
            this.sessionNetworking.sendData('gameStartCountdown', countdown, 'all')

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

    //////////////////////////////////////////////////
    //               Network Delegates              //
    //////////////////////////////////////////////////

    override onAPlayerJoined(player: string): void {
        this.logger.context('handlePlayerJoins').info('Player joined', {player, gameSessionUUID: this.gameSessionId});
    }

    override onAllPlayersJoined(): void {
        this.startCountdown();
    }

    override onAction(player: string, action: PlayerAction_PublishWord): void {
        const round = this.gameEngine.getCurrentRound();
        if (!round) return;
        this.gameEngine.addWord(player, (action.payload.data.wordPath));
    }

    override onPlayerLeft(player: string): void {
        this.logger.context('handlePlayerLeaves').info('Ending game due to player leaving', {player: player, gameSessionUUID: this.gameSessionId});

        // End the game and notify the other player of the disconnection
        const gameEndPayload = {
            winner: player ? this.playersMetadata.find(p => p.uuid !== player)?.uuid : undefined, rounds: this.gameEngine.getRounds()
        };

        // Send the game end message to all players
        this.sessionNetworking.sendData('gameEndByPlayerLeft', gameEndPayload);
        this.gameEngine.endGame();
    }

    //////////////////////////////////////////////////
    //             Game engine delegates            //
    //////////////////////////////////////////////////

    onRoundStart(roundData: RoundData): void {
        let payload = {
            round: roundData.roundNumber + 1, duration: roundData.duration, grid: roundData.grid,
        };

        // Send the grid to all players
        this.sessionNetworking.sendData('roundStart', payload);

        this.logger.context('notifyPlayersRoundStart').info('Round started', {round: roundData.roundNumber + 1, gameSessionUUID: this.gameSessionId});
    }

    onScoreUpdate(playerUuid: PlayerUUID, score: number): void {

        const scoreUpdateMessage = {
            playerUuid: playerUuid, newScore: score,
        };

        // Broadcast the updated score to all players except the one who scored
        this.sessionNetworking.sendData('opponentScoreUpdate', scoreUpdateMessage, this.playersMetadata.filter(player => player.uuid !== playerUuid).map(player => player.uuid));

        this.logger.context('notifyPlayersScoreUpdate').info('Score updated', {playerUuid, newScore: score, gameSessionUUID: this.gameSessionId});
    }

    onRoundEnd(round: RoundData): void {
        // Assume round.winner is already determined by the game engine and is of type WinnerResult
        let winnerResult: WinnerResult

        if (round.winner) {
            winnerResult = round.winner;
        } else {
            this.logger.context('notifyPlayersIntermission').warn('Winner result is not available', {gameSessionUUID: this.gameSessionId});
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
                round: round.roundNumber + 1, yourScore: playerScore, opponentScoreTotal: opponentScoreTotal
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
            this.sessionNetworking.sendData('endRound', endRoundPayload, playerUUID);
        });
    }

    onGameEnd(winner: WinnerResult): void {
        const gameEndPayload = {
            winner: winner, rounds: this.gameEngine.getRounds(),
        };

        // Send the game end message to all players
        this.sessionNetworking.sendData('gameEnd', gameEndPayload);
        this.logger.context('notifyPlayersGameEnd').debug('Game ended. Winner', {winner, gameSessionUUID: this.gameSessionId});
        this.closeGameSession();
    }

    onTick(remainingTime: number): void {
        this.sessionNetworking.sendData('timeUpdate', remainingTime);
    }
}