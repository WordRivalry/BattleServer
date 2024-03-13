// EngineClock.ts

export class EngineClock {
    private lastUpdateTime = performance.now();
    private currentTime = 0;
    private timeScale = 1;

    update(): number {
        const now = performance.now();
        const deltaTime = (now - this.lastUpdateTime) * this.timeScale;
        this.currentTime += deltaTime;
        this.lastUpdateTime = now;
        return deltaTime;
    }

    getLastUpdateTime(): number {
        return this.lastUpdateTime;
    }

    getCurrentTime(): number {
        return this.currentTime;
    }

    setTimeScale(scale: number): void {
        this.timeScale = scale;
    }

    getTimeScale(): number {
        return this.timeScale;
    }
}
