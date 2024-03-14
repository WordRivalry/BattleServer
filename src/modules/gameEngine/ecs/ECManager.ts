// ECManager.ts
import {EntityManager} from "./entities/EntityManager";
import {ComponentManager, ComponentType} from "./components/ComponentManager";
import {Component} from "./components/Component";

export class ECManager {
    constructor(private entityManager: EntityManager, private componentManager: ComponentManager) {}

    destroyEntity(entityId: number): void {
        this.entityManager.destroyEntity(entityId);
        this.componentManager.removeAllComponents(entityId);
    }

    // Expose functionalities from EntityManager

    createEntity(): number {
        const entityId = this.entityManager.createEntity();
        return entityId;
    }

    addTag(entityId: number, tag: number): void {
        this.entityManager.addTag(entityId, tag);
    }

    removeTag(entityId: number, tag: number): void {
        this.entityManager.removeTag(entityId, tag);
    }

    hasTag(entityId: number, tag: number): boolean {
        return this.entityManager.hasTag(entityId, tag);
    }

    setParent(childId: number, parentId: number): void {
        this.entityManager.setParent(childId, parentId);
    }

    removeParent(childId: number): void {
        this.entityManager.removeParent(childId);
    }

    getParent(childId: number): number {
        return this.entityManager.getParent(childId);
    }

    getChildren(parentId: number): number[] {
        return this.entityManager.getChildren(parentId);
    }

    getAllEntities(): number[] {
        return this.entityManager.getAllEntities();
    }

    // Expose functionalities from ComponentManager

    addComponent<T extends Component>(entityId: number, componentType: ComponentType<T>, component: T): void {
        this.componentManager.addComponent(entityId, componentType, component);
    }

    removeComponent<T extends Component>(entityId: number, componentType: ComponentType<T>): void {
        this.componentManager.removeComponent(entityId, componentType);
    }

    getComponent<T extends Component>(entityId: number, componentType: ComponentType<T>): T {
        return this.componentManager.getComponent(entityId, componentType);
    }

    getComponents(entityId: number): Component[] {
        return this.componentManager.getEntityComponents(entityId);
    }

    getAllComponentByType<T extends Component>(componentType: ComponentType<T>): T[] {
        return this.componentManager.getAllComponentsByType(componentType);
    }

    getEntitiesWithComponent(componentType: ComponentType): number[] {
        return this.componentManager.getEntitiesWithComponent(componentType);
    }

    removeAllComponents(entityId: number): void {
        this.componentManager.removeAllComponents(entityId);
    }

    hasComponent(entityId: number, componentType: ComponentType): boolean {
        return this.componentManager.hasComponent(entityId, componentType);
    }

    queryEntities(): EntityQueryBuilder {
        return new EntityQueryBuilder(this);
    }

    queryComponents<T extends Component>(componentType: ComponentType<T>): ComponentQueryBuilder<T> {
        return new ComponentQueryBuilder(this, componentType);
    }
}

interface ComponentCondition<T extends Component> {
    componentType: ComponentType<T>;
    condition: (component: T) => boolean;
}

export class EntityQueryBuilder {
    private ecsManager: ECManager;
    private includeComponents: ComponentType<Component>[] = [];
    private excludeComponents: ComponentType<Component>[] = [];
    private componentConditions: ComponentCondition<any>[] = [];
    private includeTags: number[] = [];
    private excludeTags: number[] = [];
    private parent: number | null = null;
    private includeChildren: number[] = [];
    private excludeChildren: number[] = [];

    constructor(ecsManager: ECManager) {
        this.ecsManager = ecsManager;
    }

    withComponent<T extends Component>(componentType: ComponentType<T>): EntityQueryBuilder {
        this.includeComponents.push(componentType);
        return this;
    }

    withComponents(components: ComponentType<Component>[]): EntityQueryBuilder {
        this.includeComponents.push(...components);
        return this;
    }

    withComponentCondition<T extends Component>(componentType: ComponentType<T>, condition: (component: T) => boolean): EntityQueryBuilder {
        this.componentConditions.push({componentType, condition});
        return this;
    }

    withoutComponent<T extends Component>(componentType: ComponentType<T>): EntityQueryBuilder {
        this.excludeComponents.push(componentType);
        return this;
    }

    withoutComponents(components: ComponentType<Component>[]): EntityQueryBuilder {
        this.excludeComponents.push(...components);
        return this;
    }

    withTag(tag: number): EntityQueryBuilder {
        this.includeTags.push(tag);
        return this;
    }

    withTags(tags: number[]): EntityQueryBuilder {
        this.includeTags.push(...tags);
        return this;
    }

    withoutTag(tag: number): EntityQueryBuilder {
        this.excludeTags.push(tag);
        return this;
    }

    withoutTags(tags: number[]): EntityQueryBuilder {
        this.excludeTags.push(...tags);
        return this;
    }

