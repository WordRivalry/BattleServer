import { ComponentManager, ComponentType } from "../ComponentManager";
import { TypedEventEmitter } from "./TypedEventEmitter";
import { EntityManager } from "../EntityManager";
import { Entity } from "../entities/entity";

export interface ISystem {
    requiredComponents: ComponentType[];
    init?: (entityManager: EntityManager, componentManager: ComponentManager, eventSystem: TypedEventEmitter) => void;
    update: (deltaTime: number, entities: Entity[], componentManager: ComponentManager, eventSystem: TypedEventEmitter) => void;
}

