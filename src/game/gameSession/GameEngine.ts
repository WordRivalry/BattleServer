// GameFlowManager.ts

import {CompleteCallback, GameClock, TickCallback} from './GameClock';
import {LetterGrid, LetterTile} from "../LetterGrid";

export type Timestamp = number;
export type Row = number;
export type Col = number;
export type Path = [Row, Col][];

export interface RoundData {
    roundNumber: number;
    player1Score: number;
    player2Score: number;
    winner: 'player1' | 'player2' | 'tie' | undefined;
    // Storing paths as an array of tuples with a timestamp and an array of (row, col) pairs
    words: {
        player1: [Timestamp, Path][];
        player2: [Timestamp, Path][];
    };
    grid: LetterGrid;
    startTime: number; // Timestamp when the round started
    duration: number; // Duration of the round in milliseconds
    endTime?: number; // Timestamp when the round ended
}

export type GameEngineState = 'undefined' | 'preGame' | 'inRound' | 'intermission' | 'ended';

export interface GameEngineDelegate {
    onRoundStart: (roundData: RoundData) => void;
    onRoundEnd: (roundData: RoundData) => void;
    onScoreUpdate: (playerId: 'player1' | 'player2', score: number) => void;
    onGameEnd: (winner: 'player1' | 'player2' | 'tie') => void;

    // For real-time games, providing periodic time updates could be beneficial.
    onTimeUpdate: (remainingTime: number) => void;

    // Called in the preGame state
    onGameInitialize: () => void;
}


export class GameEngine {
    private currentState: GameEngineState = 'undefined';
    private gameClock: GameClock | undefined;
    private rounds: RoundData[] = [];
    private currentRoundIndex: number = -1;
    private delegate?: GameEngineDelegate;
    private config: {
        roundDuration: number;
        intermissionDuration: number;
        gridSize: number;
        wordScoreCalculator: (word: LetterTile[]) => number;
        gridGenerator: () => LetterGrid;
        checkGameOver: (rounds: RoundData[]) => boolean;
        winnerDeterminator: (rounds: RoundData[]) => 'player1' | 'player2' | 'tie';
    };

    constructor() {
        // Initial configuration
        this.config = {
            roundDuration: 360,
            intermissionDuration: 0,
            gridSize: 5,
            wordScoreCalculator: this.defaultWordScoreCalculator,
            gridGenerator: this.defaultGridGenerator,
            checkGameOver: this.defaultCheckGameOver,
            winnerDeterminator: this.defaultWinnerDeterminator,
        };

        this.setState('preGame')
    }

    // Getters
    public getCurrentState(): GameEngineState {
        return this.currentState;
    }

    public getCurrentRoundIndex(): number {
        return this.currentRoundIndex;
    }

    public getCurrentRound(): RoundData | undefined {
        return this.rounds[this.currentRoundIndex];
    }

    public getRounds(): RoundData[] {
        return this.rounds;
    }

    public getCurrentRoundStartTime(): number | undefined {
        return this.rounds[this.currentRoundIndex]?.startTime;
    }

    public getCurrentRoundDuration(): number | undefined {
        return this.rounds[this.currentRoundIndex]?.duration;
    }

    public getRemainingTimeOnClock(): number | undefined {
        return this.gameClock?.getRemainingTime();
    }

    public getCurrentRoundGrid(): LetterGrid | undefined {
        return this.rounds[this.currentRoundIndex]?.grid;
    }

    // Configuration modifiers
    public setDelegate(delegate: GameEngineDelegate): void {
        this.delegate = delegate;
    }

    public setRoundDuration(duration: number): void {
        this.config.roundDuration = duration;
    }

    public setIntermissionDuration(duration: number): void {
        this.config.intermissionDuration = duration;
    }

    public setGridSize(size: number): void {
        this.config.gridSize = size;
    }

