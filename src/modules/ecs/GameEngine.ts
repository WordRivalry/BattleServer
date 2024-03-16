// GameEngine.ts
import {SystemManager} from "./systems/SystemManager";
import {EntityManager} from "./entities/EntityManager";
import {ComponentManager} from "./components/ComponentManager";
import {TypedEventEmitter} from "./TypedEventEmitter";
import {EngineClock} from "./EngineClock";
import {createScopedLogger} from "../logger/logger";
import {ECManager} from "./ECManager";

export class GameEngine {
    public readonly systemManager: SystemManager;
    public readonly ecManager: ECManager;
    public readonly eventSystem: TypedEventEmitter;
    public readonly engineClock: EngineClock;
    running: boolean = false;
    private logger = createScopedLogger('GameEngine');

    constructor(eventEmitter: TypedEventEmitter) {
        this.ecManager = new ECManager(new EntityManager(), new ComponentManager());
        this.engineClock = new EngineClock();
        this.eventSystem = eventEmitter;
        this.systemManager = new SystemManager(this.ecManager, this.eventSystem);
    }

    public start(): void {
        this.running = true;
        this.eventSystem.emitGeneric("ECS_START", {});
        this.engineLoop();
        this.logger.info("Game engine started");
    }

    public stop(): void {
        this.running = false;
        this.eventSystem.emitGeneric("ECS_STOP", {});
        this.logger.info("Game engine stopped");
    }

    public setTimeScale(timeScale: number): void {
        this.engineClock.setTimeScale(timeScale);
    }

    private engineLoop(): void {
        const tickRate = 2000; // ms
        const update = () => {
            if (!this.running) return;
            const deltaTime = this.engineClock.update();
            this.systemManager.update(deltaTime);

            // Aim to maintain a steady tick rate, adjusting for the actual time taken by the update
            const actualTimeTaken = performance.now() - this.engineClock.getLastUpdateTime()
            const nextTickDelay = Math.max(0, tickRate - actualTimeTaken);
            this.logger.debug(`Next tick delay: ${nextTickDelay}`);
            setTimeout(update, nextTickDelay);
        };
        update();
    }
}
