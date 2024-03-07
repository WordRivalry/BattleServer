// src/ecs/components/PositionComponent.ts

import {Component} from "./Component";

export class PositionComponent extends Component {
    constructor(public x: number, public y: number) {
        super();
    }
}