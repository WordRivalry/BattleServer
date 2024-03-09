import {Entity} from "../../../src/modules/gameEngine/ecs/entities/entity";

describe('Entity', () => {
    let entity: Entity;

    beforeEach(() => {
        entity = new Entity();
    });

    it('should be initialized with a unique uuid', () => {
        const anotherEntity = new Entity();
        expect(entity.uuid).toBeDefined();
        expect(typeof entity.uuid).toBe('string');
        expect(entity.uuid).not.toBe(anotherEntity.uuid);
    });

    it('should add a component correctly', () => {
        const componentName = 'TestComponent';
        entity.addComponent(componentName);
        expect(entity.hasComponent(componentName)).toBe(true);
    });

    it('should remove a component correctly', () => {
        const componentName = 'TestComponent';
        entity.addComponent(componentName);
        entity.removeComponent(componentName);
        expect(entity.hasComponent(componentName)).toBe(false);
    });

    it('should check if a component exists correctly', () => {
        const componentName = 'TestComponent';
        entity.addComponent(componentName);
        expect(entity.hasComponent(componentName)).toBe(true);
        expect(entity.hasComponent('NonExistentComponent')).toBe(false);
    });

    it('should list all added components correctly', () => {
        const components = ['Component1', 'Component2', 'Component3'];
        components.forEach(c => entity.addComponent(c));
        const listedComponents = entity.listComponents();
        expect(listedComponents.length).toBe(components.length);
        components.forEach(c => {
            expect(listedComponents).toContain(c);
        });
    });

    it('should not add duplicate components', () => {
        const componentName = 'TestComponent';
        entity.addComponent(componentName);
        entity.addComponent(componentName); // Attempt to add the same component again
        expect(entity.listComponents().length).toBe(1);
        expect(entity.listComponents()).toContain(componentName);
    });

    it('should handle removing non-existent components gracefully', () => {
        const componentName = 'NonExistentComponent';
        entity.removeComponent(componentName); // Attempt to remove a component that was never added
        expect(entity.listComponents().length).toBe(0); // No components should be listed
    });
});