    public setWordScoreCalculator(calculator: (word: LetterTile[]) => number): void {
        this.config.wordScoreCalculator = calculator;
    }

    public setGridGenerator(generator: () => LetterGrid): void {
        this.config.gridGenerator = generator;
    }

    public setCheckGameOver(checker: (rounds: RoundData[]) => boolean): void {
        this.config.checkGameOver = checker;
    }

    public setWinnerDeterminator(determinator: (rounds: RoundData[]) => 'player1' | 'player2' | 'tie'): void {
        this.config.winnerDeterminator = determinator;
    }

    public startGame(): void {
        // Validate if the game can start
        // Pre game checks

        if (this.currentState === 'preGame') {
            this.startRound();
        }
    }

    public endGame(): void {
        this.setState('ended');
        // engine clean up
        this.gameClock?.pause();
        this.gameClock = undefined;
    }

    private startRound(): void {
        if (this.currentState !== 'inRound') {
            const newRound = this.createRoundData(this.config.roundDuration);
            this.rounds.push(newRound);
            this.currentRoundIndex++;
            this.gameClock = new GameClock(this.config.roundDuration, this.onTick, this.onRoundComplete);
            this.setState('inRound', newRound);
            this.gameClock.start();
        }
    }

    private startIntermission(): void {
        if (this.currentState === 'inRound') {
            this.gameClock = new GameClock(this.config.intermissionDuration, this.onTick, this.onIntermissionComplete);
            this.setState('intermission', this.getCurrentRound());
            this.gameClock.start();
        }
    }

    private onTick: TickCallback = (remainingTime: number): void => {
        this.delegate?.onTimeUpdate(remainingTime);
    };

    private onRoundComplete: CompleteCallback = (): void => {
        this.config.checkGameOver(this.rounds) ? this.endGame() : this.startIntermission();
    }

    private onIntermissionComplete: CompleteCallback = (): void => {
        this.startRound();
    }

    private setState(newState: GameEngineState, roundData?: RoundData): void {
        this.currentState = newState;

        // Delegate callbacks
        switch (newState) {
            case 'preGame':
                this.delegate?.onGameInitialize();
                break;
            case 'inRound':
                if (roundData) this.delegate?.onRoundStart(roundData);
                break;
            case 'intermission':
                if (roundData) this.delegate?.onRoundEnd(roundData);
                break;
            case 'ended':
                const winner = this.defaultWinnerDeterminator();
                this.delegate?.onGameEnd(winner);
                break;
        }
    }

    public addWord(player: 'player1' | 'player2', wordPath: Path): void {
        if (this.currentState === 'inRound' && this.gameClock?.getRemainingTime()) {
            let grid = this.getCurrentRoundGrid()
            if (grid) {

                const word = this.getPathLetterTiles(wordPath, grid);

                const baseScore = this.config.wordScoreCalculator(word);
                const currentScores = {player1: this.rounds[this.currentRoundIndex].player1Score, player2: this.rounds[this.currentRoundIndex].player2Score};
                const momentumScore = this.calculateMomentumScore(player, baseScore, word, currentScores);

                // Update the player's score with the momentum adjusted score
                if (player === 'player1') {
                    this.rounds[this.currentRoundIndex].player1Score += momentumScore;
                } else {
                    this.rounds[this.currentRoundIndex].player2Score += momentumScore;
                }

                // Update the word list with the new word and its scoring time
                this.rounds[this.currentRoundIndex].words[player].push([
                    this.config.roundDuration - this.gameClock?.getRemainingTime(), wordPath
                ]);

                // Optionally, invoke the delegate's onScoreUpdate method
                this.delegate?.onScoreUpdate(player, momentumScore);
            }
        }
    }


    private createRoundData(duration: number): RoundData {
        return {
            roundNumber: this.currentRoundIndex + 1, // +1 to convert from 0-based index to 1-based round number
            player1Score: 0,
            player2Score: 0,
            winner: undefined,
            words: {player1: [], player2: []},
            grid: this.defaultGridGenerator(),
            startTime: Date.now(),
            duration: duration,
        };
    }

