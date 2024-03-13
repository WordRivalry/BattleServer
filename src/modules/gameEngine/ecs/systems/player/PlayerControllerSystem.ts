// PlayerControllerSystem.ts
import {ISystem} from "../System";
import {ECManager} from "../../ECManager";
import {TypedEventEmitter} from "../TypedEventEmitter";
import {ComponentType} from "../../components/ComponentManager";

export class PlayerControllerSystem implements ISystem {
    requiredComponents: ComponentType[] = [];

    init(ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
    }

    update(deltaTime: number, entities: number[], ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
    }
}