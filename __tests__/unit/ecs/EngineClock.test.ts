import {EngineClock} from "../../../src/modules/gameEngine/ecs/EngineClock";

describe('EngineClock', () => {
    let engineClock: EngineClock;

    beforeEach(() => {
        jest.useFakeTimers(); // Start with using Jest's fake timers
        jest.spyOn(performance, 'now');

        // Reset the performance.now() to a known value before each test
        (performance.now as jest.Mock).mockReturnValueOnce(1000);

        engineClock = new EngineClock();
    });

    afterEach(() => {
        jest.restoreAllMocks(); // Restore mocks to original implementations
    });

    it('should correctly calculate deltaTime and update currentTime for a single update', () => {
        // Simulate the passage of time
        (performance.now as jest.Mock).mockReturnValue(1100); // Advance time by 100ms

        // Perform the update and calculate deltaTime
        const deltaTime = engineClock.update();

        // Check if deltaTime is calculated correctly
        expect(deltaTime).toBeCloseTo(100); // Expected deltaTime given the time progression

        // currentTime should be correctly updated based on deltaTime
        expect(engineClock.getCurrentTime()).toBeCloseTo(100); // currentTime updated by deltaTime
    });

    it('should respect timeScale when calculating deltaTime', () => {
        // Adjust the timescale
        engineClock.setTimeScale(2);

        // Simulate the passage of time
        (performance.now as jest.Mock).mockReturnValue(1200); // Advance time by 200ms from the initial mocked value

        // Perform the update
        const deltaTime = engineClock.update();

        // Check if deltaTime respects the timescale
        expect(deltaTime).toBeCloseTo(400); // deltaTime should be 200 * 2 due to timeScale

        // currentTime should be correctly updated based on scaled deltaTime
        expect(engineClock.getCurrentTime()).toBeCloseTo(400); // scaled deltaTime added to currentTime
    });

    it('should allow getting and setting the timeScale', () => {
        // Set a new timescale
        engineClock.setTimeScale(0.5);
        expect(engineClock.getTimeScale()).toBe(0.5);

        // Simulate the passage of time
        (performance.now as jest.Mock).mockReturnValue(1300); // Advance time by 300ms from the initial mocked value

        // Perform the update
        engineClock.update();

        // deltaTime calculation should reflect the new timescale
        const adjustedDeltaTime = 300 * 0.5; // 150ms considering the timescale
        expect(engineClock.getCurrentTime()).toBeCloseTo(adjustedDeltaTime);
    });

    it('should correctly report lastUpdateTime after an update', () => {
        // Simulate the passage of time
        (performance.now as jest.Mock).mockReturnValue(1400); // Advance time by 400ms from the initial mocked value

        // Perform the update
        engineClock.update();

        // lastUpdateTime should reflect the mocked performance.now() value
        expect(engineClock.getLastUpdateTime()).toBe(1400);
    });
});

