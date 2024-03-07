// __tests__/unit/ComponentStore.test.ts
import { ComponentStore } from '../../src/modules/gameEngine/ecs/components/ComponentStore';

// Mock component and entity for testing
class TestComponent {
    constructor(public value: number) {}
}
type TestEntity = number;

describe('ComponentStore', () => {
    let store: ComponentStore<TestComponent>;
    let entity1: TestEntity, entity2: TestEntity;

    beforeEach(() => {
        store = new ComponentStore<TestComponent>();
        entity1 = 1; // Simulate entity IDs
        entity2 = 2;
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

    describe('remove component', () => {
        it('should remove a component associated with an entity', () => {
            const component = new TestComponent(10);
            store.add(entity1, component);
            store.remove(entity1);
            expect(store.get(entity1)).toBeUndefined();
        });

        it('should correctly handle removing a non-existent component', () => {
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
            store.remove(entity1);
            expect(consoleWarnSpy).toHaveBeenCalledWith(`Attempted to remove a component from entity ${entity1}, but it does not exist.`);
            consoleWarnSpy.mockRestore();
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
