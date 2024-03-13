// ComponentStore

export class ComponentStore<T> {
    private dense: T[] = [];
    private sparse: number[] = [];
    private entityToDense: Map<number, number> = new Map(); // Maps entity ID to dense index
    private denseToEntity: number[] = []; // Maps dense index back to entity ID

    add(entityId: number, component: T): void {
        if (this.entityToDense.has(entityId)) {
            // If the entity already has this component, replace it
            this.dense[this.entityToDense.get(entityId)!] = component;
        } else {
            // Otherwise, add the new component
            const denseIndex = this.dense.length;
            this.dense.push(component);
            this.sparse.push(entityId); // Use sparse array to mirror dense for backtracking entity IDs
            this.entityToDense.set(entityId, denseIndex);
            this.denseToEntity.push(entityId);
        }
    }

    remove(entityId: number): void {
        const denseIndex = this.entityToDense.get(entityId);
        if (denseIndex !== undefined) {
            // Swap and pop to maintain dense packing
            const lastIndex = this.dense.length - 1;
            const lastEntity = this.denseToEntity[lastIndex];

            // Swap the last component with the one to remove
            this.dense[denseIndex] = this.dense[lastIndex];
            this.sparse[denseIndex] = this.sparse[lastIndex];
            this.entityToDense.set(lastEntity, denseIndex);
            this.denseToEntity[denseIndex] = lastEntity;

            // Remove the last elements
            this.dense.pop();
            this.sparse.pop();
            this.entityToDense.delete(entityId);
            this.denseToEntity.pop();
        }
    }

    get(entityId: number): T | undefined {
        const denseIndex = this.entityToDense.get(entityId);
        if (denseIndex !== undefined) {
            return this.dense[denseIndex];
        }
        return undefined;
    }

    has(entityId: number): boolean {
        return this.entityToDense.has(entityId);
    }

    getAllEntities(): number[] {
        return this.denseToEntity.slice();
    }

    getAllComponents(): T[] {
        return this.dense.slice();
    }
}