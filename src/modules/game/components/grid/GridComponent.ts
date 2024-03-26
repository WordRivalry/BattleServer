// GridComponent.ts

import {Component} from "../../../ecs/components/Component";
import LetterComponent from "./LetterComponent";

export interface GridStats {
    difficulty_rating: number;
    diversity_rating: number;
    total_words: number;
}


export class GridComponent extends Component {
    grid: LetterComponent[][]; // 4x4 grid of letters
    valid_words: string[] = [];
    stats: GridStats;

    constructor(grid: LetterComponent[][], valid_words: string[], stats: GridStats) {
        super();
        this.grid = grid;
        this.valid_words = valid_words;

        // Transform stats to integers (difficulty_rating, diversity_rating)
        const diversity_rating = stats.diversity_rating * 100;
        const difficulty_rating = stats.difficulty_rating / 10;

        stats.difficulty_rating = parseInt(difficulty_rating.toString());
        stats.diversity_rating = parseInt(diversity_rating.toString());

        this.stats = stats;
    }
}