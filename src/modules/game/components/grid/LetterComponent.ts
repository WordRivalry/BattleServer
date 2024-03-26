// LetterComponent.ts
export default class LetterComponent {
    letter: string;
    value: number;
    letterMultiplier: number;
    wordMultiplier: number;

    constructor(letter: string, value: number, letterMultiplier: number, wordMultiplier: number) {
        this.letter = letter;
        this.value = value;
        this.letterMultiplier = letterMultiplier;
        this.wordMultiplier = wordMultiplier;
    }
}