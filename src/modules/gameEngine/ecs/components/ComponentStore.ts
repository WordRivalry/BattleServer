// src/ecs/components/ComponentStore.ts

import {Entity} from "../entity";

export class ComponentStore<T> {
    private components: T[] = [];
    private entityToIndex: Map<Entity, number> = new Map();
    private indexToEntity: Map<number, Entity> = new Map();

    add(entity: Entity, component: T): void {
        if (this.entityToIndex.has(entity)) {
            // Replace existing component if entity already has one
            const index = this.entityToIndex.get(entity)!;
            this.components[index] = component;
        } else {
            // Add new component for entity
            const index = this.components.length;
            this.components.push(component);
            this.entityToIndex.set(entity, index);
            this.indexToEntity.set(index, entity);
        }
    }

    remove(entity: Entity): void {
        const index = this.entityToIndex.get(entity);

        if (index === undefined) {
            console.warn(`Attempted to remove a component from entity ${entity}, but it does not exist.`);
        }

        if (index !== undefined) {
            // Move the last component to the deleted spot to keep the array contiguous
            const lastIndex = this.components.length - 1;
            const lastEntity = this.indexToEntity.get(lastIndex)!;

            if (index !== lastIndex) {
                this.components[index] = this.components[lastIndex];
                this.entityToIndex.set(lastEntity, index);
                this.indexToEntity.set(index, lastEntity);
            }

            this.components.pop();
            this.entityToIndex.delete(entity);
            this.indexToEntity.delete(lastIndex);
        }
    }

    get(entity: Entity): T | undefined {
        const index = this.entityToIndex.get(entity);
        return index !== undefined ? this.components[index] : undefined;
    }

    has(entity: Entity): boolean {
        return this.entityToIndex.has(entity);
    }

    getAllEntities(): Entity[] {
        return Array.from(this.entityToIndex.keys());
    }

    getAllComponents(): T[] {
        return [...this.components];
    }
}
