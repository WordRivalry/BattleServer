import {System} from "../System";
import {ECManager} from "../../ECManager";
import {TypedEventEmitter} from "../../TypedEventEmitter";
import {ComponentType} from "../../components/ComponentManager";
import {PlayerConnectionComponent} from "../../components/player/PlayerConnectionComponent";
import {MissedMessageComponent} from "../../components/network/MissedMessageComponent";
import {ConnectionRequestComponent} from "../../components/network/ConnectionRequestComponent";

export class ReconnectionRequestSystem extends System {
    requiredComponents: ComponentType[] = [ConnectionRequestComponent, MissedMessageComponent]

    update(_deltaTime: number, entities: number[], ecManager: ECManager, _eventSystem: TypedEventEmitter): void {
        entities.forEach((entity) => {

            // Get the player connection details
            const playerConnection = ecManager.getComponent(entity, PlayerConnectionComponent);

            // Send missed messages
            ecManager
                .getComponent(entity, MissedMessageComponent)
                .messages
                .forEach(message => playerConnection.socket!.send(JSON.stringify(message)))

            // Remove reconnection flag
            ecManager.removeComponent(entity, ConnectionRequestComponent);
            // Remove missed messages component
            ecManager.removeComponent(entity, MissedMessageComponent)
        });
    }
}