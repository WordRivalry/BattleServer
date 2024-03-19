// GameEngine.ts
import {CompleteCallback, GameClock, TickCallback} from './GameClock';
import {LetterGrid, LetterTile} from "./LetterGrid";
import {createScopedLogger} from "../logger/logger";
import {Timestamp} from "../../types";
import axios from "axios";
import config from "../../../config";

export type Row = number;
export type Col = number;
export type Path = [Row, Col][];
export type GameOverChecker =  "BestOfOne" | "BestOfThree";

export interface PlayerRoundData {
    score: number;
    words: [Timestamp, Path][];
}

export type WinnerResult = {
    status: 'singleWinner' | 'tie' | 'ranked';
    winners: string[]; // In case of 'ranked', it contains UUIDs in ranked order. For 'tie', all tied player UUIDs.
};

export interface RoundData {
    roundNumber: number;
    playerData: Map<string, PlayerRoundData>;
    winner: WinnerResult | undefined;
    grid: LetterGrid;
    startTime: number;
    duration: number;
    endTime?: number;
}

export type GameEngineState = 'undefined' | 'preGame' | 'inRound' | 'intermission' | 'ended';

export interface GameEngineDelegate {
    onRoundStart: (roundData: RoundData) => void;
    onScoreUpdate: (playerName: string, score: number) => void;
    onRoundEnd: (roundData: RoundData) => void;
    onGameEnd: (winner: WinnerResult) => void;
    onTick: (remainingTime: number) => void;
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
        gridGenerator: () => LetterGrid | Promise<LetterGrid>;
        checkGameOver: (rounds: RoundData[]) => boolean;
        gameWinnerDeterminator: (rounds: RoundData[]) => WinnerResult;
        roundWinnerDeterminator?: (round: RoundData) => WinnerResult;
    };

    private logger = createScopedLogger('GameEngine');

    constructor() {

        // Initial configuration
        this.config = {
            roundDuration: 360,
            intermissionDuration: 0,
            gridSize: 5,
            wordScoreCalculator: this.defaultWordScoreCalculator.bind(this),
            gridGenerator: config.nodeEnv === 'production' ? this.fetchAndApplyMultipliers.bind(this) : this.defaultGridGenerator.bind(this),
            checkGameOver: this.bestOfThree.bind(this),
            gameWinnerDeterminator: this.defaultGameWinnerDeterminator.bind(this),
            roundWinnerDeterminator: this.defaultRoundWinnerDeterminator.bind(this),
        };

        // Logger + configuration
        this.logger.debug(`Game engine initialized with ${this.config}`);

        this.setState('preGame')
    }

    // Getters

    public getCurrentRound(): RoundData | undefined {
        const currentRound = this.rounds[this.currentRoundIndex];
        if (currentRound) {
            return currentRound;
        } else {
            this.logger.context('getCurrentRound').warn('No current round found');
            return undefined;
        }
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
        this.config.wordScoreCalculator = calculator.bind(this);
    }

    public setGridGenerator(generator: () => LetterGrid): void {
        this.config.gridGenerator = generator.bind(this);
    }

    public setCheckGameOver(checker: GameOverChecker): void {
        if (checker === 'BestOfOne') {
            this.config.checkGameOver = this.bestOfOne.bind(this);
        } else if (checker === 'BestOfThree') {
            this.config.checkGameOver = this.bestOfThree.bind(this);
        }
    }

    public setWinnerDeterminator(determinator: (rounds: RoundData[]) => WinnerResult): void {
        this.config.gameWinnerDeterminator = determinator.bind(this);
    }

    public async startGame(): Promise<void> {
        if (this.currentState === 'preGame') {
            await this.startRound();
        }
    }

    private async startRound(): Promise<void> {
        if (this.currentState !== 'inRound') {
            const newRound = await this.createRoundData(this.config.roundDuration);
            this.rounds.push(newRound);
            this.currentRoundIndex++;
            this.gameClock = new GameClock(this.config.roundDuration, this.onTick, this.onRoundComplete);
            this.delegate?.onRoundStart(newRound);
            this.setState('inRound');
            this.gameClock.start();
        }
    }

    private onTick: TickCallback = (remainingTime: number): void => {
        this.delegate?.onTick(remainingTime);
    };

    private onRoundComplete: CompleteCallback = (): void => {
        const currentRound = this.getCurrentRound();
        if (currentRound) {
            currentRound.winner = this.config.roundWinnerDeterminator!(currentRound);
            this.delegate?.onRoundEnd(currentRound); // Notify delegate of round end and winner
        }

        if (this.config.checkGameOver(this.rounds)) {
            this.endGame();
        } else {
            this.startIntermission();
        }
    }

    private startIntermission(): void {
        if (this.currentState === 'inRound') {
            this.gameClock = new GameClock(this.config.intermissionDuration, this.onTick, this.onIntermissionComplete);
            this.setState('intermission');
            this.gameClock.start();
        }
    };

    private onIntermissionComplete: CompleteCallback = (): void => {
        this.startRound();
    };

    public endGame(): void {
        this.setState('ended');
        // Engine clean-up
        this.gameClock?.pause();
        this.gameClock = undefined;

        // Determine the game winner based on all rounds
        const gameWinner = this.config.gameWinnerDeterminator(this.rounds);
        this.delegate?.onGameEnd(gameWinner); // Notify delegate with the final winner
    }

    private setState(newState: GameEngineState): void {
        this.currentState = newState;
    }

    public addWord(playerUUID: string, wordPath: Path): void {
        if (this.currentState === 'inRound' && this.gameClock?.getRemainingTime()) {
            let grid = this.getCurrentRoundGrid();
            if (grid) {
                const word = this.getPathLetterTiles(wordPath, grid);
                const baseScore = this.config.wordScoreCalculator(word);

                let playerData = this.rounds[this.currentRoundIndex].playerData.get(playerUUID);
                if (!playerData) {
                    playerData = { score: 0, words: [] };
                    this.rounds[this.currentRoundIndex].playerData.set(playerUUID, playerData);
                }

                playerData.score += baseScore;

                // Update the words
                playerData.words.push([this.config.roundDuration - this.gameClock?.getRemainingTime(), wordPath]);

                // Invoke the delegate's onScoreUpdate method
                this.delegate?.onScoreUpdate(playerUUID, playerData.score);
            }
        } else {
            this.logger.context('addWord').warn('Invalid state or round has ended');
        }
    }

    private async createRoundData(duration: number): Promise<RoundData> {

        let grid: LetterGrid | Promise<LetterGrid> = await this.config.gridGenerator();
        if (grid instanceof Promise) {
            grid = grid.then((resolvedGrid) => {
                this.logger.context('createRoundData').debug('Resolved grid', {resolvedGrid});
                return resolvedGrid;
            });
        }

        grid = grid as LetterGrid;

        return {
            roundNumber: this.currentRoundIndex + 1,
            playerData: new Map(),
            winner: undefined,
            grid: grid,
            startTime: Date.now(),
            duration: duration,
        };
    }

    /////////////////////////////
    // Default implementations //
    /////////////////////////////


    private bestOfOne(): boolean {
        const roundVictories = new Map<string, number>();

        this.rounds.forEach((round) => {
            const winners = round.winner;
            if (winners && winners.status !== 'tie') { // ties do not contribute
                winners.winners.forEach((winner) => {
                    roundVictories.set(winner, (roundVictories.get(winner) || 0) + 1);
                });
            }
        });

        let gameOver = false;

        // Explicitly checking for 2 victories, suitable for "best of 3" format
        roundVictories.forEach((victories) => {
            if (victories >= 2) {
                gameOver = true;
            }
        });

        return gameOver;
    }

    private bestOfThree(): boolean {
        const roundVictories = new Map<string, number>();

        this.rounds.forEach((round) => {
            const winners = round.winner;
            if (winners && winners.status !== 'tie') { // ties do not contribute
                winners.winners.forEach((winner) => {
                    roundVictories.set(winner, (roundVictories.get(winner) || 0) + 1);
                });
            }
        });

        let gameOver = false;

        // Explicitly checking for 2 victories, suitable for "best of 3" format
        roundVictories.forEach((victories) => {
            if (victories >= 2) {
                gameOver = true;
            }
        });

        return gameOver;
    }

    defaultGameWinnerDeterminator(): WinnerResult {
        const totalScores = new Map<string, number>();

        this.rounds.forEach((roundData) => {
            roundData.playerData.forEach((data, uuid) => {
                totalScores.set(uuid, (totalScores.get(uuid) || 0) + data.score);
            });
        });

        return this.determineWinners(totalScores);
    }

    defaultRoundWinnerDeterminator(round: RoundData): WinnerResult {
        const totalScores = new Map<string, number>();
        round.playerData.forEach((data, uuid) => totalScores.set(uuid, data.score));

        return this.determineWinners(totalScores);
    }

    private determineWinners(scores: Map<string, number>): WinnerResult {
        this.logger.context('determineWinners').debug('Scores', { scores });

        if (scores.size === 0) {
            // Handle case where no scores are present
            this.logger.context('determineWinners').debug('No scores present');
            return { status: 'tie', winners: [] }; // or consider a new status like 'noAction' if appropriate
        }

        let sortedScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
        this.logger.context('determineWinners').debug('sortedScores', { sortedScores });

        // Default case for when scores exist but are tied for the top position
        let result: WinnerResult = { status: 'singleWinner', winners: [sortedScores[0][0]] };

        if (sortedScores.length > 1 && sortedScores[0][1] === sortedScores[1][1]) {
            // Handle tie or ranked logic
            let tieScores = sortedScores.filter(([uuid, score]) => score === sortedScores[0][1]);
            if (tieScores.length === sortedScores.length) {
                result = { status: 'tie', winners: tieScores.map(([uuid]) => uuid) };
            } else {
                result = { status: 'ranked', winners: sortedScores.map(([uuid]) => uuid) };
            }
        }
        return result;
    }

    defaultWordScoreCalculator(word: LetterTile[]): number {
        let score = 0;
        let wordMultipliers = [];

        // Calculate base score for the word
        for (let letter of word) {
            score += letter.value * letter.multiplierLetter;
            if (letter.multiplierWord > 1) {
                wordMultipliers.push(letter.multiplierWord);
            }
        }

        // Apply word multipliers if any
        for (let wordMultiplier of wordMultipliers) {
            score *= wordMultiplier;
        }

        return score;
    }

    private defaultGridGenerator(): LetterGrid {
        const grid: LetterGrid = [];
        const gridSize = this.config.gridSize;

        // Function to determine multiplier presence and value


        for (let i = 0; i < gridSize; i++) {
            const row: LetterTile[] = [];
            for (let j = 0; j < gridSize; j++) {
                // Select a letter based on French distribution
                const randomIndex = Math.floor(Math.random() * this.frenchLetterDistribution.length);
                const { letter, score } = this.frenchLetterDistribution[randomIndex];

                const letterTile: LetterTile = {
                    letter,
                    value: score, // Use the predefined score
                    multiplierLetter: this.determineMultiplier(true),
                    multiplierWord: this.determineMultiplier(false),
                };
                row.push(letterTile);
            }
            grid.push(row);
        }
        return grid;
    }

    private async fetchAndApplyMultipliers(): Promise<LetterGrid> {

        const minDiversity: number = 0
        const maxDiversity: number = 1
        const minDifficulty: number = 0
        const maxDifficulty: number = 1000

        try {

            const api_url = config.gridApiUrl;

            // Fetch the grid from the API
            const response = await axios.get(api_url + '/get_grid', {
                params: {
                    min_diversity: minDiversity,
                    max_diversity: maxDiversity,
                    min_difficulty: minDifficulty,
                    max_difficulty: maxDifficulty,
                }
            });

            const gridData = response.data.grid;
            return gridData.map((row: string[]) =>
                row.map((letter: string): LetterTile => ({
                    letter: letter.toUpperCase(),
                    value: this.getLetterScore(letter.toUpperCase()), // You need to implement this method based on your scoring system
                    multiplierLetter: this.determineMultiplier(true),
                    multiplierWord: this.determineMultiplier(false),
                }))
            );
        } catch (error) {
            console.error("Failed to fetch grid:", error);
            throw new Error("Failed to fetch grid from the API");
        }
    }

    private determineMultiplier(isLetter: boolean): number {
        // Increase likelihood of multipliers in later rounds
        const chance = Math.random();
        const threshold = 0.85 - ((this.currentRoundIndex + 1) * 0.05); // Increase chance by 5% each round
        if (chance > threshold) {
            return isLetter ? (chance > 0.75 ? 2 : 3) : (chance > 0.85 ? 2 : 1);
        }
        return 1;
    }

    private getLetterScore(letter: string): number {
        // Use predefined scores in frenchLetterDistribution
        const letterData = this.frenchLetterDistribution.find((data) => data.letter === letter);
        return letterData ? letterData.score : 0;
    }

    private getPathLetterTiles(path: Path, grid: LetterGrid): LetterTile[] {
        const letterTiles: LetterTile[] = [];

        if (!Array.isArray(path) || path.some(part => !Array.isArray(part) || part.length !== 2)) {
            this.logger.context('getPathLetterTiles').error('Invalid path format');
            return [];
        }

        for (const [row, col] of path) {
            // Ensure the row and col are within the bounds of the grid
            if (row >= 0 && row < grid.length && col >= 0 && col < grid[row].length) {
                const tile = grid[row][col];
                letterTiles.push(tile);
            } else {
                // Optionally handle or log an error if the path contains invalid coordinates
                this.logger.context('getPathLetterTiles').error('Invalid path coordinates', {row, col});
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