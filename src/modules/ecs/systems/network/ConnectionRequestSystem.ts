import {System} from "../System";
import {ECManager} from "../../ECManager";
import {TypedEventEmitter} from "../../TypedEventEmitter";
import {ComponentType} from "../../components/ComponentManager";
import {ConnectionRequestComponent} from "../../components/network/ConnectionRequestComponent";
import {PlayerConnectionComponent} from "../../components/player/PlayerConnectionComponent";
import {ReconnectionRequestComponent} from "../../components/network/ReconnectionRequestComponent";

export class ConnectionRequestSystem extends System {

    requiredComponents: ComponentType[] = [PlayerConnectionComponent, ConnectionRequestComponent]

    update(_deltaTime: number, entities: number[], ecManager: ECManager, _eventSystem: TypedEventEmitter): void {
        entities.forEach((entity) => {
            this.handleConnectionRequest(entity, ecManager);
        });
    }

    private handleConnectionRequest(entity: number, ecManager: ECManager) {
        const connectionRequest = ecManager.getComponent(entity, ConnectionRequestComponent);
        const playerConnection = ecManager.getComponent(entity, PlayerConnectionComponent);

        if (playerConnection.lastSeen === undefined) {
            this.setConnection(playerConnection, connectionRequest);
        } else {
            this.setConnection(playerConnection, connectionRequest);
            ecManager.addComponent(entity, ReconnectionRequestComponent, new ReconnectionRequestComponent());
        }

        // Clear the connection request component
        ecManager.removeComponent(entity, ConnectionRequestComponent);
    }

    private setConnection(playerConnection: PlayerConnectionComponent, connectionRequest: ConnectionRequestComponent) {
        playerConnection.socket = connectionRequest.socket;
        playerConnection.lastSeen = Date.now();
    }
}