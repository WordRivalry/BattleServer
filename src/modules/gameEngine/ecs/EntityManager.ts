
import { ComponentManager, ComponentType } from "./ComponentManager";
import { Component } from "./components/Component";
import { Entity } from "./entities/entity";

export class EntityManager {
    private entities: Set<Entity> = new Set();

    // Parent child relationships
    private readonly parentChildMap: Map<Entity, Set<Entity>> = new Map();
    private componentManager: ComponentManager;

    constructor(componentManager: ComponentManager) {
        this.componentManager = componentManager;
    }

    createEntity(): Entity {
        const entity = new Entity();
        this.entities.add(entity);
        return entity;
    }

    destroyEntity(entity: Entity): void {
        this.entities.delete(entity);
        this.componentManager.removeAllComponents(entity);
    }

    addChild(parent: Entity, child: Entity): void {
        if (!this.parentChildMap.has(parent)) {
            this.parentChildMap.set(parent, new Set());
        }
        this.parentChildMap.get(parent)!.add(child);
    }

    removeChild(parent: Entity, child: Entity): void {
        if (this.parentChildMap.has(parent)) {
            this.parentChildMap.get(parent)!.delete(child);
        }
    }

    getChildren(parent: Entity): Entity[] {
        return Array.from(this.parentChildMap.get(parent) || []);
    }

    getChildrenWithComponent<T extends Component>(parent: Entity, componentClass: ComponentType<T>): Entity[] {
        return this.getChildren(parent).filter(child => this.componentManager.hasComponent(child, componentClass));
    }

    addComponent<T extends Component>(entity: Entity, component: T): void {
        this.componentManager.addComponent(entity, component.constructor as any, component);
    }

    removeComponent<T extends Component>(entity: Entity, componentClass: ComponentType<T>): void {
        this.componentManager.removeComponent(entity, componentClass);
    }

    getComponent<T extends Component>(entity: Entity, componentClass: ComponentType<T>): T | undefined {
        return this.componentManager.getComponent(entity, componentClass);
    }

    // Return all entities, except the global entity
    getAllEntities(): Entity[] {
        return Array.from(this.entities);
    }

    getEntitiesWithComponent(componentClass: ComponentType): Entity[] {
        return this.componentManager.getEntitiesWithComponent(componentClass);
    }

    // Additional methods for entity queries, lifecycle events, etc.
}
