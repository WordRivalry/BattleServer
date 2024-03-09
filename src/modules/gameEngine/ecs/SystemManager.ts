// src/ecs/SystemManager.ts

import {ISystem} from "./systems/System";
import {ComponentManager} from "./ComponentManager";
import {TypedEventEmitter} from "./systems/TypedEventEmitter";
import {EntityManager} from "./EntityManager";

export class SystemManager {
    private systems: Array<{ system: ISystem, updateFrequency: number  }> = [];
    private noUpdateSystems: ISystem[] = [];
    private readonly entityManager: EntityManager;
    private readonly componentManager: ComponentManager;
    private readonly eventSystem: TypedEventEmitter;

    constructor(entityManager: EntityManager, componentManager: ComponentManager, eventSystem: TypedEventEmitter) {
        this.entityManager = entityManager;
        this.componentManager = componentManager;
        this.eventSystem = eventSystem;
    }

    registerSystem(system: ISystem, updateFrequency: number) {
        if(system.init) {
            system.init(this.entityManager, this.componentManager, this.eventSystem);
        }

        if (updateFrequency === 0) {
            this.noUpdateSystems.push(system);
        } else {
            this.systems.push({system: system, updateFrequency });
        }
    }

    update(deltaTime: number) {
        this.systems.forEach(({ system, updateFrequency }) => {
            const entities = this.componentManager.getEntitiesByQuery({ all: system.requiredComponents });
            system.update(deltaTime, entities, this.componentManager, this.eventSystem);
        });
    }
}
