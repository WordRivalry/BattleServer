import {System} from "../../../ecs/systems/System";
import {ComponentType} from "../../../ecs/components/ComponentManager";
import {ECManager} from "../../../ecs/ECManager";
import {TypedEventEmitter} from "../../../ecs/systems/TypedEventEmitter";
import {PlayerConnectionComponent} from "../../../ecs/components/player/PlayerConnectionComponent";
import {MissedMessageComponent} from "../../components/network/MissedMessageComponent";

export class SendMissedMessagesSystem extends System {
    requiredComponents: ComponentType[] = [PlayerConnectionComponent, MissedMessageComponent]

    update(deltaTime: number, entities: number[], ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
    }
}