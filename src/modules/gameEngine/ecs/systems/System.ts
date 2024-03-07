import { ComponentManager, ComponentType } from "../ComponentManager";
import { Entity } from "../entity";
import { EventSystem } from "./EventSystem";

export interface ISystem {
    requiredComponents: ComponentType[];
    init?: (componentManager: ComponentManager, eventSystem: EventSystem) => void;
    update: (entities: Entity[], deltaTime: number, componentManager: ComponentManager, eventSystem: EventSystem) => void;
}
