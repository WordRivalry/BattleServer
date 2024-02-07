// GameFlowManager.ts

import {CompleteCallback, GameClock, TickCallback} from './GameClock';
import {LetterGrid, LetterTile} from "../LetterGrid";
import {createScopedLogger} from "../../logger/Logger";

export type Timestamp = number;
export type Row = number;
export type Col = number;
export type Path = [Row, Col][];

export type PlayerUUID = string;
export type Winner = PlayerUUID | 'tie';

export interface PlayerRoundData {
    score: number;
    words: [Timestamp, Path][];
}

export interface RoundData {
    roundNumber: number;
    playerData: Map<PlayerUUID, PlayerRoundData>;
    winner: Winner | undefined; // Winner can be a PlayerUUID or 'tie'
    grid: LetterGrid;
    startTime: number;
    duration: number;
    endTime?: number;
}


export type GameEngineState = 'undefined' | 'preGame' | 'inRound' | 'intermission' | 'ended';

export interface GameEngineDelegate {
    onRoundStart: (roundData: RoundData) => void;
    onRoundEnd: (roundData: RoundData) => void;
    onScoreUpdate: (playerUuid: PlayerUUID, score: number) => void;
    onGameEnd: (winner: Winner) => void;

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
    private readonly config: {
        roundDuration: number;
        intermissionDuration: number;
        gridSize: number;
        wordScoreCalculator: (word: LetterTile[]) => number;
        gridGenerator: () => LetterGrid;
        checkGameOver: (rounds: RoundData[]) => boolean;
        gameWinnerDeterminator: (rounds: RoundData[]) => Winner;
        roundWinnerDeterminator?: (round: RoundData) => Winner;
    };

    private logger = createScopedLogger('GameEngine');

    constructor() {
        // Initial configuration
        this.config = {
            roundDuration: 360,
            intermissionDuration: 0,
            gridSize: 5,
            wordScoreCalculator: this.defaultWordScoreCalculator.bind(this),
            gridGenerator: this.defaultGridGenerator.bind(this),
            checkGameOver: this.defaultCheckGameOver.bind(this),
            gameWinnerDeterminator: this.defaultGameWinnerDeterminator.bind(this),
            roundWinnerDeterminator: this.defaultRoundWinnerDeterminator.bind(this),
        };

        // Logger + configuration
        this.logger.info(`Game engine initialized with ${this.config}`);

        this.setState('preGame')
    }

    // Getters

    public getCurrentRound(): RoundData | undefined {
        return this.rounds[this.currentRoundIndex];
    }

