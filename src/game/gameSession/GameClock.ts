import {createScopedLogger} from "../../logger/Logger";

export type TickCallback = (remainingTime: number) => void;
export type CompleteCallback = () => void;

export class GameClock {
    private duration: number;
    private readonly onTick: TickCallback;
    private readonly onComplete: CompleteCallback;
    private remaining: number;
    private timerId: NodeJS.Timeout | null = null;
    private startTime: number = 0;
    private logger = createScopedLogger('GameClock');

    constructor(duration: number, onTick: TickCallback, onComplete: CompleteCallback) {
        this.duration = duration;
        this.onTick = onTick;
        this.onComplete = onComplete;
        this.remaining = duration;
    }

    start(): void {
        this.startTime = Date.now();
        this.logger.context('start').debug('Starting clock with duration seconds', {duration: this.duration / 1000} );
        this.timerId = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            this.remaining = Math.max(this.duration - elapsed, 0);
            this.onTick(this.remaining);
            if (this.remaining <= 0) {
                this.complete();
            }
        }, 1000); // Update every second
    }

    pause(): void {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
            // Adjust remaining time based on the moment it was paused
            this.remaining -= Date.now() - this.startTime;
        }
    }

    resume(): void {
        this.duration = this.remaining;
        this.start();
    }

    complete(): void {
        if (this.timerId) {
            clearInterval(this.timerId);
        }
        this.onComplete();
    }

    getRemainingTime(): number {
        return this.remaining;
    }
}
