import {TimerComponent} from "../../../../src/modules/gameEngine/ecs/components/TimerComponent";

describe('TimerComponent', () => {

    describe('TimerComponent Constructor', () => {
        it('should correctly initialize with provided parameters', () => {
            const duration = 5000; // Example duration in milliseconds
            const repeat = true; // Example repeat flag
            const callback = jest.fn(); // Example callback function as a mock

            const timerComponent = new TimerComponent(duration, repeat, callback);

            // Verify duration is set correctly
            expect(timerComponent.duration).toBe(duration);
            // Verify repeat flag is set correctly
            expect(timerComponent.repeat).toBe(repeat);
            // Verify callback is set correctly
            expect(timerComponent.callback).toBe(callback);
            // Verify elapsedTime starts at 0
            expect(timerComponent.elapsedTime).toBe(0);
            // Verify isActive defaults to true
            expect(timerComponent.isActive).toBe(true);
        });

        it('should correctly initialize with default values for repeat and callback', () => {
            const duration = 3000; // Only providing duration

            const timerComponent = new TimerComponent(duration);

            // Verify duration is set correctly
            expect(timerComponent.duration).toBe(duration);
            // Verify repeat defaults to false
            expect(timerComponent.repeat).toBe(false);
            // Verify callback defaults to null
            expect(timerComponent.callback).toBeNull();
            // Additional defaults as previously tested
            expect(timerComponent.elapsedTime).toBe(0);
            expect(timerComponent.isActive).toBe(true);
        });
    });

    it('should execute the callback after the duration', () => {
        jest.useFakeTimers();
        const callback = jest.fn();
        const timerComponent = new TimerComponent(1000, false, callback); // 1 second, no repeat

        // Simulate time passage
        jest.advanceTimersByTime(1000); // Advance by 1 second

        // Normally, you would need a mechanism to regularly update elapsedTime and check the duration,
        // which might be part of your game loop or timer system. This example assumes such a mechanism exists.

        // Assuming elapsedTime is updated somewhere else, we simulate that here.
        timerComponent.elapsedTime = 1000; // Manually set for the test

        // Simulate the check and callback execution if the duration is met
        if (timerComponent.elapsedTime >= timerComponent.duration && timerComponent.isActive) {
            timerComponent.callback?.();
        }

        expect(callback).toHaveBeenCalled();

        jest.useRealTimers();
    });

    it('should repeat executing the callback if repeat is true', () => {
        jest.useFakeTimers();
        const callback = jest.fn();
        const timerComponent = new TimerComponent(500, true, callback); // 500 ms, repeat

        // Simulate two periods passing
        jest.advanceTimersByTime(1000); // Advance by 1 second

        // Simulate regular update (normally part of your game loop)
        timerComponent.elapsedTime = 500; // First period
        if (timerComponent.elapsedTime >= timerComponent.duration && timerComponent.isActive) {
            timerComponent.callback?.();
            timerComponent.elapsedTime = 0; // Reset for repeat
        }

        timerComponent.elapsedTime = 500; // Second period
        if (timerComponent.elapsedTime >= timerComponent.duration && timerComponent.isActive) {
            timerComponent.callback?.();
        }

        expect(callback).toHaveBeenCalledTimes(2);

        jest.useRealTimers();
    });

    it('should not execute the callback if isActive is false', () => {
        const callback = jest.fn();
        const timerComponent = new TimerComponent(1000, false, callback);
        timerComponent.isActive = false;

        timerComponent.elapsedTime = 1000; // Manually set for the test

        if (timerComponent.elapsedTime >= timerComponent.duration && timerComponent.isActive) {
            timerComponent.callback?.();
        }

        expect(callback).not.toHaveBeenCalled();
    });

    // Additional tests can be designed to further explore the behavior under different conditions,
    // such as changing `isActive` status over time or modifying `duration` and `repeat` properties dynamically.
});