    public getRounds(): RoundData[] {
        return this.rounds;
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
        this.config.gameWinnerDeterminator = determinator;
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
                const winner = this.config.gameWinnerDeterminator(this.rounds);
                this.delegate?.onGameEnd(winner);
                break;
        }
    }

    public addWord(playerUuid: string, wordPath: Path): void {
        if (this.currentState === 'inRound' && this.gameClock?.getRemainingTime()) {
            let grid = this.getCurrentRoundGrid();
            if (grid) {
                const word = this.getPathLetterTiles(wordPath, grid);
                const baseScore = this.config.wordScoreCalculator(word);

                let playerData = this.rounds[this.currentRoundIndex].playerData.get(playerUuid);
                if (!playerData) {
                    playerData = { score: 0, words: [] };
                    this.rounds[this.currentRoundIndex].playerData.set(playerUuid, playerData);
                }

                // Calculate and update the score
                const momentumScore = this.calculateMomentumScore(playerUuid, baseScore, word);
                playerData.score += momentumScore;

                // Update the words
                playerData.words.push([this.config.roundDuration - this.gameClock?.getRemainingTime(), wordPath]);

                // Invoke the delegate's onScoreUpdate method
                this.delegate?.onScoreUpdate(playerUuid, playerData.score);
            }
        }
    }

    private createRoundData(duration: number): RoundData {
        return {
            roundNumber: this.currentRoundIndex + 1,
            playerData: new Map(),
            winner: undefined,
            grid: this.config.gridGenerator(),
            startTime: Date.now(),
            duration: duration,
        };
    }

    private defaultCheckGameOver(): boolean {
        const roundVictories = new Map<PlayerUUID, number>();

        this.rounds.forEach((round) => {
            if (round.winner !== 'tie' && round.winner) {
                roundVictories.set(round.winner, (roundVictories.get(round.winner) || 0) + 1);
            }
        });

        const totalRounds = this.rounds.length;
        let gameOver = false;

        roundVictories.forEach((victories) => {
            if (victories > totalRounds / 2) {
                gameOver = true;
            }
        });

        return gameOver;
    }


     defaultGameWinnerDeterminator(): Winner {
        const totalScores = new Map<PlayerUUID, number>();

        this.rounds.forEach((roundData) => {
            roundData.playerData.forEach((data, uuid) => {
                if (!totalScores.has(uuid)) {
                    totalScores.set(uuid, data.score);
                } else {
                    totalScores.set(uuid, totalScores.get(uuid)! + data.score);
                }
            });
        });

        let highestScore = -1;
        let potentialWinners: PlayerUUID[] = [];

        totalScores.forEach((score, uuid) => {
            if (score > highestScore) {
                highestScore = score;
                potentialWinners = [uuid];
            } else if (score === highestScore) {
                potentialWinners.push(uuid);
            }
        });

        return potentialWinners.length === 1 ? potentialWinners[0] : 'tie';
    }

    defaultRoundWinnerDeterminator(round: RoundData): Winner {
        const totalScores = new Map<PlayerUUID, number>();

        round.playerData.forEach((data, uuid) => {
            totalScores.set(uuid, data.score);
        });

        let highestScore = -1;
        let potentialWinners: PlayerUUID[] = [];

        totalScores.forEach((score, uuid) => {
            if (score > highestScore) {
                highestScore = score;
                potentialWinners = [uuid];
            } else if (score === highestScore) {
                potentialWinners.push(uuid);
            }
        });

        return potentialWinners.length === 1 ? potentialWinners[0] : 'tie';
    }

    private defaultWordScoreCalculator(word: LetterTile[]): number {
        let score = 0;
        // Calculate base score for the word
        for (let letter of word) {
            score += letter.value * letter.multiplierLetter
        }
        // Apply word multiplier if any
        for (let letter of word) {
            score *= letter.multiplierWord;
        }
        return score;
    }

    private defaultGridGenerator(): LetterGrid {
        const grid: LetterGrid = [];
        const gridSize = this.config.gridSize;

        // Function to determine multiplier presence and value
        const determineMultiplier = (isLetter: boolean): any => {
            // Increase likelihood of multipliers in later rounds
            const chance = Math.random();
            const threshold = 0.85 - ((this.currentRoundIndex + 1) * 0.05); // Increase chance by 5% each round
            if (chance > threshold) {
                return isLetter ? (chance > 0.75 ? 2 : 3) : (chance > 0.85 ? 2 : 1);
            }
            return 1;
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
                    multiplierLetter: determineMultiplier(true),
                    multiplierWord: determineMultiplier(false),
                };
                row.push(letterTile);
            }
            grid.push(row);
        }
        return grid;
    }

    private calculateMomentumScore(playerUuid: string, baseScore: number, word: LetterTile[]): number {

        // Calculate word length
        const wordLength = word.length;

        // Calculate word complexity
        const complexLetters = ['Q', 'X', 'Z', 'W'];
        const complexityFactor = word.reduce((acc, tile) => acc + (complexLetters.includes(tile.letter) ? 1 : 0), 0);

        // Define momentum scoring logic
        let momentumBonus = 1; // No bonus by default

        // Adjust momentum bonus based on word length and complexity
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

            // Find the last added word timestamp for this player
            let lastWordTimestamp;
            let words = this.getPlayerWords(playerUuid);

            if (words && words.length > 0) {
                lastWordTimestamp = words[words.length - 1][0];
            }

            if (lastWordTimestamp !== undefined) {
                // Calculate the time difference between the last and current word submissions
                let timeDifference = currentWordTimestamp - lastWordTimestamp;

                // Adjust very fast momentum bonus based on the time difference
                if (timeDifference <= 2000) { // Within 2 seconds
                    veryFastMomentumBonus = 1.5;
                } else if (timeDifference <= 3000) { // Within 3 seconds
                    veryFastMomentumBonus = 1.3;
                } else if (timeDifference <= 5000) { // Within 5 seconds
                    veryFastMomentumBonus = 1.1;
                }
            }
        }

        // Apply both the momentum bonus and the very fast momentum bonus
        return baseScore * momentumBonus * veryFastMomentumBonus;
    }

    private getPlayerScore(playerUuid: string): number {
        return this.rounds[this.currentRoundIndex].playerData.get(playerUuid)?.score || 0;
    }

    private getPlayerWords(playerUuid: string): [Timestamp, Path][] {
        return this.rounds[this.currentRoundIndex].playerData.get(playerUuid)?.words || [];
    }


    private getPathLetterTiles(path: Path, grid: LetterGrid): LetterTile[] {
        const letterTiles: LetterTile[] = [];

        if (!Array.isArray(path) || path.some(part => !Array.isArray(part) || part.length !== 2)) {
            this.logger.error('Invalid path format');
            return [];
        }

        for (const [row, col] of path) {
            // Ensure the row and col are within the bounds of the grid
            if (row >= 0 && row < grid.length && col >= 0 && col < grid[row].length) {
                const tile = grid[row][col];
                letterTiles.push(tile);
            } else {
                // Optionally handle or log an error if the path contains invalid coordinates
                this.logger.error(`Invalid path coordinates: [${row}, ${col}]`);
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