// ComponentManager.ts

import { IQuery } from "./queries/IQuery";
import { ComponentStore } from "./ComponentStore";
import { Component } from "./Component";
import {createScopedLogger} from "../../logger/logger";

export type ComponentType<T extends Component = Component> = new (...args: any[]) => T;

export class ComponentManager {
    private componentStores: Map<ComponentType, ComponentStore<Component>> = new Map();
    private logger = createScopedLogger('ComponentManager');

    addComponent<T extends Component>(entity: number, componentType: ComponentType<T>, component: T) {
        let store = this.componentStores.get(componentType);
        if (!store) {
            store = new ComponentStore<T>();
            this.componentStores.set(componentType, store);
        }
        store.add(entity, component);
        this.logger.context("addComponent").debug(`Added component ${componentType.name} to entity ${entity}`);
    }

    removeComponent<T extends Component>(entity: number, componentType: ComponentType<T>) {
        const store = this.componentStores.get(componentType);
        if (store) {
            store.remove(entity);
        }
        this.logger.context("removeComponent").debug(`Removed component ${componentType.name} from entity ${entity}`);
    }

    getComponent<T extends Component>(entity: number, componentType: ComponentType<T>): T {
        const store = this.componentStores.get(componentType) as ComponentStore<T>;
        if (!store) throw new Error(`Attempted to retrieve a component from entity ${entity}, but it does not exist.`);
        const component = store.get(entity);
        if (!component) throw new Error(`Attempted to retrieve a component from entity ${entity}, but it does not exist.`);
        return component;
    }

    getAllComponentsByType<T extends Component>(componentType: ComponentType<T>): T[] {
        const store = this.componentStores.get(componentType) as ComponentStore<T>;
        if (!store) throw new Error(`Attempted to retrieve a component from entity, but it does not exist.`);
        return store.getAllComponents();
    }

    getEntitiesWithComponent(componentType: ComponentType): number[] {
        const store = this.componentStores.get(componentType);
        return store ? store.getAllEntities() : [];
    }

    getEntityComponents(entity: number): Component[] {
        return Array.from(this.componentStores.values())
            .map(store => store.get(entity))
            .filter(component => component) as Component[];
    }

    getEntityComponentsType(entity: number): ComponentType[] {
        return Array.from(this.componentStores.keys()).filter(type => this.hasComponent(entity, type));
    }

    removeAllComponents(entity: number) {
        this.componentStores.forEach(store => {
            if (store.has(entity)) {
                store.remove(entity);
            }
        });
    }

    hasComponent(entity: number, componentType: ComponentType): boolean {
        const store = this.componentStores.get(componentType);
        return store ? store.has(entity) : false;
    }

    ///////////////////////////////
    // Method to perform queries //
    ///////////////////////////////

    getEntitiesByQuery(query: IQuery): number[] {
        let results: number[] = [];

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

    private getEntitiesWithAllComponents(componentTypes: ComponentType[]): number[] {
        if (componentTypes.length === 0) return [];

        // Initialize with a large set of entities, assuming componentTypes is not empty
        let commonEntities: Set<number> = new Set(this.getEntitiesWithComponent(componentTypes[0]));

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

    private getEntitiesWithAnyComponents(componentTypes: ComponentType[]): number[] {
        const allEntities = new Set<number>();

        for (const type of componentTypes) {
            const store = this.componentStores.get(type);
            if (store) {
                store.getAllEntities().forEach(entity => allEntities.add(entity));
            }
        }

        return Array.from(allEntities);
    }

    private excludeEntitiesWithComponents(entities: number[], componentTypes: ComponentType[]): number[] {
        const exclusionSet = new Set<number>();

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

