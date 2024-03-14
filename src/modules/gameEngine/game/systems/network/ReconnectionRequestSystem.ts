import {System} from "../../../ecs/systems/System";
import {ECManager} from "../../../ecs/ECManager";
import {TypedEventEmitter} from "../../../ecs/systems/TypedEventEmitter";
import {ComponentType} from "../../../ecs/components/ComponentManager";
import {PlayerConnectionComponent} from "../../../ecs/components/player/PlayerConnectionComponent";
import {ReconnectionRequestComponent} from "../../components/network/ReconnectionRequestComponent";

export class ReconnectionRequestSystem extends System {
    requiredComponents: ComponentType[] = [PlayerConnectionComponent, ReconnectionRequestComponent]

    update(deltaTime: number, entities: number[], ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
        entities.forEach((entity) => {
            const reconnectionRequest = ecsManager.getComponent(entity, ReconnectionRequestComponent);
            const playerConnection = ecsManager.getComponent(entity, PlayerConnectionComponent);
            playerConnection.lastSeen = Date.now();
            ecsManager.removeComponent(entity, ReconnectionRequestComponent);
        });
    }
}