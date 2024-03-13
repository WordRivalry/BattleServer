import {ISystem} from "../../ecs/systems/System";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/systems/TypedEventEmitter";
import {ComponentType} from "../../ecs/components/ComponentManager";

export class PawnActionSystem implements ISystem {
    requiredComponents: ComponentType[];

    init(ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
    }

    update(deltaTime: number, entities: number[], ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
    }

}