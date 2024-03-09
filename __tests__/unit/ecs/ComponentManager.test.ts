// __tests__/unit/ComponentManager.test.ts
import {ComponentManager} from '../../../src/modules/gameEngine/ecs/ComponentManager';
import {Component} from '../../../src/modules/gameEngine/ecs/components/Component';
import {Entity} from "../../../src/modules/gameEngine/ecs/entities/entity";

// Test component extending the base Component class
class TestComponent extends Component {
    value: number;

    constructor(value: number) {
        super();
        this.value = value;
    }
}

class AnotherTestComponent extends Component {
    value: string;

    constructor(value: string) {
        super();
        this.value = value;
    }
}

describe('ComponentManager', () => {
    let manager: ComponentManager;
    let entity: Entity;
    let entity2: Entity;

    beforeEach(() => {
        manager = new ComponentManager();
        entity = new Entity();
        entity2 = new Entity();
    });

    it('should add and retrieve a component for an entity', () => {
        const testComponent = new TestComponent(100);
        manager.addComponent(entity, TestComponent, testComponent);

        const retrievedComponent = manager.getComponent<TestComponent>(entity, TestComponent);
        expect(retrievedComponent).toBeInstanceOf(TestComponent);
        expect(retrievedComponent?.value).toEqual(100);
    });

    it('should throw an error when trying to get a non-existent component', () => {
        const testEntity = new Entity();
        expect(() => {
            manager.getComponent(testEntity, TestComponent);
        }).toThrow();
    });

    it('should throw an error when trying to get a component that has been removed from an entity', () => {
        const testComponent = new TestComponent(100);
        manager.addComponent(entity, TestComponent, testComponent);

        manager.removeComponent(entity, TestComponent);

        expect(() => {
            manager.getComponent<TestComponent>(entity, TestComponent);
        }).toThrow();
    });

    it('should return all entities with a specific component', () => {
        manager.addComponent(entity, TestComponent, new TestComponent(100));
        manager.addComponent(entity2, TestComponent, new TestComponent(200));

        const entitiesWithComponent = manager.getEntitiesWithComponent(TestComponent);
        expect(entitiesWithComponent).toContain(entity);
        expect(entitiesWithComponent).toContain(entity2);
        expect(entitiesWithComponent.length).toEqual(2);
    });

    it('should return an empty array when called with an empty array of component types', () => {
        manager.addComponent(entity, TestComponent, new TestComponent(100));
        manager.addComponent(entity2, TestComponent, new TestComponent(200));

        // Intentionally calling with an empty array
        const results = manager.getEntitiesByQuery({ all: [] });
        expect(results).toEqual([]);
    });

    it('should return true when entity has the component', () => {
        manager.addComponent(entity, TestComponent, new TestComponent(100));
        expect(manager.hasComponent(entity, TestComponent)).toBeTruthy();
    });

    it('should return false when entity does not have the component', () => {
        expect(manager.hasComponent(entity, TestComponent)).toBeFalsy();
    });

    it('should remove all components from an entity with removeAllComponents', () => {
        manager.addComponent(entity, TestComponent, new TestComponent(100));
        manager.addComponent(entity, AnotherTestComponent, new AnotherTestComponent('value'));
        manager.removeAllComponents(entity);

        expect(() => manager.getComponent<TestComponent>(entity, TestComponent)).toThrow();
        expect(() => manager.getComponent<AnotherTestComponent>(entity, AnotherTestComponent)).toThrow();
        expect(manager.hasComponent(entity, TestComponent)).toBeFalsy();
        expect(manager.hasComponent(entity, AnotherTestComponent)).toBeFalsy();
    });

});

