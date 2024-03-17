// GlobalInputEventQueue.ta
import { Input } from './Input';

export class GlobalInputEventQueue {
    private static queue: Input[] = [];

    static enqueue(inputEvent: Input) {
        this.queue.push(inputEvent);
    }

    static fetchAndClearInputsForEntity(playerUUID: string): Input[] {
        const entityInputs = this.queue.filter(input => input.playerUUID === playerUUID);
        this.queue = this.queue.filter(input => input.playerUUID !== playerUUID);
        return entityInputs;
    }

    static clearAll() {
        this.queue = [];
    }
}
