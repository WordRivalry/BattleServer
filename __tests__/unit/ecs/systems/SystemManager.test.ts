// __tests__/unit/ecs/systems/SystemManager.test.ts

import { ISystem } from "../../../../src/modules/gameEngine/ecs/systems/System";
import { EntityManager } from "../../../../src/modules/gameEngine/ecs/entities/EntityManager";
import { ComponentManager } from "../../../../src/modules/gameEngine/ecs/components/ComponentManager";
import { TypedEventEmitter } from "../../../../src/modules/gameEngine/ecs/systems/TypedEventEmitter";
import { SystemManager } from "../../../../src/modules/gameEngine/ecs/systems/SystemManager";
import {ECManager} from "../../../../src/modules/gameEngine/ecs/ECManager";
import {Component} from "../../../../src/modules/gameEngine/ecs/components/Component";

class ComponentA extends Component {
}

class MockSystemWithDep implements ISystem {
    requiredComponents = [ComponentA];
    initCalled = false;
    updateCalled = false;
    updateCallCount = 0;

    init(ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
        this.initCalled = true;
    }

    update(deltaTime: number, entities: number[], ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
        this.updateCalled = true;
        this.updateCallCount++;
    }
}


class MockSystemWithoutDep implements ISystem {
    requiredComponents = [];
    initCalled = false;
    updateCalled = false;
    updateCallCount = 0;

    init(ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
        this.initCalled = true;
    }

    update(deltaTime: number, entities: number[], ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
        this.updateCalled = true;
        this.updateCallCount++;
    }
}

describe('SystemManager', () => {
    let systemManager: SystemManager;
    let entityManager: EntityManager;
    let componentManager: ComponentManager;
    let ecsManager: ECManager;
    let eventSystem: TypedEventEmitter;

    beforeEach(() => {
        componentManager = new ComponentManager();
        entityManager = new EntityManager();
        ecsManager = new ECManager(entityManager, componentManager);
        eventSystem = new TypedEventEmitter();
        systemManager = new SystemManager(ecsManager, eventSystem);
    });

    it('should register and initialize a system correctly', () => {
        const system = new MockSystemWithoutDep();
        systemManager.registerSystem(system);

        expect(system.initCalled).toBe(true);
    });

    it('should categorize systems based on their update frequency', () => {
        const systemWithUpdate = new MockSystemWithDep();
        const systemWithoutUpdate = new MockSystemWithoutDep();
        systemManager.registerSystem(systemWithUpdate);
        systemManager.registerSystem(systemWithoutUpdate);

        expect(systemManager['systems']).toContainEqual({ system: systemWithUpdate });
        expect(systemManager['noDependencySystems']).toContain(systemWithoutUpdate);
    });

    it('should update systems with correct delta time and entities', () => {
        const mockSystem = new MockSystemWithDep();
        systemManager.registerSystem(mockSystem);

        // Execute update with simulated deltaTime
        const simulatedDeltaTime = 1.5; // Simulated delta time
        systemManager.update(simulatedDeltaTime);

        expect(mockSystem.updateCalled).toBe(true);
        expect(mockSystem.updateCallCount).toEqual(1);
    });

    it('should not update systems with an update frequency of 0 during the update cycle', () => {
        const systemWithNoUpdate = new MockSystemWithoutDep();
        systemManager.registerSystem(systemWithNoUpdate);

        // Execute update with simulated deltaTime
        systemManager.update(1.5); // Since updateFrequency is 0, update should not be called

        expect(systemWithNoUpdate.updateCalled).toBe(false);
    });
});
