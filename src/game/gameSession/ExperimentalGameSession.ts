import {LetterGrid, LetterTile} from "../LetterGrid";
import {Player} from "../QueueService";
import {WebSocket} from 'ws';
import {GameEngine, GameEngineDelegate, GameEngineState, Path, RoundData} from "./GameEngine";
import {clearTimeout} from "timers";

export class ExperimentalGameSession implements GameEngineDelegate {
    private readonly player1: Player;
    private readonly player2: Player;
    private gameSessionState: 'sessionCreated' | 'exchangeInfo' | 'inGame' | 'ended' = 'sessionCreated';
    private gameEngine: GameEngine;
    private reconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map(); // Attributes to track reconnection timeouts
    private player1AckToStart: boolean = false;
    private player2AckToStart: boolean = false;

    constructor(player1: Player, player2: Player) {
        this.player1 = player1;
        this.player2 = player2;
        this.sendMetaData();

        // Initialize GameEngine with a state change handler
        this.gameEngine = new GameEngine();
        this.gameEngine.setGridSize(4)
        this.gameEngine.setRoundDuration(30000)
        this.gameEngine.setIntermissionDuration(5000)
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
    }

    get player1Uuid() {
        return this.player1.uuid;
    }

    get player2Uuid() {
        return this.player2.uuid;
    }

    get player1Username() {
        return this.player1.username;
    }

    get player2Username() {
        return this.player2.username;
    }

    get isSessionEnded() {
        return this.gameSessionState === 'ended';
    }

    public playerAckToStart(playerUuid: string) {
        if (playerUuid === this.player1.uuid) {
            this.player1AckToStart = true;
        } else if (playerUuid === this.player2.uuid) {
            this.player2AckToStart = true;
        }

        if (this.player1AckToStart && this.player2AckToStart) {
            this.gameEngine.startGame()
        }
    }

    // GameEngineDelegate methods
    onRoundStart(roundData: RoundData): void {
        // Handle round start
        this.notifyPlayersRoundStart(roundData);
    }

    onRoundEnd(roundData: RoundData): void {
        // Handle round end
        this.notifyPlayersIntermission(roundData);
    }

    onScoreUpdate(playerUuid: 'player1' | 'player2', score: number): void {
        // Handle score update
        this.notifyScoreToOpponent(playerUuid, score);
    }

    onGameEnd(winner: 'player1' | 'player2' | 'tie'): void {
        // Handle game end
        this.notifyPlayersGameEnd();
    }

    onGameInitialize(): void {

    }

    onTimeUpdate(remainingTime: number): void {
        this.sendToPlayer(this.player1, {type: 'timeUpdate', remainingTime});
        this.sendToPlayer(this.player2, {type: 'timeUpdate', remainingTime});
    }

    public updateScore(playerUuid: string, wordPath: Path, newScore: number) {
        // Update score in the current round for the appropriate player
        const round = this.gameEngine.getCurrentRound();
        if (!round) return;
        if (playerUuid === this.player1.uuid) {
            round.player1Score = newScore;
            this.gameEngine.addWord(playerUuid === this.player1.uuid ? 'player1' : 'player2', wordPath);
            // Broadcast the updated score from player1 to player2
            this.player2.socket.send(JSON.stringify({type: 'opponentScoreUpdate', score: newScore}));
        } else {
            round.player2Score = newScore;
            this.gameEngine.addWord(playerUuid === this.player1.uuid ? 'player1' : 'player2', wordPath);
            // Broadcast the updated score from player2 to player1
            this.player1.socket.send(JSON.stringify({type: 'opponentScoreUpdate', score: newScore}));
        }
    }

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

    public handlePlayerReconnection(playerUuid: string, newSocket: WebSocket) {
        // Clear any reconnection timeout
        const timeout = this.reconnectionTimeouts.get(playerUuid);
        if (timeout) {
            clearTimeout(timeout);
            this.reconnectionTimeouts.delete(playerUuid);
        }

        // Update player's socket
        if (playerUuid === this.player1.uuid) {
            this.player1.socket = newSocket;
        } else if (playerUuid === this.player2.uuid) {
            this.player2.socket = newSocket;
        }

        switch (this.gameSessionState) {
            case 'sessionCreated' || 'exchangeInfo':
                this.resendMetaData(playerUuid);
                break;
            case 'inGame':
                switch (this.gameEngine.getCurrentState()) {
                    case 'inRound':
                        this.resendCurrentRoundState(playerUuid);
                        break;
                    case 'intermission':
                        this.resendIntermissionState(playerUuid);
                        break;
                    case 'ended':
                        this.resendEndGameState(playerUuid);
                        break;
                }
                break;
            case 'ended':
                this.resendEndGameState(playerUuid);
                break;
        }

        // Resend appropriate data based on game session state
        switch (this.gameSessionState) {
            case 'exchangeInfo':
                this.resendMetaData(playerUuid);
                break;
        }

        console.log(`Player ${playerUuid} successfully reconnected during ${this.gameSessionState}.`);
    }

    private sendMetaData() {
        this.gameSessionState = 'exchangeInfo';

        // Send initial metadata about the opponents
        const metaDataPayload1 = {
            type: 'metaData', opponentUsername: this.player2.username,
        };

        const metaDataPayload2 = {
            type: 'metaData', opponentUsername: this.player1.username,
        };

        // Send metadata to each player
        this.player1.socket.send(JSON.stringify(metaDataPayload1));
        this.player2.socket.send(JSON.stringify(metaDataPayload2));

        console.log(`Metadata sent to both players: ${this.player1.username} vs ${this.player2.username}`);
    }

