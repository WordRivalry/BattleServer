// src/modules/gameEngine/GameClock.ts
export type TickCallback = (remainingTime: number) => void;
export type CompleteCallback = () => void;

export class GameClock {
    private duration: number; // Duration in seconds
    private readonly onTick: TickCallback;
    private readonly onComplete: CompleteCallback;
    private remaining: number; // Remaining time in seconds
    private timerId: NodeJS.Timeout | null = null;

    constructor(duration: number, onTick: TickCallback, onComplete: CompleteCallback) {
        this.duration = duration;
        this.onTick = onTick;
        this.onComplete = onComplete;
        this.remaining = duration; // Initialize remaining time in seconds
    }

    start(): void {
        if (this.timerId) {
            clearInterval(this.timerId); // Ensure no previous timer is running
        }
        this.timerId = setInterval(() => {
            this.remaining -= 1000; // Decrement remaining time by 1 second
            this.onTick(this.remaining);
            if (this.remaining <= 0) {
                this.complete();
            }
        }, 1000); // Interval set to decrement every second
    }

    pause(): void {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }

    resume(): void {
        this.start(); // Resume uses start logic, as remaining time is already set
    }

    complete(): void {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.onComplete();
    }

    getRemainingTime(): number {
        return this.remaining; // Return remaining time in seconds
    }

    getDuration(): number {
        return this.duration; // Return duration in seconds
    }
}

