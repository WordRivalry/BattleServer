// LetterComponent

export default class LetterComponent {
    letter: string;
    value: number;
    multiplierLetter: number;
    multiplierWord: number;

    constructor(letter: string, value: number, multiplierLetter: number, multiplierWord: number) {
        this.letter = letter;
        this.value = value;
        this.multiplierLetter = multiplierLetter;
        this.multiplierWord = multiplierWord;
    }
}