    private sendToPlayer(player: Player, message: object) {
        if (player.socket && player.socket.readyState === WebSocket.OPEN) {
            player.socket.send(JSON.stringify(message));
        }
    }

    private notifyPlayersRoundStart(roundData: RoundData) {
        this.gameSessionState = 'inGame';

        const gameStartPayload = {
            type: 'gameStart', startTime: roundData.startTime, duration: roundData.duration, grid: roundData.grid,
        };

        // Send the grid to both players
        this.sendToPlayer(this.player1, gameStartPayload);
        this.sendToPlayer(this.player2, gameStartPayload);

        console.log(`New round started. Grid and timer sent.`);
    }

    private notifyPlayersIntermission(round: RoundData) {
        // Determine the winner of the current round and update round data
        round.winner = round.player1Score > round.player2Score ? 'player1' : round.player1Score < round.player2Score ? 'player2' : 'tie';

        // Announce end of round and send scores and winner to both players
        const endRoundPayload = {
            type: 'endRound', round: round.roundNumber, player1Score: round.player1Score, player2Score: round.player2Score, winner: round.winner,
        };

        this.sendToPlayer(this.player1, endRoundPayload);
        this.sendToPlayer(this.player2, endRoundPayload);
    }

    private notifyPlayersGameEnd() {
        // Determine the game winner based on rounds won
        const wins = {player1: 0, player2: 0};

        this.gameEngine.getRounds().forEach(round => {
            if (round.winner === 'player1') wins.player1++;
            if (round.winner === 'player2') wins.player2++;
        });

        this.gameSessionState = 'ended';

        const gameWinner = wins.player1 > wins.player2 ? 'player1' : 'player2';
        const gameEndPayload = {
            type: 'gameEnd', winner: gameWinner, rounds: this.gameEngine.getRounds(),
        };

        // Send the game end message to both players
        this.player1.socket.send(JSON.stringify(gameEndPayload));
        this.player2.socket.send(JSON.stringify(gameEndPayload));

        console.log(`Game ended. Winner: ${gameWinner}`);
    }

    private notifyScoreToOpponent(playerUuid: string, score: number) {
        const opponent = playerUuid === this.player1.uuid ? this.player2 : this.player1;
        const scorePayload = {
            type: 'opponentScoreUpdate', score,
        };
        this.sendToPlayer(opponent, scorePayload);
    }

    private endGameDueToDisconnection(playerUuid: string) {
        // End the game prematurely due to a player not reconnecting in time
        // You might decide to declare the other player as the winner or handle it differently

        console.log(`Game ended due to player ${playerUuid} not reconnecting in time.`);

        // End the game and notify the other player of the disconnection
        const gameEndPayload = {
            type: 'gameEndByDisconnection', winner: playerUuid === this.player1.uuid ? 'player2' : 'player1', rounds: this.gameEngine.getRounds()
        };

        this.gameEngine.endGame();
    }
    private resendMetaData(playerUuid: string) {
        // Resend opponent's username and any initial game info
        const player = playerUuid === this.player1.uuid ? this.player1 : this.player2;
        const opponent = playerUuid === this.player1.uuid ? this.player2 : this.player1;
        const metaDataPayload = {
            type: 'metaData', opponentUsername: opponent.username,
        };
        player.socket.send(JSON.stringify(metaDataPayload));
    }
    private resendCurrentRoundState(playerUuid: string) {

        const round = this.gameEngine.getCurrentRound();
        if (!round) return;

        // Resend the current round's grid, scores, and remaining time
        const player = playerUuid === this.player1.uuid ? this.player1 : this.player2;

        const remainingTime = round.endTime ? Math.max(0, round.endTime - Date.now()) : round.duration;
        const gameStatePayload = {
            type: 'gameState', round: round.roundNumber, grid: round.grid, player1Score: round.player1Score, player2Score: round.player2Score, remainingTime,
        };
        player.socket.send(JSON.stringify(gameStatePayload));
    }
    private resendIntermissionState(playerUuid: string) {
        // Inform the player about the intermission and the next round start
        const player = playerUuid === this.player1.uuid ? this.player1 : this.player2;
        const intermissionPayload = {
            type: 'intermission', nextRoundStartIn: this.gameEngine.getRemainingTimeOnClock()
        };
        player.socket.send(JSON.stringify(intermissionPayload));
    }
    private resendEndGameState(playerUuid: string) {
        // Resend the end game state with final scores and winner
        const wins = this.calculateWins();
        const gameEndPayload = {
            type: 'gameEnd', winner: wins.player1 > wins.player2 ? 'player1' : 'player2', rounds: this.gameEngine.getRounds(),
        };
        const player = playerUuid === this.player1.uuid ? this.player1 : this.player2;
        player.socket.send(JSON.stringify(gameEndPayload));
    }

    private calculateWins() {
        const wins = {player1: 0, player2: 0};
        for (const round of this.gameEngine.getRounds()) {
            if (round.winner === 'player1') wins.player1++;
            if (round.winner === 'player2') wins.player2++;
        }
        return wins;
    }
}
