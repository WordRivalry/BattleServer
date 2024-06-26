import {System} from "../../ecs/systems/System";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {ComponentType} from "../../ecs/components/ComponentManager";

export class PawnActionSystem extends System {
    requiredComponents: ComponentType[] = [];

    init(ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
    }

    update(deltaTime: number, entities: number[], ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
    }
}