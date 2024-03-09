import {Component} from "../../../src/modules/gameEngine/ecs/components/Component";
import {ComponentManager} from "../../../src/modules/gameEngine/ecs/ComponentManager";
import {EntityManager} from "../../../src/modules/gameEngine/ecs/EntityManager";


class TestComponent extends Component {
    value: number;

    constructor(value: number) {
        super();
        this.value = value;
    }
}

describe('EntityManager', () => {
    let entityManager: EntityManager;
    let componentManager: ComponentManager;

    beforeEach(() => {
        componentManager = new ComponentManager();
        entityManager = new EntityManager(componentManager);
    });

    it('should create and track entities', () => {
        const entity = entityManager.createEntity();
        expect(entityManager.getAllEntities()).toContain(entity);
    });

    it('should destroy entity and remove all its components', () => {
        const mockRemoveAllComponents = jest.spyOn(componentManager, 'removeAllComponents');
        const entity = entityManager.createEntity();
        entityManager.destroyEntity(entity);

        expect(mockRemoveAllComponents).toHaveBeenCalledWith(entity);
        expect(entityManager.getAllEntities()).not.toContain(entity);
    });

    it('should manage parent-child relationships', () => {
        const parent = entityManager.createEntity();
        const child = entityManager.createEntity();

        entityManager.addChild(parent, child);
        expect(entityManager.getChildren(parent)).toContain(child);

        entityManager.removeChild(parent, child);
        expect(entityManager.getChildren(parent)).not.toContain(child);
    });

    it('should return an empty array for getChildren if the parent has no children', () => {
        const parent = entityManager.createEntity();
        // Do not add any children to 'parent'

        const children = entityManager.getChildren(parent);
        expect(Array.isArray(children)).toBe(true);
        expect(children.length).toBe(0);
    });


    it('should filter children with specific component', () => {
        const parent = entityManager.createEntity();
        const childWithComponent = entityManager.createEntity();
        const childWithoutComponent = entityManager.createEntity();

        entityManager.addChild(parent, childWithComponent);
        entityManager.addChild(parent, childWithoutComponent);

        entityManager.addComponent(childWithComponent, new TestComponent(100));

        const childrenWithComponent = entityManager.getChildrenWithComponent(parent, TestComponent as any);
        expect(childrenWithComponent).toContain(childWithComponent);
        expect(childrenWithComponent).not.toContain(childWithoutComponent);
    });

    it('should add and remove components from entities', () => {
        const entity = entityManager.createEntity();
        const component = new TestComponent(100);

        entityManager.addComponent(entity, component);
        let retrievedComponent = entityManager.getComponent(entity, TestComponent as any);
        expect(retrievedComponent).toEqual(component);

        entityManager.removeComponent(entity, TestComponent as any);
        expect(() => entityManager.getComponent(entity, TestComponent as any)).toThrow();
    });

    it('should return all entities with a specific component', () => {
        const entityWithComponent = entityManager.createEntity();
        const entityWithoutComponent = entityManager.createEntity();

        entityManager.addComponent(entityWithComponent, new TestComponent(100));

        const entitiesWithComponent = entityManager.getEntitiesWithComponent(TestComponent as any);
        expect(entitiesWithComponent).toContain(entityWithComponent);
        expect(entitiesWithComponent).not.toContain(entityWithoutComponent);
    });
});