    private defaultCheckGameOver(): boolean {
        const wins = {player1: 0, player2: 0};
        for (const round of this.rounds) {
            if (round.winner === 'player1') wins.player1 += 1;
            if (round.winner === 'player2') wins.player2 += 1;
        }

        // Game finishes if either player wins 2 rounds
        return wins.player1 === 2 || wins.player2 === 2;
    }

    private defaultWinnerDeterminator(): 'player1' | 'player2' | 'tie' {
        const wins = {player1: 0, player2: 0};
        for (const round of this.rounds) {
            if (round.winner === 'player1') wins.player1 += 1;
            if (round.winner === 'player2') wins.player2 += 1;
        }

        if (wins.player1 > wins.player2) return 'player1';
        if (wins.player2 > wins.player1) return 'player2';
        return 'tie';
    }

    private defaultWordScoreCalculator(word: LetterTile[]): number {
        let score = 0;
        // Calculate base score for the word
        for (let letter of word) {
            if (letter.multiplier?.type === 'letter') {
                score += letter.value * letter.multiplier.value;
            } else {
                score += letter.value;
            }
        }
        // Apply word multiplier if any
        for (let letter of word) {
            if (letter.multiplier?.type === 'word') {
                score *= letter.multiplier.value;
            }
        }
        return score;
    }

    private defaultGridGenerator(): LetterGrid {
        const grid: LetterGrid = [];
        const gridSize = this.config.gridSize;

        // Function to determine multiplier presence and value
        const determineMultiplier = (): any => {
            // Increase likelihood of multipliers in later rounds
            const chance = Math.random();
            const threshold = 0.85 - ((this.currentRoundIndex + 1) * 0.05); // Increase chance by 5% each round
            if (chance > threshold) {
                return {
                    type: chance > 0.5 ? 'letter' : 'word',
                    value: chance > 0.75 ? 2 : 3,
                };
            }
            return null;
        };

        for (let i = 0; i < gridSize; i++) {
            const row: LetterTile[] = [];
            for (let j = 0; j < gridSize; j++) {
                // Select a letter based on French distribution
                const randomIndex = Math.floor(Math.random() * this.frenchLetterDistribution.length);
                const { letter, score } = this.frenchLetterDistribution[randomIndex];

                const letterTile: LetterTile = {
                    letter,
                    value: score, // Use the predefined score
                    multiplier: determineMultiplier(),
                };
                row.push(letterTile);
            }
            grid.push(row);
        }
        return grid;
    }