    withParent(parentId: number): EntityQueryBuilder {
        this.parent = parentId;
        return this;
    }

    withChild(childId: number): EntityQueryBuilder {
        this.includeChildren.push(childId);
        return this;
    }

    withChildren(children: number[]): EntityQueryBuilder {
        this.includeChildren.push(...children);
        return this;
    }

    withoutChild(childId: number): EntityQueryBuilder {
        this.excludeChildren.push(childId);
        return this;
    }

    withoutChildren(children: number[]): EntityQueryBuilder {
        this.excludeChildren.push(...children);
        return this;
    }

    execute(): number[] {
        // Start with all entities or a subset if a parent is specified
        let resultEntities = this.parent !== null
            ? this.ecsManager.getChildren(this.parent)
            : this.ecsManager.getAllEntities();

        // Filter by children inclusion and exclusion
        if (this.includeChildren.length > 0) {
            resultEntities = resultEntities.filter(entityId => {
                // Check if all children are present
                return this.includeChildren.every(childId => this.ecsManager.getParent(childId) === entityId);
            });
        }

        if (this.excludeChildren.length > 0) {
            resultEntities = resultEntities.filter(entityId => {
                // Check if all children are absent
                return this.excludeChildren.every(childId => this.ecsManager.getParent(childId) !== entityId);
            });
        }

        // Filter by tags inclusion and exclusion
        if (this.includeTags.length > 0) {
            resultEntities = resultEntities.filter(entityId =>
                this.includeTags.every(tag => this.ecsManager.hasTag(entityId, tag)));
        }
        if (this.excludeTags.length > 0) {
            resultEntities = resultEntities.filter(entityId =>
                this.excludeTags.every(tag => !this.ecsManager.hasTag(entityId, tag)));
        }

        // Filter by component inclusion, exclusion and conditions
        resultEntities = resultEntities.filter(entityId => {
            // Check for component inclusion
            const includesAllComponents = this.includeComponents.every(componentType =>
                this.ecsManager.hasComponent(entityId, componentType));

            // Check for component exclusion
            const excludesAllComponents = this.excludeComponents.every(componentType =>
                !this.ecsManager.hasComponent(entityId, componentType));

            // Check for component conditions
            const meetsAllConditions = this.componentConditions.every(({componentType, condition}) => {
                if (!this.ecsManager.hasComponent(entityId, componentType)) {
                    return false; // Skip further checks if component is missing
                }
                const component = this.ecsManager.getComponent(entityId, componentType);
                return condition(component); // Apply condition to component
            });

            return includesAllComponents && excludesAllComponents && meetsAllConditions;
        });

        return resultEntities;
    }
}

// Assuming ECManager and other related types are already defined

export class ComponentQueryBuilder<T extends Component> {
    private ecsManager: ECManager;
    private readonly componentType: ComponentType<T>;
    private conditions: ((component: T) => boolean)[] = [];
    private sortComparer: ((a: T, b: T) => number) | null = null;
    private limit: number | null = null;
    private offset: number = 0;
    private parentEntity: number | null = null;

    constructor(ecsManager: ECManager, componentType: ComponentType<T>) {
        this.ecsManager = ecsManager;
        this.componentType = componentType;
    }

    forEntitiesWithParent(parentEntity: number): ComponentQueryBuilder<T> {
        this.parentEntity = parentEntity;
        return this;
    }

    // Adds a condition for querying components
    where(condition: (component: T) => boolean): ComponentQueryBuilder<T> {
        this.conditions.push(condition);
        return this;
    }

    // Allows sorting of the query results
    sortBy(comparer: (a: T, b: T) => number): ComponentQueryBuilder<T> {
        this.sortComparer = comparer;
        return this;
    }

    // Sets the maximum number of components to return
    take(limit: number): ComponentQueryBuilder<T> {
        this.limit = limit;
        return this;
    }

    // Sets the number of components to skip before starting to return the results
    skip(offset: number): ComponentQueryBuilder<T> {
        this.offset = offset;
        return this;
    }

    // Executes the query based on the specified conditions and options
    execute(): T[] {
        let entitiesWithComponent;

        if (this.parentEntity !== null) {
            entitiesWithComponent = this.ecsManager.queryEntities()
                .withComponent(this.componentType)
                .withParent(this.parentEntity)
                .execute();
        } else {
            entitiesWithComponent = this.ecsManager.getEntitiesWithComponent(this.componentType);
        }

        let components = entitiesWithComponent
            .map(entityId => this.ecsManager.getComponent(entityId, this.componentType))
            .filter(component => this.conditions.every(condition => condition(component)));

        if (this.sortComparer) {
            components.sort(this.sortComparer);
        }

        if (this.limit !== null) {
            components = components.slice(this.offset, this.offset + this.limit);
        } else if (this.offset > 0) {
            components = components.slice(this.offset);
        }

        return components;
    }
}
