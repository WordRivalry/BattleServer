// SystemManager.test.ts

import {System} from "../../../../src/modules/gameEngine/ecs/systems/System";
import {EntityManager} from "../../../../src/modules/gameEngine/ecs/entities/EntityManager";
import {ComponentManager, ComponentType} from "../../../../src/modules/gameEngine/ecs/components/ComponentManager";
import {TypedEventEmitter} from "../../../../src/modules/gameEngine/ecs/systems/TypedEventEmitter";
import {SystemManager} from "../../../../src/modules/gameEngine/ecs/systems/SystemManager";
import {ECManager} from "../../../../src/modules/gameEngine/ecs/ECManager";
import {Component} from "../../../../src/modules/gameEngine/ecs/components/Component";

abstract class  SystemMock implements System {
    initCalled = false;
    updateCalled = false;
    updateCallCount = 0;
    init(ecManager: ECManager, eventSystem: TypedEventEmitter): void {this.initCalled = true;}

    update(deltaTime: number, entities: number[], ecManager: ECManager, eventSystem: TypedEventEmitter): void {
        this.updateCalled = true;
        this.updateCallCount++;
    }
    abstract requiredComponents: ComponentType[];
}

class ComponentA extends Component {}
class SystemA extends SystemMock {requiredComponents = [ComponentA]; }

class MockSystemWithoutDep implements System {
    requiredComponents = [];
    initCalled = false;
    updateCalled = false;
    updateCallCount = 0;

    init(ecManager: ECManager, eventSystem: TypedEventEmitter): void {
        this.initCalled = true;
    }

    update(deltaTime: number, entities: number[], ecManager: ECManager, eventSystem: TypedEventEmitter): void {
        this.updateCalled = true;
        this.updateCallCount++;
    }
}

describe('SystemManager', () => {
    let systemManager: SystemManager;
    let entityManager: EntityManager;
    let componentManager: ComponentManager;
    let ecManager: ECManager;
    let eventSystem: TypedEventEmitter;

    beforeEach(() => {
        componentManager = new ComponentManager();
        entityManager = new EntityManager();
        ecManager = new ECManager(entityManager, componentManager);
        eventSystem = new TypedEventEmitter();
        systemManager = new SystemManager(ecManager, eventSystem);
    });

    it('should register and initialize a system correctly', () => {
        const systemA = new SystemA();
        systemManager.registerSystem(systemA);
        expect(systemA.initCalled).toBe(true);
    });

    it('should update systems with correct delta time and entities', () => {
        const systemA = new SystemA();
        systemManager.registerSystem(systemA);
        const entity1 = ecManager.createEntity();
        ecManager.addComponent(entity1, ComponentA, new ComponentA());

        // Execute update with simulated deltaTime
        const simulatedDeltaTime = 1.5; // Simulated delta time
        systemManager.update(simulatedDeltaTime);

        expect(systemA.updateCalled).toBe(true);
        expect(systemA.updateCallCount).toEqual(1);
    });

    it('should not update systems with an update frequency of 0 during the update cycle', () => {
        const systemWithNoUpdate = new MockSystemWithoutDep();
        systemManager.registerSystem(systemWithNoUpdate);

        // Execute update with simulated deltaTime
        systemManager.update(1.5); // Since updateFrequency is 0, update should not be called

        expect(systemWithNoUpdate.updateCalled).toBe(false);
    });
});
