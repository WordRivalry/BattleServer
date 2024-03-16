// EntityManager.ts

export class EntityManager {
    private static readonly MAX_ENTITIES = 10000;
    private static readonly NO_PARENT = 0xFFFFFFFF; // Maximum value of Uint32, used to signify no parent
    private entityTags: Uint32Array = new Uint32Array(EntityManager.MAX_ENTITIES);
    private entityParent: Uint32Array = new Uint32Array(EntityManager.MAX_ENTITIES) // Parent entity indices
    private freeIds: number[] = [];
    private nextEntityId = 0;

    constructor() {
        // Initialize entityTags to 0 (no tags) and entityParent to -1 (no parent)
        this.entityTags.fill(0);
        this.entityParent.fill(EntityManager.NO_PARENT);
    }

    createEntity(): number {
        let entityId: number;
        if (this.freeIds.length > 0) {
            entityId = this.freeIds.pop()!;
        } else {
            if (this.nextEntityId >= EntityManager.MAX_ENTITIES) {
                throw new Error("Maximum entity limit reached");
            }
            entityId = this.nextEntityId++;
        }
        // Reset tags and parent for the new entity
        this.entityTags[entityId] = 0;
        this.entityParent[entityId] = EntityManager.NO_PARENT;
        return entityId;
    }

    getAllEntities(): number[] {
        // Return a list of active entities
        return Array.from({ length: this.nextEntityId }, (_, i) => i).filter(this.isActive.bind(this));
    }

    destroyEntity(entityId: number): void {
        this.entityTags[entityId] = 0;
        this.entityParent[entityId] = EntityManager.NO_PARENT;
        this.freeIds.splice(this.sortedIndex(this.freeIds, entityId), 0, entityId);
        // Iterate through entityParent to remove any child references to this entity
        for (let i = 0; i < this.nextEntityId; i++) {
            if (this.entityParent[i] === entityId) {
                this.entityParent[i] = EntityManager.NO_PARENT;
            }
        }
    }

    // Helper method to find the insertion index in a sorted array
    private sortedIndex(array: number[], value: number): number {
        let low = 0, high = array.length;

        while (low < high) {
            let mid = (low + high) >>> 1;
            if (array[mid] < value) low = mid + 1;
            else high = mid;
        }
        return low;
    }

    isActive(entityId: number): boolean {
        // Assuming `nextEntityId` is exclusive and `freeIds` is sorted
        if (entityId >= this.nextEntityId) return false;
        return !this.binarySearch(this.freeIds, entityId);
    }

    // Binary search implementation
    binarySearch(array: number[], target: number): boolean {
        let low = 0, high = array.length - 1;

        while (low <= high) {
            let mid = Math.floor((low + high) / 2);
            if (array[mid] === target) return true;
            else if (array[mid] < target) low = mid + 1;
            else high = mid - 1;
        }

        return false;
    }

    addTag(entityId: number, tag: number): void {
        this.entityTags[entityId] |= 1 << tag;
    }

    hasTag(entityId: number, tag: number): boolean {
        return (this.entityTags[entityId] & (1 << tag)) !== 0;
    }

    removeTag(entityId: number, tag: number): void {
        this.entityTags[entityId] &= ~(1 << tag);
    }

    setParent(childId: number, parentId: number): void {
        this.entityParent[childId] = parentId;
    }

    removeParent(childId: number): void {
        this.entityParent[childId] = EntityManager.NO_PARENT;
    }

    getParent(childId: number): number {
        return this.entityParent[childId];
    }

    getChildren(parentId: number): number[] {
        const children: number[] = [];
        for (let i = 0; i < this.nextEntityId; i++) {
            if (this.entityParent[i] === parentId) {
                children.push(i);
            }
        }
        return children;
    }

    getEntitiesWithTags(tagMask: number): number[] {
        const matchingEntities: number[] = [];
        for (let i = 0; i < this.nextEntityId; i++) {
            if ((this.entityTags[i] & tagMask) === tagMask) {
                matchingEntities.push(i);
            }
        }
        return matchingEntities;
    }

    queryEntities({
        includeTags = [],
        excludeTags = [],
        parent = EntityManager.NO_PARENT
    }: {
        includeTags?: number[],
        excludeTags?: number[],
        parent?: number
    }): number[] {
        const includeMask = includeTags.reduce((acc, tag) => acc | (1 << tag), 0);
        const excludeMask = excludeTags.reduce((acc, tag) => acc | (1 << tag), 0);

        const matchingEntities: number[] = [];
        for (let i = 0; i < this.nextEntityId; i++) {
            if (!this.isActive(i)) continue; // Skip inactive entities
            const hasIncludeTags = (this.entityTags[i] & includeMask) === includeMask;
            const hasExcludeTags = (this.entityTags[i] & excludeMask) !== 0;
            const isChild = parent === EntityManager.NO_PARENT || this.entityParent[i] === parent;

            if (hasIncludeTags && !hasExcludeTags && isChild) {
                matchingEntities.push(i);
            }
        }
        return matchingEntities;
    }
}
