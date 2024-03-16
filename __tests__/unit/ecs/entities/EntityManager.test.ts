// EntityManager.test.ts
import { EntityManager } from "../../../../src/modules/ecs/entities/EntityManager";

describe('EntityManager', () => {
    let entityManager: EntityManager;

    beforeEach(() => {
        entityManager = new EntityManager();
    });

    it('should create and track entities', () => {
        const entity = entityManager.createEntity();
        const allEntities = new Array(10000).fill(null).map((_, index) => index < entityManager['nextEntityId'] ? index : null).filter(id => id !== null);
        expect(allEntities).toContain(entity);
    });

    it('should destroy entity', () => {
        const entity = entityManager.createEntity();
        entityManager.destroyEntity(entity);
        expect(entityManager['freeIds']).toContain(entity);
    });

    it('should manage parent-child relationships', () => {
        const parent = entityManager.createEntity();
        const child = entityManager.createEntity();

        entityManager.setParent(child, parent);
        expect(entityManager.getChildren(parent)).toContain(child);

        entityManager.removeParent(child);
        expect(entityManager.getChildren(parent)).not.toContain(child);
    });

    it('should correctly handle entity limit', () => {
        for (let i = 0; i < EntityManager['MAX_ENTITIES']; i++) {
            expect(() => entityManager.createEntity()).not.toThrow();
        }
        // Expect to throw when exceeding the limit
        expect(() => entityManager.createEntity()).toThrow("Maximum entity limit reached");
    });

    it('should add and remove tags from an entity', () => {
        const entity = entityManager.createEntity();
        entityManager.addTag(entity, 1); // Assuming 1 represents a specific tag
        expect(entityManager.getEntitiesWithTags(1 << 1)).toContain(entity);

        entityManager.removeTag(entity, 1);
        expect(entityManager.getEntitiesWithTags(1 << 1)).not.toContain(entity);
    });

    it('should query entities with multiple inclusion tags', () => {
        const entity1 = entityManager.createEntity();
        entityManager.addTag(entity1, 1);
        entityManager.addTag(entity1, 2);

        const queryResult = entityManager.queryEntities({ includeTags: [1, 2] });
        expect(queryResult).toContain(entity1);
    });

    it('should exclude entities with exclusion tags from query', () => {
        const entity1 = entityManager.createEntity();
        entityManager.addTag(entity1, 1);
        const entity2 = entityManager.createEntity();
        entityManager.addTag(entity2, 2);

        const queryResult = entityManager.queryEntities({ excludeTags: [2] });
        expect(queryResult).toContain(entity1);
        expect(queryResult).not.toContain(entity2);
    });

    it('should return entities based on parent-child query', () => {
        const parent = entityManager.createEntity();
        const child = entityManager.createEntity();
        entityManager.setParent(child, parent);

        const queryResult = entityManager.queryEntities({ parent: parent });
        expect(queryResult).toContain(child);
    });

    it('should reset entity tags and parent on destruction', () => {
        const entity = entityManager.createEntity();
        entityManager.addTag(entity, 1); // Example tag
        entityManager.setParent(entity, 999); // Example parent
        entityManager.destroyEntity(entity);

        // Assuming methods to check tags and parent (not shown in original design)
        expect(entityManager.hasTag(entity, 1)).toBe(false);
        expect(entityManager.getParent(entity)).toBe(4294967295); // Assuming such a method exists
    });


    it('should reuse entity IDs after destruction', () => {
        const entity1 = entityManager.createEntity();
        entityManager.destroyEntity(entity1);
        const entity2 = entityManager.createEntity(); // This should reuse the ID if possible

        expect(entity2).toBe(entity1); // This assertion depends on the implementation of ID reuse strategy
    });

    it('should handle tag operations efficiently', () => {
        const entity = entityManager.createEntity();
        const start = performance.now();
        entityManager.addTag(entity, 1);
        entityManager.hasTag(entity, 1);
        entityManager.removeTag(entity, 1);
        const duration = performance.now() - start;

        //console.log(`Tag operations took ${duration} ms`);
        // Depending on your performance requirements, assert duration is below a threshold
        // expect(duration).toBeLessThan(expectedMaxDuration);
    });

    it('should reset entity tags and parent on destruction correctly', () => {
        const entity = entityManager.createEntity();
        entityManager.addTag(entity, 1);
        entityManager.setParent(entity, 999);
        entityManager.destroyEntity(entity);

        expect(entityManager.hasTag(entity, 1)).toBe(false);
        expect(entityManager.getParent(entity)).toBe(EntityManager['NO_PARENT']); // Updated to reflect the NO_PARENT constant usage
    });

    it('should correctly clear child references when a parent is destroyed', () => {
        const parent = entityManager.createEntity();
        const child1 = entityManager.createEntity();
        const child2 = entityManager.createEntity();
        entityManager.setParent(child1, parent);
        entityManager.setParent(child2, parent);

        entityManager.destroyEntity(parent);

        expect(entityManager.getChildren(parent).length).toBe(0); // Assuming children are cleared upon parent destruction
        expect(entityManager.getParent(child1)).toBe(EntityManager['NO_PARENT']);
        expect(entityManager.getParent(child2)).toBe(EntityManager['NO_PARENT']);
    });

    it('should reset entity tags and parent on destruction correctly', () => {
        const entity = entityManager.createEntity();
        entityManager.addTag(entity, 1); // Example tag
        entityManager.setParent(entity, 999); // Example parent
        entityManager.destroyEntity(entity);

        // Assuming the addition of checks for entity active status and proper tag and parent reset
        expect(entityManager.hasTag(entity, 1)).toBe(false);
        expect(entityManager.getParent(entity)).toBe(EntityManager['NO_PARENT']);
        expect(entityManager.isActive(entity)).toBe(false);
    });


    it('should correctly identify active and inactive entities', () => {
        // Create a few entities and destroy one
        const entity1 = entityManager.createEntity();
        const entity2 = entityManager.createEntity();
        entityManager.destroyEntity(entity1);

        // Directly testing isActive assuming sorted freeIds and exclusive nextEntityId
        expect(entityManager.isActive(entity1)).toBe(false);
        expect(entityManager.isActive(entity2)).toBe(true);

        // Test beyond the current entity range
        expect(entityManager.isActive(entityManager['nextEntityId'])).toBe(false);

        // Assuming entities are created and then one is destroyed
        // This also implicitly tests that freeIds is sorted after destruction
        const newEntity = entityManager.createEntity(); // This might reuse entity1's ID
        if (newEntity === entity1) {
            expect(entityManager.isActive(entity1)).toBe(true); // entity1's ID has been reused
        } else {
            expect(entityManager.isActive(newEntity)).toBe(true);
        }
    });

    it('freeIds should be sorted and not contain active entities', () => {
        let entities = [];
        for (let i = 0; i < 5; i++) {
            entities.push(entityManager.createEntity());
        }

        // Destroy a middle entity
        entityManager.destroyEntity(entities[2]);

        // Expect freeIds to be sorted and contain the destroyed entity ID
        expect(entityManager['freeIds']).toContain(entities[2]);
        expect([...entityManager['freeIds']].sort((a, b) => a - b)).toEqual(entityManager['freeIds']);

        // Create a new entity and expect it to reuse the destroyed entity's ID
        const newEntity = entityManager.createEntity();
        expect(newEntity).toBe(entities[2]);

        // Verify the entity is considered active
        expect(entityManager.isActive(newEntity)).toBe(true);

        // Additional entities should not be in freeIds
        entities.splice(2, 1); // Remove the destroyed entity from our local tracking
        entities.forEach(entity => {
            expect(entityManager.isActive(entity)).toBe(true);
            expect(entityManager['freeIds']).not.toContain(entity);
        });
    });
});
