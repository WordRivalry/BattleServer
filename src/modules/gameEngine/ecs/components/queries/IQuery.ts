// src/ecs/queries/IQuery.ts

import { ComponentType } from "../ComponentManager";
import { Component } from "../Component";

export interface IPropertyCondition<T extends Component> {
    componentType: ComponentType<T>;
    predicate: (component: T) => boolean;
}

export interface IQuery {
    all?: ComponentType[];
    any?: ComponentType[];
    none?: ComponentType[];
    conditions?: IPropertyCondition<any>[];
}
