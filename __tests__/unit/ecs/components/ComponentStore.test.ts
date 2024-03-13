import {ComponentStore} from '../../../../src/modules/gameEngine/ecs/components/ComponentStore';
import {performance} from 'perf_hooks';

// Mock component for testing
class TestComponent {
    constructor(public value: number) {}
}

describe('ComponentStore', () => {
    let store: ComponentStore<TestComponent>;
    let entity1: number, entity2: number;

    beforeEach(() => {
        store = new ComponentStore<TestComponent>();
        // Assuming entities are represented by simple numeric IDs
        entity1 = 1;
        entity2 = 2;
    });

    it('should add a component and retrieve it by entity ID', () => {
        const component = new TestComponent(10);
        store.add(entity1, component);
        expect(store.get(entity1)).toEqual(component);
    });

    it('should replace an existing component for an entity ID', () => {
        const component1 = new TestComponent(10);
        const component2 = new TestComponent(20);
        store.add(entity1, component1);
        store.add(entity1, component2);
        expect(store.get(entity1)).toEqual(component2);
    });

    it('should correctly handle component replacement without affecting other components', () => {
        const component1 = new TestComponent(10);
        const component2 = new TestComponent(20);
        const component3 = new TestComponent(30);
        store.add(entity1, component1);
        store.add(entity2, component2);

        store.add(entity1, component3); // Replace entity1's component

        expect(store.get(entity1)).toEqual(component3);
        expect(store.get(entity2)).toEqual(component2); // Ensure entity2's component is unaffected
    });

    it('should remove a component associated with an entity ID', () => {
        const component = new TestComponent(10);
        store.add(entity1, component);
        store.remove(entity1);
        expect(store.get(entity1)).toBeUndefined();
    });

    it('should maintain contiguous storage after a component is removed', () => {
        const component1 = new TestComponent(10);
        const component2 = new TestComponent(20);
        const component3 = new TestComponent(30);
        const entity3 = 3;
        store.add(entity1, component1);
        store.add(entity2, component2);
        store.add(entity3, component3);

        store.remove(entity2); // Remove the second component

        expect(store.getAllComponents()).toEqual(expect.arrayContaining([component1, component3]));
        expect(store.getAllEntities()).not.toContain(entity2);
    });

    it('should return true for an entity ID with a component', () => {
        const component = new TestComponent(10);
        store.add(entity1, component);
        expect(store.has(entity1)).toBeTruthy();
    });

    it('should return false for an entity ID without a component', () => {
        expect(store.has(entity1)).toBeFalsy();
    });

    it('should return all entity IDs with components', () => {
        const component1 = new TestComponent(10);
        const component2 = new TestComponent(20);
        store.add(entity1, component1);
        store.add(entity2, component2);
        expect(store.getAllEntities()).toEqual(expect.arrayContaining([entity1, entity2]));
    });

    it('should return all components', () => {
        const component1 = new TestComponent(10);
        const component2 = new TestComponent(20);
        store.add(entity1, component1);
        store.add(entity2, component2);
        expect(store.getAllComponents()).toEqual(expect.arrayContaining([component1, component2]));
    });

    it('should add and retrieve components for multiple entities', () => {
        const component1 = new TestComponent(10);
        const component2 = new TestComponent(20);
        store.add(1, component1);
        store.add(2, component2);
        expect(store.get(1)).toEqual(component1);
        expect(store.get(2)).toEqual(component2);
    });

    it('should handle sequential additions and removals', () => {
        const component = new TestComponent(10);
        store.add(1, component);
        store.remove(1);
        store.add(1, component);
        expect(store.get(1)).toEqual(component);
    });

    it('should not error when removing components from non-existent entities', () => {
        expect(() => store.remove(999)).not.toThrow();
    });

    it('should correctly maintain the dense array after removals', () => {
        const component1 = new TestComponent(10);
        const component2 = new TestComponent(20);
        store.add(1, component1);
        store.add(2, component2);
        store.remove(1);
        expect(store.getAllComponents()).toEqual([component2]);
    });

    it('should return undefined for queries on removed components', () => {
        const component = new TestComponent(10);
        store.add(1, component);
        store.remove(1);
        expect(store.get(1)).toBeUndefined();
    });

    it('should return false for has() queries on removed or non-existent entities', () => {
        store.add(1, new TestComponent(10));
        store.remove(1);
        expect(store.has(1)).toBeFalsy();
        expect(store.has(999)).toBeFalsy(); // Non-existent entity
    });

    it('should correctly report all entities with components', () => {
        store.add(1, new TestComponent(10));
        store.add(2, new TestComponent(20));
        expect(store.getAllEntities()).toEqual(expect.arrayContaining([1, 2]));
    });

    it('should maintain contiguous storage and correct mappings after multiple removals', () => {
        const component1 = new TestComponent(10);
        const component2 = new TestComponent(20);
        const component3 = new TestComponent(30);
        store.add(1, component1);
        store.add(2, component2);
        store.add(3, component3);

        store.remove(2); // Remove the component from the middle entity

        expect(store.getAllComponents()).toEqual(expect.arrayContaining([component1, component3]));
        expect(store.get(1)).toEqual(component1);
        expect(store.get(3)).toEqual(component3);
        expect(store.has(2)).toBeFalsy();
    });

    // Edge Case: Large number of entities
    it('should handle a large number of entities efficiently', () => {
        const maxEntities = 10000;
        for (let i = 0; i < maxEntities; i++) {
            store.add(i, new TestComponent(i));
        }
        expect(store.getAllEntities().length).toEqual(maxEntities);
        expect(store.get(maxEntities - 1)).toEqual(new TestComponent(maxEntities - 1));
    });

    // describe('ComponentStore vs NaiveComponentStore Iteration Performance', () => {
    //     it('ComponentStore should be faster or equal in performance compared to NaiveComponentStore for iteration', () => {
    //         const operationCount = 20;
    //         const naiveStore = new NaiveComponentStore<TestComponent>();
    //         const componentStore = new ComponentStore<TestComponent>();
    //
    //         // Populate stores with test components
    //         for (let i = 0; i < operationCount; i++) {
    //             naiveStore.add(i, new TestComponent(i));
    //             componentStore.add(i, new TestComponent(i));
    //         }
    //
    //         const naiveTime = performComponentUpdates(naiveStore, updateComponent);
    //         const ourTime = performComponentUpdates(componentStore, updateComponent);
    //
    //         console.log(`NaiveComponentStore iteration time: ${naiveTime} ms, ComponentStore iteration time: ${ourTime} ms`);
    //
    //         // Expect our ComponentStore to perform better in iteration
    //         expect(ourTime).toBeLessThanOrEqual(naiveTime);
    //     });
    // });
});

class NaiveComponentStore<T> {
    private readonly components: Record<number, T> = {};

    constructor() {
        this.components = {};
    }

    add(entityId: number, component: T) {
        this.components[entityId] = component;
    }

    remove(entityId: number) {
        delete this.components[entityId];
    }

    get(entityId: number): T | undefined {
        return this.components[entityId];
    }

    getAllComponents(): T[] {
        return Object.values(this.components);
    }
}

function performComponentUpdates(store: any, updateFunction: any) {
    const startTime = performance.now();
    for (let i = 0; i < 10000; i++) {
        const allComponents = store.getAllComponents();
        allComponents.forEach((component: any) => {
            updateFunction(component);
        });
    }

    const endTime = performance.now();
    return endTime - startTime;
}

function updateComponent(component: { value: number; }) {
    // Simulate a simple update operation on the component
    component.value += 1;
}

