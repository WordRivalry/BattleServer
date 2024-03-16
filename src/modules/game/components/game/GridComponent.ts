// GridComponent.ts

import {Component} from "../../../ecs/components/Component";
import LetterComponent from "./LetterComponent";

export class GridComponent extends Component {
    grid: LetterComponent[][]; // 4x4 grid of letters
    constructor(grid: LetterComponent[][]) {
        super();
        this.grid = grid;
    }
}