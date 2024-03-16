// GlobalInputEventQueue.ta
import { InputEvent } from './InputEvent';

export class GlobalInputEventQueue {
    private static queue: InputEvent[] = [];

    static enqueue(inputEvent: InputEvent) {
        this.queue.push(inputEvent);
    }

    static fetchAndClearInputsForEntity(entityId: number): InputEvent[] {
        const entityInputs = this.queue.filter(input => input.entityId === entityId);
        this.queue = this.queue.filter(input => input.entityId !== entityId);
        return entityInputs;
    }

    static clearAll() {
        this.queue = [];
    }
}
