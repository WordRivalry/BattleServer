// src/ecs/SystemManager.ts

import {ISystem} from "./systems/System";
import {ComponentManager} from "./ComponentManager";
import {EventSystem} from "./systems/EventSystem";

export class SystemManager {
    private systems: Array<{ system: ISystem, updateFrequency: number }> = [];
    private lastUpdateTime: number = 0;
    private componentManager: ComponentManager;
    private eventSystem: EventSystem;

    constructor(componentManager: ComponentManager, eventSystem: EventSystem) {
        this.componentManager = componentManager;
        this.eventSystem = eventSystem;
    }

    registerSystem(system: ISystem, updateFrequency: number = 1) {
        if(system.init) {
            system.init(this.componentManager, this.eventSystem);
        }
        this.systems.push({ system, updateFrequency });
    }

    update(deltaTime: number) {
        const currentTime = performance.now();
        if (this.lastUpdateTime === 0) this.lastUpdateTime = currentTime;

        this.systems.forEach(({ system, updateFrequency }) => {
            if ((currentTime - this.lastUpdateTime) * updateFrequency >= deltaTime) {
                const entities = this.componentManager.getEntitiesByQuery({ all: system.requiredComponents });
                system.update(entities, deltaTime, this.componentManager, this.eventSystem);
            }
        });

        this.lastUpdateTime = currentTime;
    }
}
