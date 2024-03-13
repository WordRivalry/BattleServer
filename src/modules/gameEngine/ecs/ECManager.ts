// ECManager.ts
import {EntityManager} from "./entities/EntityManager";
import {ComponentManager, ComponentType} from "./components/ComponentManager";
import {Component} from "./components/Component";

type ECCommandType = 'DestroyEntity';

interface ECCommand {
    type: ECCommandType;
    entityId?: number;
    componentType?: ComponentType;
    component?: Component;
}

export class ECManager {
    private archetypes: Map<string, Set<number>> = new Map();
    private commandBuffer: ECCommand[] = [];

    constructor(
        private entityManager: EntityManager,
        private componentManager: ComponentManager
    ) {
    }

    // Command buffer methods

    processCommands(): void {
        this.commandBuffer.forEach(command => {
            switch (command.type) {
                case 'DestroyEntity':
                    if (command.entityId !== undefined) {
                        this._destroyEntity(command.entityId);
                    }
                    break;
            }
        });
        this.commandBuffer = []; // Clear the buffer after processing
    }

    destroyEntity(entityId: number): void {
        this.enqueueCommand({ type: 'DestroyEntity', entityId });
    }

    private enqueueCommand(command: ECCommand): void {
        this.commandBuffer.push(command);
    }

    private _destroyEntity(entityId: number): void {
        this.removeFromArchetype(entityId);
        this.entityManager.destroyEntity(entityId);
        this.componentManager.removeAllComponents(entityId);
    }

    // Expose functionalities from EntityManager

    createEntity(): number {
        const entityId = this.entityManager.createEntity();
        this.updateArchetype(entityId);
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
        this.updateArchetype(entityId);
    }

    removeComponent<T extends Component>(entityId: number, componentType: ComponentType<T>): void {
        this.componentManager.removeComponent(entityId, componentType);
        this.updateArchetype(entityId);
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

    private updateArchetype(entityId: number): void {
        // Calculate the entity's current archetype based on its components
        const components = this.componentManager.getEntityComponentsType(entityId);
        const archetypeKey = this.getArchetypeKey(components);

        // Update the entity's archetype
        this.removeFromArchetype(entityId); // Remove from old archetype if exists
        if (!this.archetypes.has(archetypeKey)) {
            this.archetypes.set(archetypeKey, new Set());
        }
        this.archetypes.get(archetypeKey)!.add(entityId);
    }

    private removeFromArchetype(entityId: number): void {
        this.archetypes.forEach((entities, key) => {
            if (entities.delete(entityId)) {
                if (entities.size === 0) {
                    this.archetypes.delete(key);
                }
            }
        });
    }

    private getArchetypeKey(components: ComponentType[]): string {
        // Generate a unique key for the archetype
        return components.map(c => c.name).sort().join('_');
    }

    queryEntities(): QueryBuilder {
        return new QueryBuilder(this);
    }
}

interface ComponentCondition<T extends Component> {
    componentType: ComponentType<T>;
    condition: (component: T) => boolean;
}

export class QueryBuilder {
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

    withComponent<T extends Component>(componentType: ComponentType<T>): QueryBuilder {
        this.includeComponents.push(componentType);
        return this;
    }

    withComponents(components: ComponentType<Component>[]): QueryBuilder {
        this.includeComponents.push(...components);
        return this;
    }

    withComponentCondition<T extends Component>(componentType: ComponentType<T>, condition: (component: T) => boolean): QueryBuilder {
        this.componentConditions.push({componentType, condition});
        return this;
    }

    withoutComponent<T extends Component>(componentType: ComponentType<T>): QueryBuilder {
        this.excludeComponents.push(componentType);
        return this;
    }

    withoutComponents(components: ComponentType<Component>[]): QueryBuilder {
        this.excludeComponents.push(...components);
        return this;
    }

    withTag(tag: number): QueryBuilder {
        this.includeTags.push(tag);
        return this;
    }

    withTags(tags: number[]): QueryBuilder {
        this.includeTags.push(...tags);
        return this;
    }

    withoutTag(tag: number): QueryBuilder {
        this.excludeTags.push(tag);
        return this;
    }

    withoutTags(tags: number[]): QueryBuilder {
        this.excludeTags.push(...tags);
        return this;
    }

    withParent(parentId: number): QueryBuilder {
        this.parent = parentId;
        return this;
    }

    withChild(childId: number): QueryBuilder {
        this.includeChildren.push(childId);
        return this;
    }

    withChildren(children: number[]): QueryBuilder {
        this.includeChildren.push(...children);
        return this;
    }

    withoutChild(childId: number): QueryBuilder {
        this.excludeChildren.push(childId);
        return this;
    }

    withoutChildren(children: number[]): QueryBuilder {
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