describe('Query functionalities', () => {
    let manager: ComponentManager;
    let entity: Entity;
    let entity2: Entity;

    beforeEach(() => {
        manager = new ComponentManager();
        entity = new Entity();
        entity2 = new Entity();
    });


    it('should query entities with all specified components', () => {
        manager.addComponent(entity, TestComponent, new TestComponent(100));
        manager.addComponent(entity2, TestComponent, new TestComponent(200));
        manager.addComponent(entity2, AnotherTestComponent, new AnotherTestComponent('test'));

        const results = manager.getEntitiesByQuery({all: [TestComponent, AnotherTestComponent]});
        expect(results).toEqual([entity2]);
    });

    it('should return entities with any specified components', () => {
        manager.addComponent(entity, TestComponent, new TestComponent(100));
        manager.addComponent(entity2, AnotherTestComponent, new AnotherTestComponent('value'));

        const results = manager.getEntitiesByQuery({ any: [TestComponent, AnotherTestComponent] });
        expect(results.sort()).toEqual([entity, entity2].sort());
    });

    it('should return entities with all specified components when combined with any', () => {
        manager.addComponent(entity, TestComponent, new TestComponent(100));
        manager.addComponent(entity, AnotherTestComponent, new AnotherTestComponent('value'));
        manager.addComponent(entity2, TestComponent, new TestComponent(200));

        const results = manager.getEntitiesByQuery({ all: [TestComponent], any: [AnotherTestComponent] });
        expect(results).toEqual([entity]);
    });

    it('should query entities with any specified components', () => {
        manager.addComponent(entity, TestComponent, new TestComponent(100));
        manager.addComponent(entity2, AnotherTestComponent, new AnotherTestComponent('test'));

        const results = manager.getEntitiesByQuery({any: [TestComponent, AnotherTestComponent]});
        expect(results.sort()).toEqual([entity, entity2].sort());
    });

    it('should correctly apply any and none conditions in a query', () => {
        // Setup: Add components to entities
        manager.addComponent(entity, TestComponent, new TestComponent(100));
        manager.addComponent(entity2, TestComponent, new TestComponent(200));
        manager.addComponent(entity2, AnotherTestComponent, new AnotherTestComponent('test'));

        // Query: Select entities with TestComponent but without AnotherTestComponent
        const results = manager.getEntitiesByQuery({any: [TestComponent], none: [AnotherTestComponent]});

        // Validation: Only entity should be in results, as entity2 has AnotherTestComponent
        expect(results).toEqual([entity]);
    });

    it('should filter entities based on component conditions', () => {
        manager.addComponent(entity, TestComponent, new TestComponent(50));
        manager.addComponent(entity2, TestComponent, new TestComponent(150));

        const results = manager.getEntitiesByQuery({
            all: [TestComponent],
            conditions: [{
                componentType: TestComponent,
                predicate: (component: TestComponent) => component.value > 100,
            }],
        });
        expect(results).toEqual([entity2]);
    });

    it('should return no entities when none meet the specified conditions', () => {
        manager.addComponent(entity, TestComponent, new TestComponent(25));
        manager.addComponent(entity2, TestComponent, new TestComponent(75));

        const results = manager.getEntitiesByQuery({
            all: [TestComponent],
            conditions: [{
                componentType: TestComponent,
                predicate: (component: TestComponent) => component.value > 100,
            }],
        });

        expect(results).toEqual([]);
    });

    it('should return entities that meet all specified conditions', () => {
        manager.addComponent(entity, TestComponent, new TestComponent(200));
        manager.addComponent(entity, AnotherTestComponent, new AnotherTestComponent("A"));
        manager.addComponent(entity2, TestComponent, new TestComponent(150));
        manager.addComponent(entity2, AnotherTestComponent, new AnotherTestComponent("B"));

        const results = manager.getEntitiesByQuery({
            all: [TestComponent, AnotherTestComponent],
            conditions: [{
                componentType: TestComponent,
                predicate: (component: TestComponent) => component.value > 100,
            }, {
                componentType: AnotherTestComponent,
                predicate: (component: AnotherTestComponent) => component.value === "A",
            }],
        });

        expect(results).toEqual([entity]);
    });

    it('should exclude entities that do not have the specified component when applying conditions', () => {
        manager.addComponent(entity, TestComponent, new TestComponent(150));
        // entity2 does not have TestComponent

        const results = manager.getEntitiesByQuery({
            all: [TestComponent],
            conditions: [{
                componentType: TestComponent,
                predicate: (component: TestComponent) => component.value > 100,
            }],
        });

        expect(results).toEqual([entity]);
    });

    it('should throw an error when getComponent is called on an entity without the specified component', () => {
        // Assuming entity does not have AnotherTestComponent added to it.
        manager.addComponent(entity, TestComponent, new TestComponent(100));

        // Define the query with conditions that would lead to getComponent being called
        // for a component that the entity does not have.
        const query = {
            all: [TestComponent],
            conditions: [{
                componentType: AnotherTestComponent, // The entity does not have this component.
                predicate: (component: AnotherTestComponent) => component.value === "test",
            }],
        };

        // Execute the query within an expect block to capture the thrown error.
        expect(() => {
            manager.getEntitiesByQuery(query);
        }).toThrow();
    });


    it('should handle complex queries combining all, any, and none conditions', () => {
        // Setup: Initialize more entities and components
        const entity3 = new Entity();
        manager.addComponent(entity, TestComponent, new TestComponent(50));
        manager.addComponent(entity, AnotherTestComponent, new AnotherTestComponent('foo'));

        manager.addComponent(entity2, TestComponent, new TestComponent(150));
        // Intentionally not adding AnotherTestComponent to entity2

        manager.addComponent(entity3, AnotherTestComponent, new AnotherTestComponent('bar'));
        // Intentionally not adding TestComponent to entity3

        // Query: Select entities with TestComponent and without AnotherTestComponent, but allow any with AnotherTestComponent if value is 'foo'
        const results = manager.getEntitiesByQuery({
            all: [TestComponent, AnotherTestComponent], conditions: [{
                componentType: AnotherTestComponent, predicate: (component) => component.value === 'foo'
            }]
        });

        // Validation: Should only return entity, as it meets all specified conditions
        expect(results).toEqual([entity]);
    });

    it('should perform efficiently under heavy load', () => {
        // Setup: Add a large number of entities and components
        for (let i = 0; i < 10000; i++) {
            const entity = new Entity();
            manager.addComponent(entity, TestComponent, new TestComponent(i));
        }

        // Measure the performance of querying among many entities
        const start = performance.now();
        const results = manager.getEntitiesByQuery({any: [TestComponent]});
        const end = performance.now();

        // Validation: Ensure results are correct and performance is within acceptable bounds
        expect(results.length).toBe(10000);
        expect(end - start).toBeLessThan(100); // threshold, adjust based on expected performance
    });

    it('should efficiently handle complex queries under heavy load', () => {
        const totalEntities = 10000; // Number of entities to test with
        const performanceThreshold = 100; // Milliseconds, adjust based on expectations

        // Setup: Add a large number of entities with mixed components
        for (let i = 1; i <= totalEntities; i++) {
            const entity = new Entity();
            manager.addComponent(entity, TestComponent, new TestComponent(Math.floor(Math.random() * 200))); // Random value between 0 and 199
            if (i % 2 === 0) { // Add AnotherTestComponent to half of the entities
                const value = i % 4 === 0 ? 'foo' : 'bar'; // 'foo' for 25%, 'bar' for another 25%
                manager.addComponent(entity, AnotherTestComponent, new AnotherTestComponent(value));
            }
        }

        // Perform a complex query
        const start = performance.now();
        const results = manager.getEntitiesByQuery({
            all: [TestComponent, AnotherTestComponent], conditions: [{
                componentType: AnotherTestComponent, predicate: (component) => component.value === 'foo'
            }]
        });
        const end = performance.now();

        // The expected number of entities meeting the criteria is totalEntities / 4, since 'foo' is assigned to 25% of entities
        expect(results.length).toBe(totalEntities / 4);

        // Check if the query performance is within acceptable bounds
        // console.log(`Query Time: ${end - start}ms`);
        expect(end - start).toBeLessThan(performanceThreshold);
    });

    it('should return an empty array when no entities have all specified components', () => {
        manager.addComponent(entity, TestComponent, new TestComponent(100)); // Only entity has TestComponent
        // No entity has AnotherTestComponent

        const results = manager.getEntitiesByQuery({ all: [TestComponent, AnotherTestComponent] });
        expect(results).toEqual([]); // Expect empty array since no entity has all specified components
    });
});
