import {LetterGrid, LetterTile} from "../LetterGrid";
import {Player} from "../QueueService";
import {WebSocket} from 'ws';
import {GameEngine} from "./GameEngine";

interface RoundData {
    player1Score: number;
    player2Score: number;
    winner: 'player1' | 'player2' | 'tie' | undefined;
    words: {
        player1: string[];
        player2: string[];
    };
    grid: LetterGrid;
    startTime: number; // Timestamp when the round started
    duration: number; // Duration of the round in milliseconds
    endTime?: number; // Timestamp when the round ended (optional, only if the round has ended)
}

export class GameSession {
    private readonly player1: Player;
    private readonly player2: Player;
 //   private gameEngine: GameEngine;

    private rounds: RoundData[] = [];
    private currentRound: number = 0; // Use 0-based indexing for rounds array
    private reconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map(); // Attributes to track reconnection timeouts
    private roundDuration: number = 30000; // 30 seconds in milliseconds
    private betweenRoundDuration: number = 5000; // 5 seconds in milliseconds
    // private gameClock: GameClock | undefined = undefined;

    private gameSessionState: 'sessionCreated' | 'exchangeInfo' | 'inRound' | 'intermission' | 'ended' = 'sessionCreated';

    constructor(player1: Player, player2: Player) {
        this.player1 = player1;
        this.player2 = player2;
        this.sendMetaData()
        // this.gameEngine = new GameEngine(this.handleGameEngineStateChange);
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

    // private handleGameEngineStateChange = (state: string, data?: any) => {
    //     switch (state) {
    //         case 'inRound':
    //             // Notify players that a new round has started
    //             this.sendToPlayer(this.player1, { type: 'roundStart', data });
    //             this.sendToPlayer(this.player2, { type: 'roundStart', data });
    //             break;
    //         case 'intermission':
    //             // Notify players of intermission
    //             this.sendToPlayer(this.player1, { type: 'intermissionStart', data });
    //             this.sendToPlayer(this.player2, { type: 'intermissionStart', data });
    //             break;
    //         case 'ended':
    //             // Notify players that the game session has ended
    //             this.sendToPlayer(this.player1, { type: 'sessionEnded' });
    //             this.sendToPlayer(this.player2, { type: 'sessionEnded' });
    //             break;
    //         // Handle other states as needed
    //     }
    // };
    //
    // private sendToPlayer(player: Player, message: object) {
    //     if (player.socket && player.socket.readyState === WebSocket.OPEN) {
    //         player.socket.send(JSON.stringify(message));
    //     }
    // }

    private sendMetaData() {
        this.gameSessionState = 'exchangeInfo';

        // Send initial metadata about the opponents
        const metaDataPayload1 = {
            type: 'metaData',
            opponentUsername: this.player2.username,
        };

        const metaDataPayload2 = {
            type: 'metaData',
            opponentUsername: this.player1.username,
        };

        // Send metadata to each player
        this.player1.socket.send(JSON.stringify(metaDataPayload1));
        this.player2.socket.send(JSON.stringify(metaDataPayload2));

        console.log(`Metadata sent to both players: ${this.player1.username} vs ${this.player2.username}`);

        // After sending metadata, you can proceed to start the game or first round
        this.startNewRound();
    }

    private startNewRound() {
        const grid = this.generateLetterGrid();

        const roundStartTime = Date.now();

        // Start a new round if the game is not over
        this.rounds.push({
            player1Score: 0,
            player2Score: 0,
            winner: undefined,
            words: { player1: [], player2: [] },
            grid: grid,
            startTime: roundStartTime,
            duration:  this.roundDuration,
        });

        this.gameSessionState = 'inRound';

        this.currentRound = this.rounds.length - 1;

        const gameStartPayload = {
            type: 'gameStart',
            startTime: roundStartTime,
            duration:  this.roundDuration,
            grid: grid,
        };

        // Send the grid to both players
        this.player1.socket.send(JSON.stringify(gameStartPayload));
        this.player2.socket.send(JSON.stringify(gameStartPayload));



        console.log(`New round started. Grid and timer sent.`);

        // Schedule the round to end after ${this.roundDuration} seconds
        setTimeout(() => {
            this.endRound();
        }, this.roundDuration);
    }

    private endRound() {
        // Determine the winner of the current round and update round data
        const round = this.rounds[this.currentRound];
        round.winner = round.player1Score > round.player2Score ? 'player1' :
            round.player1Score < round.player2Score ? 'player2' : 'tie';

        // Announce end of round and send scores and winner to both players
        const endRoundPayload = {
            type: 'endRound',
            round: this.currentRound + 1, // +1 for 1-based indexing in the payload
            player1Score: round.player1Score,
            player2Score: round.player2Score,
            winner: round.winner,
        };

        this.gameSessionState = 'intermission';

        this.player1.socket.send(JSON.stringify(endRoundPayload));
        this.player2.socket.send(JSON.stringify(endRoundPayload));

        // Check if the game is finished (best of 3)
        if (this.isGameFinished()) {
            this.endGame();
        } else {
            // Wait for ${this.betweenRoundDuration} seconds before starting a new round
            setTimeout(() => {
                this.startNewRound();
            }, this.betweenRoundDuration);
        }
    }

    public updateScore(playerUuid: string, newWord: string, newScore: number) {
        // Update score in the current round for the appropriate player
        const round = this.rounds[this.currentRound];
        if (playerUuid === this.player1.uuid) {
            round.player1Score = newScore;
            round.words.player1.push(newWord);
            // Broadcast the updated score from player1 to player2
            this.player2.socket.send(JSON.stringify({ type: 'opponentScoreUpdate', score: newScore }));
        } else {
            round.player2Score = newScore;
            round.words.player2.push(newWord);
            // Broadcast the updated score from player2 to player1
            this.player1.socket.send(JSON.stringify({ type: 'opponentScoreUpdate', score: newScore }));
        }
    }



    private isGameFinished(): boolean {
        const wins = { player1: 0, player2: 0 };
        for (const round of this.rounds) {
            if (round.winner === 'player1') wins.player1 += 1;
            if (round.winner === 'player2') wins.player2 += 1;
        }

        // Game finishes if either player wins 2 rounds
        return wins.player1 === 2 || wins.player2 === 2;
    }

    private endGame() {
        // Determine the game winner based on rounds won
        const wins = { player1: 0, player2: 0 };
        this.rounds.forEach(round => {
            if (round.winner === 'player1') wins.player1++;
            if (round.winner === 'player2') wins.player2++;
        });

        this.gameSessionState = 'ended';

        const gameWinner = wins.player1 > wins.player2 ? 'player1' : 'player2';
        const gameEndPayload = {
            type: 'gameEnd',
            winner: gameWinner,
            rounds: this.rounds
        };

        // Send the game end message to both players
        this.player1.socket.send(JSON.stringify(gameEndPayload));
        this.player2.socket.send(JSON.stringify(gameEndPayload));

        console.log(`Game ended. Winner: ${gameWinner}`);
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

    private endGameDueToDisconnection(playerUuid: string) {
        // End the game prematurely due to a player not reconnecting in time
        // You might decide to declare the other player as the winner or handle it differently

        console.log(`Game ended due to player ${playerUuid} not reconnecting in time.`);

        // End the game and notify the other player of the disconnection
        const gameEndPayload = {
            type: 'gameEndByDisconnection',
            winner: playerUuid === this.player1.uuid ? 'player2' : 'player1',
            rounds: this.rounds
        };
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

        // Resend appropriate data based on game session state
        switch (this.gameSessionState) {
            case 'exchangeInfo':
                this.resendMetaData(playerUuid);
                break;
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

        console.log(`Player ${playerUuid} successfully reconnected during ${this.gameSessionState}.`);
    }

    private resendMetaData(playerUuid: string) {
        // Resend opponent's username and any initial game info
        const player = playerUuid === this.player1.uuid ? this.player1 : this.player2;
        const opponent = playerUuid === this.player1.uuid ? this.player2 : this.player1;
        const metaDataPayload = {
            type: 'metaData',
            opponentUsername: opponent.username,
        };
        player.socket.send(JSON.stringify(metaDataPayload));
    }

    private resendCurrentRoundState(playerUuid: string) {
        // Resend the current round's grid, scores, and remaining time
        const player = playerUuid === this.player1.uuid ? this.player1 : this.player2;
        const round = this.rounds[this.currentRound];
        const remainingTime = round.endTime ? Math.max(0, round.endTime - Date.now()) : round.duration;
        const gameStatePayload = {
            type: 'gameState',
            round: this.currentRound + 1,
            grid: round.grid,
            player1Score: round.player1Score,
            player2Score: round.player2Score,
            remainingTime,
        };
        player.socket.send(JSON.stringify(gameStatePayload));
    }

    private resendIntermissionState(playerUuid: string) {
        // Inform the player about the intermission and the next round start
        const player = playerUuid === this.player1.uuid ? this.player1 : this.player2;
        const intermissionPayload = {
            type: 'intermission',
            nextRoundStartIn: this.betweenRoundDuration,
        };
        player.socket.send(JSON.stringify(intermissionPayload));
    }

    private resendEndGameState(playerUuid: string) {
        // Resend the end game state with final scores and winner
        const wins = this.calculateWins();
        const gameEndPayload = {
            type: 'gameEnd',
            winner: wins.player1 > wins.player2 ? 'player1' : 'player2',
            rounds: this.rounds,
        };
        const player = playerUuid === this.player1.uuid ? this.player1 : this.player2;
        player.socket.send(JSON.stringify(gameEndPayload));
    }

    private calculateWins() {
        const wins = { player1: 0, player2: 0 };
        for (const round of this.rounds) {
            if (round.winner === 'player1') wins.player1++;
            if (round.winner === 'player2') wins.player2++;
        }
        return wins;
    }

    private generateLetterGrid(): LetterGrid {
        const grid: LetterGrid = [];
        const gridSize = 5; // Example size, adjust as needed

        for (let i = 0; i < gridSize; i++) {
            const row: LetterTile[] = [];
            for (let j = 0; j < gridSize; j++) {
                // Generate letter and optionally a multiplier
                const letterTile: LetterTile = {
                    letter: this.getRandomLetter(),
                    value: Math.floor(Math.random() * 5) + 1, // Example values 1-5
                    multiplierLetter: Math.random() < 0.1 ? 2 : 1, // 10% chance of 2x letter
                    multiplierWord: Math.random() < 0.05 ? 3 : 1, // 5% chance of 3x word
                };
                row.push(letterTile);
            }
            grid.push(row);
        }

        return grid;
    }

    private getRandomLetter(): string {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        return letters.charAt(Math.floor(Math.random() * letters.length));
    }
}
