// System.ts
import {ComponentType} from "../components/ComponentManager";
import {TypedEventEmitter} from "../TypedEventEmitter";
import {ECManager} from "../ECManager";

export abstract class System {
    abstract requiredComponents: ComponentType[];

    init?(ecsManager: ECManager, eventSystem: TypedEventEmitter): void;

    abstract update(deltaTime: number, entities: number[], ecsManager: ECManager, eventSystem: TypedEventEmitter): void;
}