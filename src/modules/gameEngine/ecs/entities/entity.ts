// src/ecs/Entity.ts

import { v4 as uuidv4 } from 'uuid';

export class Entity {
    public readonly uuid: string;
    private components: Set<string> = new Set();

    constructor() {
        this.uuid = uuidv4();
    }

    addComponent(componentName: string): void {
        this.components.add(componentName);
    }

    removeComponent(componentName: string): void {
        this.components.delete(componentName);
    }

    hasComponent(componentName: string): boolean {
        return this.components.has(componentName);
    }

    listComponents(): string[] {
        return Array.from(this.components);
    }
}