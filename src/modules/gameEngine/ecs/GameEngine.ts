// GameEngine.ts

import {SystemManager} from "./SystemManager";
import {EntityManager} from "./EntityManager";
import {ComponentManager, ComponentType} from "./ComponentManager";
import {TypedEventEmitter} from "./systems/TypedEventEmitter";
import {TimerSystem} from "./systems/TimerSystem";
import {Entity} from "./entities/entity";
import {Component} from "./components/Component";
import {GlobalComponent} from "./components/GlobalComponent";
import {EngineClock} from "./EngineClock";

export class GameEngine {
    public readonly systemManager: SystemManager;
    public readonly entityManager: EntityManager;
    public readonly componentManager: ComponentManager;
    public readonly eventSystem: TypedEventEmitter;
    public readonly engineClock: EngineClock;
    running: boolean = false;

    constructor() {

        this.engineClock = new EngineClock();
        this.eventSystem = new TypedEventEmitter();
        this.componentManager = new ComponentManager();
        this.entityManager = new EntityManager(this.componentManager);

        // Systems
        this.systemManager = new SystemManager(this.entityManager, this.componentManager, this.eventSystem);
        this.systemManager.registerSystem(new TimerSystem(), 1);

        // Global entity queryable by GlobalComponent
        const globalComponent = new GlobalComponent();
        const createdEntity = this.entityManager.createEntity();
        this.componentManager.addComponent(createdEntity, GlobalComponent, globalComponent);
    }

    public start(): void {
        this.running = true;
        this.eventSystem.emitGeneric("ECS_START", {});
        this.engineLoop();
    }

    public stop(): void {
        this.running = false;
        this.eventSystem.emitGeneric("ECS_STOP", {});
    }

    public createEntity(): Entity {
        return this.entityManager.createEntity();
    }

    public attachComponent<T extends Component>(entity: Entity, componentType: ComponentType<T>, component: T) {
        this.componentManager.addComponent(entity, componentType, component);
    }

    public linkChildToParent(parent: Entity, child: Entity): void {
        this.entityManager.addChild(parent, child);
    }

    private engineLoop(): void {
        const tickRate = 50; // ms
        const update = () => {
            if (!this.running) return;
            const deltaTime = this.engineClock.update();
            this.systemManager.update(deltaTime);

            // Aim to maintain a steady tick rate, adjusting for the actual time taken by the update
            const actualTimeTaken = performance.now() - this.engineClock.getLastUpdateTime()
            const nextTickDelay = Math.max(0, tickRate - actualTimeTaken);
            setTimeout(update, nextTickDelay);
        };
        update();
    }
}