    private calculateMomentumScore(player: string, baseScore: number, word: LetterTile[], playerScores: { player1: number, player2: number }): number {
        // Determine score proximity
        const scoreDifference = Math.abs(playerScores.player1 - playerScores.player2);

        // Calculate word length
        const wordLength = word.length;

        // Calculate word complexity
        const complexLetters = ['Q', 'X', 'Z', 'W'];
        const complexityFactor = word.reduce((acc, tile) => acc + (complexLetters.includes(tile.letter) ? 1 : 0), 0);

        // Define your momentum scoring logic here
        // For example, a simple momentum bonus could be:
        let momentumBonus = 1; // No bonus by default

        // Adjusting momentum bonus based on score proximity, word length, and word complexity
        if (scoreDifference < 50) { // Assuming scores are very close
            momentumBonus += 0.1; // Increase the bonus by 10%
        }

        if (wordLength > 5) { // Longer words get a bonus
            momentumBonus += 0.05 * (wordLength - 5);
        }

        if (complexityFactor > 0) { // Add complexity bonus
            momentumBonus += 0.1 * complexityFactor;
        }

        let remainingTime = this.gameClock?.getRemainingTime();
        let veryFastMomentumBonus = 1;
        if (remainingTime) {
            // Calculate the current word timestamp
            const currentWordTimestamp = this.config.roundDuration - remainingTime;

            // Found in roundData last added player word timestamp
            let lastWordTimestamp;
            let words = this.rounds[this.currentRoundIndex].words;

            if (player === 'player1') {
                // guard at least one word was played
                if (words.player1.length > 0) {
                    lastWordTimestamp = words.player1[words.player1.length - 1][0];
                }

            } else {
                // guard at least one word was played
                if (words.player2.length > 0) {
                    lastWordTimestamp = words.player2[words.player2.length - 1][0];
                }
            }

            if (lastWordTimestamp !== undefined) {

                // Calculate the time difference between the last and current word submissions
                let timeDifference = lastWordTimestamp !== null ? currentWordTimestamp - lastWordTimestamp : null;

                // Adjust very fast momentum bonus based on the time difference
                if (timeDifference !== null) {
                    if (timeDifference <= 2000) { // Within 2 seconds
                        veryFastMomentumBonus = 1.5;
                    } else if (timeDifference <= 3000) { // Within 3 seconds
                        veryFastMomentumBonus = 1.3;
                    } else if (timeDifference <= 5000) { // Within 5 seconds
                        veryFastMomentumBonus = 1.1;
                    }
                }
            }
        }

        // Apply both the momentum bonus and the very fast momentum bonus
        return baseScore * momentumBonus * veryFastMomentumBonus;
    }

    private getPathLetterTiles(path: Path, grid: LetterGrid): LetterTile[] {
        const letterTiles: LetterTile[] = [];

        if (!Array.isArray(path) || path.some(part => !Array.isArray(part) || part.length !== 2)) {
            console.error(`Invalid path format: `, path);
            return [];
        }

        for (const [row, col] of path) {
            // Ensure the row and col are within the bounds of the grid
            if (row >= 0 && row < grid.length && col >= 0 && col < grid[row].length) {
                const tile = grid[row][col];
                letterTiles.push(tile);
            } else {
                // Optionally handle or log an error if the path contains invalid coordinates
                console.error(`Invalid path coordinates: (${row}, ${col})`);
            }
        }

        return letterTiles;
    }

    private frenchLetterDistribution = [
        { letter: 'E', frequency: 14.715, score: 1 },
        { letter: 'A', frequency: 7.636, score: 1 },
        { letter: 'I', frequency: 7.529, score: 1 },
        { letter: 'S', frequency: 7.948, score: 2 },
        { letter: 'N', frequency: 7.095, score: 1 },
        { letter: 'R', frequency: 6.553, score: 1 },
        { letter: 'T', frequency: 7.244, score: 1 },
        { letter: 'U', frequency: 6.311, score: 1 },
        { letter: 'L', frequency: 5.456, score: 1 },
        { letter: 'O', frequency: 5.378, score: 1 },
        { letter: 'D', frequency: 3.669, score: 2 },
        { letter: 'C', frequency: 3.260, score: 2 },
        { letter: 'P', frequency: 3.021, score: 2 },
        { letter: 'M', frequency: 2.968, score: 2 },
        { letter: 'V', frequency: 1.838, score: 3 },
        { letter: 'Q', frequency: 1.362, score: 4 },
        { letter: 'F', frequency: 1.066, score: 3 },
        { letter: 'B', frequency: 0.901, score: 3 },
        { letter: 'G', frequency: 0.866, score: 3 },
        { letter: 'H', frequency: 0.737, score: 4 },
        { letter: 'J', frequency: 0.545, score: 5 },
        { letter: 'X', frequency: 0.387, score: 6 },
        { letter: 'Y', frequency: 0.308, score: 6 },
        { letter: 'Z', frequency: 0.136, score: 7 },
        { letter: 'K', frequency: 0.049, score: 8 },
        { letter: 'W', frequency: 0.114, score: 9 }
    ];

}