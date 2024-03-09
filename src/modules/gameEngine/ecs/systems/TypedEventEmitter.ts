// EventSystem.ts

import {EventEmitter} from "events";

// Define a generic type for event listeners to improve type safety
type EventListener<T = any> = (payload: T, gameSessionUUID: string) => void;

export class TypedEventEmitter {
    private emitter = new EventEmitter();

    // Subscribe to a generic event
    subscribeGeneric<T>(eventName: string, listener: EventListener<T>): () => void {
        this.emitter.on(eventName, listener);

        // Return an unsubscribe function to allow for easy cleanup
        return () => this.emitter.removeListener(eventName, listener);
    }

    // Subscribe to a targeted event with strong typing
    subscribeTargeted<T>(eventName: string, gameSessionUUID: string, listener: EventListener<T>): () => void {
        const scopedEventName = this.scopedEventName(eventName, gameSessionUUID);
        this.emitter.on(scopedEventName, listener);

        // Return an unsubscribe function to allow for easy cleanup
        return () => this.emitter.removeListener(scopedEventName, listener);
    }

    // Emit a generic event with a payload
    emitGeneric<T>(eventName: string, payload: T): void {
        this.emitter.emit(eventName, payload);
    }

    // Emit a targeted event with a payload
    emitTargeted<T>(eventName: string, gameSessionUUID: string, payload: T): void {
        const scopedEventName = this.scopedEventName(eventName, gameSessionUUID);
        this.emitter.emit(scopedEventName, payload, gameSessionUUID);
    }

    // Remove all listeners for a specific session
    removeAllSessionListeners(gameSessionUUID: string): void {
        const eventNames = this.emitter.eventNames() as string[];
        eventNames.forEach(eventName => {
            if (eventName.startsWith(`${gameSessionUUID}:`)) {
                this.emitter.removeAllListeners(eventName);
            }
        });
    }

    // Utility function to generate scoped event names for targeted events
    private scopedEventName(eventName: string, gameSessionUUID: string): string {
        return `${gameSessionUUID}:${eventName}`;
    }
}
