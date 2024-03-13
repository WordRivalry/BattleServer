import {TimerSystem} from "../../../../src/modules/gameEngine/ecs/systems/TimerSystem";
import {ComponentManager} from "../../../../src/modules/gameEngine/ecs/components/ComponentManager";
import {TimerComponent} from "../../../../src/modules/gameEngine/ecs/components/TimerComponent";
import {ECManager} from "../../../../src/modules/gameEngine/ecs/ECManager";
import {EntityManager} from "../../../../src/modules/gameEngine/ecs/entities/EntityManager";

jest.mock('../../../../src/modules/gameEngine/ecs/components/ComponentManager');

describe('TimerSystem', () => {
    let system: TimerSystem;
    let componentManager: jest.Mocked<ComponentManager>;
    let ecsManager: ECManager;
    let entity: number;

    beforeEach(() => {
        system = new TimerSystem();
        componentManager = new ComponentManager() as jest.Mocked<ComponentManager>;
        ecsManager = new ECManager(new EntityManager(), componentManager);
        entity = 1;

        componentManager.getComponent.mockImplementation((entity, componentClass) => {
            if (componentClass === TimerComponent) {
                return new TimerComponent(1000, false, jest.fn()) as any;
            }
        });
    });

    it('should increase elapsedTime on update', () => {
        const deltaTime = 500; // half a second
        const timerComponent = new TimerComponent(1000, false, jest.fn());
        componentManager.getComponent.mockReturnValueOnce(timerComponent);

        system.update(deltaTime, [entity], ecsManager);

        expect(timerComponent.elapsedTime).toBe(deltaTime);
    });

    it('should execute callback and not remove component when duration is reached and repeat is true', () => {
        const callback = jest.fn();
        const timerComponent = new TimerComponent(500, true, callback);
        componentManager.getComponent.mockReturnValueOnce(timerComponent);

        system.update(500, [entity], ecsManager); // Reach duration

        expect(callback).toHaveBeenCalledTimes(1);
        expect(timerComponent.elapsedTime).toBe(0); // Should reset for repeating
        expect(componentManager.removeComponent).not.toHaveBeenCalledWith(entity, TimerComponent);
    });

    // it('should remove component when duration is reached and repeat is false', () => {
    //     const callback = jest.fn();
    //     const timerComponent = new TimerComponent(500, false, callback);
    //     componentManager.getComponent.mockReturnValueOnce(timerComponent);
    //
    //     system.update(500, [entity], ecsManager); // Reach duration
    //
    //     expect(callback).toHaveBeenCalledTimes(1);
    //     expect(componentManager.removeComponent).toHaveBeenCalledWith(entity, TimerComponent);
    // });

    it('should not execute callback before duration is reached', () => {
        const callback = jest.fn();
        const timerComponent = new TimerComponent(1000, false, callback);
        componentManager.getComponent.mockReturnValueOnce(timerComponent);

        system.update(500, [entity], ecsManager); // Before reaching duration

        expect(callback).not.toHaveBeenCalled();
    });

    it('should handle error in callback execution gracefully', () => {
        const errorCallback = jest.fn().mockImplementation(() => {
            throw new Error('Callback error');
        });
        const timerComponent = new TimerComponent(500, false, errorCallback);
        componentManager.getComponent.mockReturnValueOnce(timerComponent);
        expect(() => {
            system.update(500, [entity], ecsManager); // Reach duration, expect callback to throw
        }).toThrow();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
});
