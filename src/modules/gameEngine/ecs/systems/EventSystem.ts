// src/ecs/EventSystem.ts

type Listener = (event: any) => void;

export class EventSystem {
    private listeners: Map<string, Listener[]> = new Map();

    on(eventType: string, listener: Listener) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType)!.push(listener);
    }

    off(eventType: string, listener: Listener) {
        const listeners = this.listeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(eventType: string, event: any) {
        const listeners = this.listeners.get(eventType);
        if (listeners) {
            for (const listener of listeners) {
                listener(event);
            }
        }
    }
}
