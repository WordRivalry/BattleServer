// __tests__/unit/ComponentStore.test.ts
import { ComponentStore } from '../../../src/modules/gameEngine/ecs/components/ComponentStore';
import { Entity } from "../../../src/modules/gameEngine/ecs/entities/entity";

// Mock component and entity for testing
class TestComponent {
    constructor(public value: number) {}
}

describe('ComponentStore', () => {
    let store: ComponentStore<TestComponent>;
    let entity1: Entity, entity2: Entity;

    beforeEach(() => {
        store = new ComponentStore<TestComponent>();
        entity1 = new Entity();
        entity2 = new Entity();
    });

    describe('add and get component', () => {
        it('should add a component and retrieve it by entity', () => {
            const component = new TestComponent(10);
            store.add(entity1, component);
            expect(store.get(entity1)).toEqual(component);
        });

        it('should replace an existing component for an entity', () => {
            const component1 = new TestComponent(10);
            const component2 = new TestComponent(20);
            store.add(entity1, component1);
            store.add(entity1, component2);
            expect(store.get(entity1)).toEqual(component2);
        });
    });

    describe('Component replacement', () => {
        it('should correctly handle component replacement without affecting other components', () => {
            const component1 = new TestComponent(10);
            const component2 = new TestComponent(20);
            const component3 = new TestComponent(30);
            store.add(entity1, component1);
            store.add(entity2, component2);

            store.add(entity1, component3); // Replace entity1's component

            expect(store.get(entity1)).toEqual(component3);
            expect(store.get(entity2)).toEqual(component2); // Ensure entity2's component is unaffected
            expect(store.getAllComponents().length).toEqual(2); // Ensure total component count remains correct
        });
    });

    describe('remove component', () => {
        it('should remove a component associated with an entity and throw an error when trying to access it', () => {
            const component = new TestComponent(10);
            store.add(entity1, component);
            store.remove(entity1);

            // Expect an error to be thrown when trying to get a component for an entity that has been removed
            expect(() => store.get(entity1)).toThrow();
        });


        it('should correctly handle removing a non-existent component', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            store.remove(entity1);
            expect(consoleWarnSpy).toHaveBeenCalledWith(`Attempted to remove a component from entity ${entity1}, but it does not exist.`);
            consoleWarnSpy.mockRestore();
        });

        it('should maintain contiguous storage after a component is removed', () => {
            const component1 = new TestComponent(10);
            const component2 = new TestComponent(20);
            const component3 = new TestComponent(30);
            store.add(entity1, component1);
            store.add(entity2, component2);
            store.add(new Entity(), component3); // Add a third component to ensure middle removal

            store.remove(entity2); // Remove the second component

            expect(store.getAllComponents()).toEqual([component1, component3]);
            expect(store.getAllEntities()).not.toContain(entity2);
        });

        it('should correctly update entity-to-index and index-to-entity mappings after removals', () => {
            const component1 = new TestComponent(10);
            const component2 = new TestComponent(20);
            store.add(entity1, component1);
            store.add(entity2, component2);

            store.remove(entity1); // Remove the first entity and its component

            // Using reflection to access private properties
            expect(store['entityToIndex'].has(entity1)).toBeFalsy();
            expect(store['indexToEntity'].has(0)).toBeTruthy(); // Assuming the second component takes the first spot
            expect(store['indexToEntity'].get(0)).toEqual(entity2);
        });
    });

    describe('has component', () => {
        it('should return true for an entity with a component', () => {
            const component = new TestComponent(10);
            store.add(entity1, component);
            expect(store.has(entity1)).toBeTruthy();
        });

        it('should return false for an entity without a component', () => {
            expect(store.has(entity1)).toBeFalsy();
        });
    });

    describe('getAllEntities and getAllComponents', () => {
        it('should return all entities with components', () => {
            const component1 = new TestComponent(10);
            const component2 = new TestComponent(20);
            store.add(entity1, component1);
            store.add(entity2, component2);
            expect(store.getAllEntities()).toEqual([entity1, entity2]);
        });

        it('should return all components', () => {
            const component1 = new TestComponent(10);
            const component2 = new TestComponent(20);
            store.add(entity1, component1);
            store.add(entity2, component2);
            expect(store.getAllComponents()).toEqual([component1, component2]);
        });
    });
});
