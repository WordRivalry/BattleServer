// __tests__/unit/GameClock.test.ts
import { GameClock } from '../../src/modules/gameEngine/GameClock';

jest.useFakeTimers();

describe('GameClock', () => {
    let gameClock: GameClock;
    const duration = 5000; // 5 seconds for simplicity
    const tickCallback = jest.fn();
    const completeCallback = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        gameClock = new GameClock(duration, tickCallback, completeCallback);
    });

    it('should correctly start and trigger onTick callbacks', () => {
        gameClock.start();
        jest.advanceTimersByTime(1000); // Advance time by 1 second
        expect(tickCallback).toHaveBeenCalledWith(4000); // 4000 ms remaining
        expect(tickCallback).toHaveBeenCalledTimes(1);
        expect(completeCallback).not.toHaveBeenCalled();
    });

    it('should complete when time runs out', () => {
        gameClock.start();
        jest.advanceTimersByTime(5000); // Advance time by 5 seconds
        expect(tickCallback).toHaveBeenCalledTimes(5); // Called every second
        expect(completeCallback).toHaveBeenCalledTimes(1);
    });

    it('should pause and resume correctly', () => {
        gameClock.start();
        jest.advanceTimersByTime(2000); // Advance time by 2 seconds
        gameClock.pause();

        // Simulate a 2 second pause
        jest.advanceTimersByTime(2000);

        gameClock.resume();
        jest.advanceTimersByTime(1000); // Advance time by 1 more second
        expect(tickCallback).toHaveBeenLastCalledWith(2000); // Should have 2 seconds remaining
        expect(tickCallback).toHaveBeenCalledTimes(3); // Only 3 ticks should have occurred
        expect(completeCallback).not.toHaveBeenCalled();
    });

    it('should handle multiple starts correctly', () => {
        gameClock.start();
        jest.advanceTimersByTime(1000); // 1 second
        gameClock.start(); // Restart the clock
        jest.advanceTimersByTime(1000); // Should still be at 4 seconds remaining due to restart
        expect(tickCallback).toHaveBeenCalledWith(4000);
        expect(tickCallback).toHaveBeenCalledTimes(2); // One tick from first start, one from second
        expect(completeCallback).not.toHaveBeenCalled();
    });

    it('should accurately report remaining time', () => {
        gameClock.start();
        jest.advanceTimersByTime(3000); // Advance time by 3 seconds
        expect(gameClock.getRemainingTime()).toEqual(2000); // 2 seconds should be remaining
    });
});
