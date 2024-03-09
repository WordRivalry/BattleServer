// src/ecs/ComponentManager.ts

import { Entity } from "./entities/entity";
import { IQuery } from "./queries/IQuery";
import { ComponentStore } from "./components/ComponentStore";
import { Component } from "./components/Component";

export type ComponentType<T extends Component = Component> = new (...args: any[]) => T;

export class ComponentManager {
    private componentStores: Map<ComponentType, ComponentStore<Component>> = new Map();

    addComponent<T extends Component>(entity: Entity, componentType: ComponentType<T>, component: T) {
        let store = this.componentStores.get(componentType);
        if (!store) {
            store = new ComponentStore<T>();
            this.componentStores.set(componentType, store);
        }
        store.add(entity, component);
    }

    removeComponent<T extends Component>(entity: Entity, componentType: ComponentType<T>) {
        const store = this.componentStores.get(componentType);
        if (store) {
            store.remove(entity);
        }
    }

    getComponent<T extends Component>(entity: Entity, componentType: ComponentType<T>): T {
        const store = this.componentStores.get(componentType) as ComponentStore<T>;
        if (!store) throw new Error(`Attempted to retrieve a component from entity ${entity}, but it does not exist.`);
        return store.get(entity);
    }

    getEntitiesWithComponent(componentType: ComponentType): Entity[] {
        const store = this.componentStores.get(componentType);
        return store ? store.getAllEntities() : [];
    }

    removeAllComponents(entity: Entity) {
        this.componentStores.forEach(store => store.remove(entity));
    }

    hasComponent(entity: Entity, componentType: ComponentType): boolean {
        const store = this.componentStores.get(componentType);
        return store ? store.has(entity) : false;
    }

    ///////////////////////////////
    // Method to perform queries //
    ///////////////////////////////

    getEntitiesByQuery(query: IQuery): Entity[] {
        let results: Entity[] = [];

        // Handle 'all' conditions
        if (query.all && query.all.length > 0) {
            results = this.getEntitiesWithAllComponents(query.all);
        }

        // Handle 'any' conditions - merge with existing results if 'all' was used
        if (query.any && query.any.length > 0) {
            const anyResults = this.getEntitiesWithAnyComponents(query.any);
            results = query.all ? results.filter(entity => anyResults.includes(entity)) : anyResults;
        }

        // Handle 'none' conditions - exclude from current results
        if (query.none && query.none.length > 0) {
            results = this.excludeEntitiesWithComponents(results, query.none);
        }

        // Apply conditions if any
        if (query.conditions && query.conditions.length > 0) {
            results = results.filter(entity => query.conditions!.every(condition => {
                const component = this.getComponent(entity, condition.componentType);
                return component ? condition.predicate(component) : false;
            }));
        }

        return results;
    }

    private getEntitiesWithAllComponents(componentTypes: ComponentType[]): Entity[] {
        if (componentTypes.length === 0) return [];

        // Initialize with a large set of entities, assuming componentTypes is not empty
        let commonEntities: Set<Entity> = new Set(this.getEntitiesWithComponent(componentTypes[0]));

        for (const type of componentTypes.slice(1)) {
            const store = this.componentStores.get(type);
            if (!store) {
                // If any componentType has no store, no entities have all components
                return [];
            }
            const entitiesWithComponent = new Set(store.getAllEntities());
            commonEntities = new Set([...commonEntities].filter(x => entitiesWithComponent.has(x)));
        }

        return Array.from(commonEntities);
    }

    private getEntitiesWithAnyComponents(componentTypes: ComponentType[]): Entity[] {
        const allEntities = new Set<Entity>();

        for (const type of componentTypes) {
            const store = this.componentStores.get(type);
            if (store) {
                store.getAllEntities().forEach(entity => allEntities.add(entity));
            }
        }

        return Array.from(allEntities);
    }

    private excludeEntitiesWithComponents(entities: Entity[], componentTypes: ComponentType[]): Entity[] {
        const exclusionSet = new Set<Entity>();

        for (const type of componentTypes) {
            const store = this.componentStores.get(type);
            if (store) {
                store.getAllEntities().forEach(entity => exclusionSet.add(entity));
            }
        }

        // Filter the original list
        return entities.filter(entity => !exclusionSet.has(entity));
    }
}

