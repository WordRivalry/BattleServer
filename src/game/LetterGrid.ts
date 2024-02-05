export interface LetterTile {
    letter: string;
    value: number;
    multiplier: {
        type: 'letter' | 'word' | null;
        value: number;
    } | null;
}

export type LetterGrid = LetterTile[][];

