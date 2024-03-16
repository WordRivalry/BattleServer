// TypedEvenEmitter.test.ts
import {TypedEventEmitter} from "../../../src/modules/ecs/TypedEventEmitter";

describe('TypedEvenEmitter', () => {
    let eventEmitter: TypedEventEmitter;
    beforeEach(() => {
        eventEmitter = new TypedEventEmitter();
    });

    describe('TypedEventEmitter - Generic Events', () => {
        it('should allow subscription to and emission of generic events', () => {
            const eventName = 'testEvent';
            const payload = { key: 'value' };
            const listener = jest.fn();

            // Subscribe to a generic event
            eventEmitter.subscribeGeneric(eventName, listener);

            // Emit the generic event
            eventEmitter.emitGeneric(eventName, payload);

            // Verify the listener was called with the correct payload
            expect(listener).toHaveBeenCalledWith(payload);
        });
    });

    describe('TypedEventEmitter - Targeted Events', () => {
        it('should handle targeted event subscriptions and emissions', () => {
            const eventName = 'targetedEvent';
            const gameSessionUUID = 'session123';
            const payload = { action: 'move' };
            const listener = jest.fn();

            // Subscribe to a targeted event
            eventEmitter.subscribeTargeted(eventName, gameSessionUUID, listener);

            // Emit the targeted event
            eventEmitter.emitTargeted(eventName, gameSessionUUID, payload);

            // Verify the listener was called with the correct payload and session UUID
            expect(listener).toHaveBeenCalledWith(payload, gameSessionUUID);
        });
    });

    describe('TypedEventEmitter - Unsubscribe', () => {
        it('should unsubscribe from events', () => {
            const eventName = 'unsubscribeEvent';
            const payload = {key: 'value'};
            const listener = jest.fn();

            // Subscribe and immediately unsubscribe
            const unsubscribe = eventEmitter.subscribeGeneric(eventName, listener);
            unsubscribe();

            // Attempt to emit the event
            eventEmitter.emitGeneric(eventName, payload);

            // Listener should not be called since it was unsubscribed
            expect(listener).not.toHaveBeenCalled();
        });

        it('should remove all listeners for a session', () => {
            const eventName = 'sessionEvent';
            const gameSessionUUID = 'sessionToRemove';
            const listener = jest.fn();

            // Subscribe to a session-specific event
            eventEmitter.subscribeTargeted(eventName, gameSessionUUID, listener);

            // Remove all listeners for the session
            eventEmitter.removeAllSessionListeners(gameSessionUUID);

            // Emit the event to test if the listener has been removed
            eventEmitter.emitTargeted(eventName, gameSessionUUID, {});

            // Listener should not be called since it was removed
            expect(listener).not.toHaveBeenCalled();
        });
    });
});
