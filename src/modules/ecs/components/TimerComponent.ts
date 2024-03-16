// TimerComponent.ts
import { Component } from "./Component";

export class TimerComponent extends Component {
    elapsedTime: number = 0;
    duration: number;
    repeat: boolean;
    callback: ((...args: any[]) => void) | null;
    isActive: boolean = true;

    constructor(duration: number, repeat: boolean = false, callback: ((...args: any[]) => void) | null = null) {
        super();
        this.duration = duration;
        this.repeat = repeat;
        this.callback = callback;
    }
}
