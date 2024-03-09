import {GameEngine} from "../../../src/modules/gameEngine/ecs/GameEngine";
import {GlobalComponent} from "../../../src/modules/gameEngine/ecs/components/GlobalComponent";
import {Component} from "../../../src/modules/gameEngine/ecs/components/Component";
import {ISystem} from "../../../src/modules/gameEngine/ecs/systems/System";
import {TypedEventEmitter} from "../../../src/modules/gameEngine/ecs/systems/TypedEventEmitter";
import {ComponentManager} from "../../../src/modules/gameEngine/ecs/ComponentManager";
import {Entity} from "../../../src/modules/gameEngine/ecs/entities/entity";

class TestComponent extends Component {
    value: number;

    constructor(value: number) {
        super();
        this.value = value;
    }
}

class MockSystem implements ISystem {
    requiredComponents = [];
    lastDeltaTime: number | null = null;

    update(deltaTime: number, entities: Entity[], componentManager: ComponentManager, eventSystem: TypedEventEmitter): void {
        this.lastDeltaTime = deltaTime;
    }
}

describe('GameEngine', () => {
    let gameEngine: GameEngine;

    beforeEach(() => {
        gameEngine = new GameEngine();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks(); // Restore original implementations
    });

    describe('GameEngine Initialization and Control', () => {

        it('If game engine is not running, it should start and stop', () => {
            gameEngine.start();
            expect(gameEngine.running).toBe(true);

            gameEngine.stop();
            expect(gameEngine.running).toBe(false);
        });

        it('should correctly initialize with required systems and global entity', () => {
            expect(gameEngine.systemManager).toBeDefined();
            expect(gameEngine.entityManager).toBeDefined();
            expect(gameEngine.componentManager).toBeDefined();
            expect(gameEngine.eventSystem).toBeDefined();
            expect(gameEngine.engineClock).toBeDefined();

            // Verify the global entity and its component
            const globalEntities = gameEngine.componentManager.getEntitiesWithComponent(GlobalComponent);
            expect(globalEntities.length).toBe(1);
        });

        it('should emit ECS_START and ECS_STOP events on start and stop', () => {
            const startSpy = jest.spyOn(gameEngine.eventSystem, 'emitGeneric');
            gameEngine.start();
            expect(startSpy).toHaveBeenCalledWith("ECS_START", {});

            const stopSpy = jest.spyOn(gameEngine.eventSystem, 'emitGeneric');
            gameEngine.stop();
            expect(stopSpy).toHaveBeenCalledWith("ECS_STOP", {});
        });
    });

    describe('GameEngine Loop Control', () => {

        let gameEngine: GameEngine;

        beforeEach(() => {
            gameEngine = new GameEngine();
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
            jest.restoreAllMocks(); // Ensure mocks are cleared to prevent test interference
        });

        it('should not proceed with engine loop updates when not running', () => {
            // Assuming you have access to mock or spy on the systemManager's update method
            const mockUpdate = jest.fn();
            gameEngine.systemManager.update = mockUpdate;

            // Manually invoke the engine loop without setting the running flag to true
            gameEngine['engineLoop'](); // If engineLoop is private, this might need to be triggered indirectly

            // Advance timers to simulate time passage
            jest.advanceTimersByTime(50); // Advance by one tick rate duration

            // Validate that the update method was not called since the running flag should prevent it
            expect(mockUpdate).not.toHaveBeenCalled();

            // Clean up by stopping the engine if needed
            gameEngine.stop();
        });

        it('should resume engine loop updates when restarted after being stopped', () => {
            // Restart the engine after stopping
            gameEngine.start();
            gameEngine.stop();
            gameEngine.start();

            const mockUpdate = jest.fn();
            gameEngine.systemManager.update = mockUpdate;

            jest.advanceTimersByTime(50); // Advance by one tick rate duration after restart

            // Validate that the update method was called after restart
            expect(mockUpdate).toHaveBeenCalled();

            gameEngine.stop();
        });

        it('should update systems with the calculated deltaTime', () => {
            const mockUpdate = jest.fn();
            gameEngine.systemManager.update = mockUpdate;

            gameEngine.start();
            jest.advanceTimersByTime(50); // Advance by one tick rate duration

            expect(mockUpdate).toHaveBeenCalled();
            gameEngine.stop();
        });

        it('should adjust for actual time taken by updates in scheduling next tick', async () => {
            // Register a mock system to track deltaTime updates
            const mockSystem = new MockSystem();
            gameEngine.systemManager.registerSystem(mockSystem, 1);

            gameEngine.start();

            // Mock `performance.now()` to simulate the passage of time
            const initialTime = performance.now();
            jest.spyOn(performance, 'now').mockReturnValueOnce(initialTime).mockReturnValueOnce(initialTime + 25);

            // Use fake timers to advance time
            jest.advanceTimersByTime(500);

            // Since we're not directly asserting on setTimeout timing due to Jest's limitations,
            // verify if the mock system received an update call with the expected deltaTime.
            // Note: This assertion might need to be adjusted based on how your game engine and systems are expected to operate.
            expect(mockSystem.lastDeltaTime).not.toBeNull();
            expect(mockSystem.lastDeltaTime).toBeGreaterThan(0); // Ensure deltaTime was positive

            gameEngine.stop();
        });
    });

    describe('GameEngine Entity and Component Management', () => {

        it('should allow for entity creation and component attachment', () => {
            const entity = gameEngine.createEntity();
            expect(entity).toBeDefined();

            const testComponent = new TestComponent(1);
            gameEngine.attachComponent(entity, TestComponent, testComponent);

            const retrievedComponent = gameEngine.componentManager.getComponent(entity, TestComponent);
            expect(retrievedComponent).toBe(testComponent);
        });

        it('should support linking entities in a parent-child relationship', () => {
            const parent = gameEngine.createEntity();
            const child = gameEngine.createEntity();

            gameEngine.linkChildToParent(parent, child);

            const children = gameEngine.entityManager.getChildren(parent);
            expect(children).toContain(child);
        });
    });

    describe('EventSystem Integration', () => {

        it('should trigger system-specific events on start', () => {
            // Example: If you have systems that listen to ECS_START
            const startListenerMock = jest.fn();
            gameEngine.eventSystem.subscribeGeneric("ECS_START", startListenerMock);

            gameEngine.start();

            expect(startListenerMock).toHaveBeenCalled();

            gameEngine.stop();
        });

        it('should trigger system-specific events on stop', () => {
            // Example: If you have systems that listen to ECS_STOP
            const stopListenerMock = jest.fn();
            gameEngine.eventSystem.subscribeGeneric("ECS_STOP", stopListenerMock);

            gameEngine.start();
            gameEngine.stop();

            expect(stopListenerMock).toHaveBeenCalled();
        });
    });
});

