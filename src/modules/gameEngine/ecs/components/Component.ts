// src/ecs/components/Component.ts

import { v4 as uuidv4 } from 'uuid';

/**
 * Base class for ECS components.
 * Extend this class to create specific components.
 */
export abstract class Component {
    public readonly id: string;

    protected constructor() {
        this.id = this.generateUniqueId();
    }

    private generateUniqueId() {
        return uuidv4();
    }
}