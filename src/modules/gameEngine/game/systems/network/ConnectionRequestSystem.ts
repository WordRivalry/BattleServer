import {System} from "../../../ecs/systems/System";
import {ECManager} from "../../../ecs/ECManager";
import {TypedEventEmitter} from "../../../ecs/systems/TypedEventEmitter";
import {ComponentType} from "../../../ecs/components/ComponentManager";
import {ConnectionRequestComponent} from "../../components/network/ConnectionRequestComponent";
import {PlayerConnectionComponent} from "../../../ecs/components/player/PlayerConnectionComponent";
import {ReconnectionRequestComponent} from "../../components/network/ReconnectionRequestComponent";

export class ConnectionRequestSystem  extends System {

    requiredComponents: ComponentType[] = [PlayerConnectionComponent, ConnectionRequestComponent]

    update(_deltaTime: number, entities: number[], ecManager: ECManager, _eventSystem: TypedEventEmitter): void {
        entities.forEach((entity) => {
            this.handleConnectionRequest(entity, ecManager);
        });
    }

    private handleConnectionRequest(entity: number, ecManager: ECManager) {
        const connectionRequest = ecManager.getComponent(entity, ConnectionRequestComponent);
        const playerConnection = ecManager.getComponent(entity, PlayerConnectionComponent);

        const lastSeen = playerConnection.lastSeen;
        if (lastSeen === undefined) {
            playerConnection.socket = connectionRequest.socket;
            playerConnection.lastSeen = Date.now();
            ecManager.removeComponent(entity, ConnectionRequestComponent);
        } else {
            const reconnectionRequest = new ReconnectionRequestComponent();
            ecManager.addComponent(entity, ReconnectionRequestComponent, reconnectionRequest);
        }
    }
}