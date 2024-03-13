// ISystem.ts
import {ComponentType} from "../components/ComponentManager";
import {TypedEventEmitter} from "./TypedEventEmitter";
import {ECManager} from "../ECManager";

export interface ISystem {
    requiredComponents: ComponentType[];
    init?: (ecsManager: ECManager, eventSystem: TypedEventEmitter) => void;
    update: (deltaTime: number, entities: number[], ecsManager: ECManager, eventSystem: TypedEventEmitter) => void;
}

