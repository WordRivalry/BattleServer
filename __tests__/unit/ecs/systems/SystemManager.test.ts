// __tests__/unit/ecs/systems/SystemManager.test.ts

import { ISystem } from "../../../../src/modules/gameEngine/ecs/systems/System";
import { EntityManager } from "../../../../src/modules/gameEngine/ecs/EntityManager";
import { Entity } from "../../../../src/modules/gameEngine/ecs/entities/entity";
import { ComponentManager } from "../../../../src/modules/gameEngine/ecs/ComponentManager";
import { TypedEventEmitter } from "../../../../src/modules/gameEngine/ecs/systems/TypedEventEmitter";
import { SystemManager } from "../../../../src/modules/gameEngine/ecs/SystemManager";

class MockSystem implements ISystem {
    requiredComponents = [];
    initCalled = false;
    updateCalled = false;
    updateCallCount = 0;

    init(entityManager: EntityManager, componentManager: ComponentManager, eventSystem: TypedEventEmitter): void {
        this.initCalled = true;
    }

    update(deltaTime: number, entities: Entity[], componentManager: ComponentManager, eventSystem: TypedEventEmitter): void {
        this.updateCalled = true;
        this.updateCallCount++;
    }
}

describe('SystemManager', () => {
    let systemManager: SystemManager;
    let entityManager: EntityManager;
    let componentManager: ComponentManager;
    let eventSystem: TypedEventEmitter;

    beforeEach(() => {
        componentManager = new ComponentManager();
        entityManager = new EntityManager(componentManager);
        eventSystem = new TypedEventEmitter();
        systemManager = new SystemManager(entityManager, componentManager, eventSystem);
    });

    it('should register and initialize a system correctly', () => {
        const system = new MockSystem();
        systemManager.registerSystem(system, 0);

        expect(system.initCalled).toBe(true);
    });

    it('should categorize systems based on their update frequency', () => {
        const systemWithUpdate = new MockSystem();
        const systemWithoutUpdate = new MockSystem();
        systemManager.registerSystem(systemWithUpdate, 1);
        systemManager.registerSystem(systemWithoutUpdate, 0);

        expect(systemManager['systems']).toContainEqual({ system: systemWithUpdate, updateFrequency: 1 });
        expect(systemManager['noUpdateSystems']).toContain(systemWithoutUpdate);
    });

    it('should update systems with correct delta time and entities', () => {
        const mockSystem = new MockSystem();
        systemManager.registerSystem(mockSystem, 1);

        // Execute update with simulated deltaTime
        const simulatedDeltaTime = 1.5; // Simulated delta time
        systemManager.update(simulatedDeltaTime);

        expect(mockSystem.updateCalled).toBe(true);
        expect(mockSystem.updateCallCount).toEqual(1);
    });

    it('should not update systems with an update frequency of 0 during the update cycle', () => {
        const systemWithNoUpdate = new MockSystem();
        systemManager.registerSystem(systemWithNoUpdate, 0);

        // Execute update with simulated deltaTime
        systemManager.update(1.5); // Since updateFrequency is 0, update should not be called

        expect(systemWithNoUpdate.updateCalled).toBe(false);
    });
});
