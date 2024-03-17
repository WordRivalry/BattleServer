import {System} from "../../ecs/systems/System";
import {ComponentType} from "../../ecs/components/ComponentManager";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {GameEvent} from "../../ecs/systems/network/NetworkSystem";
import {ConnectionPayload} from "../../server_networking/WebSocketMessageHandler";
import {PlayerIdentityComponent} from "../../ecs/components/player/PlayerIdentityComponent";
import {PlayerConnectionComponent} from "../../ecs/components/player/PlayerConnectionComponent";
import {MissedMessageComponent} from "../../ecs/components/network/MissedMessageComponent";

export class ConnectionEventSystem extends System {

    requiredComponents: ComponentType[] = [];

    init(ecManager: ECManager, eventSystem: TypedEventEmitter): void {
        eventSystem.subscribeGeneric<ConnectionPayload>(GameEvent.PLAYER_CONNECTS, (payload: ConnectionPayload) => {
            const playerUUID = payload.playerUUID;
            const socket = payload.socket;

            const playerEntity = ecManager.queryEntities()
                .withComponentCondition(
                    PlayerIdentityComponent,
                    (component) => component.playerUUID === playerUUID
                )
                .getOne();

            const playerConnection = ecManager.getComponent(playerEntity, PlayerConnectionComponent);

            if (playerConnection.lastSeen === undefined) {
                playerConnection.socket = socket;
            } else {
                playerConnection.socket = socket;
                try {
                    // Send missed messages if any
                    ecManager
                        .getComponent(playerEntity, MissedMessageComponent)
                        .messages
                        .forEach(message => playerConnection.socket!.send(JSON.stringify(message)))

                    // Remove missed messages component
                    ecManager.removeComponent(playerEntity, MissedMessageComponent)
                } catch (e) {
                    console.error(e);
                }
            }

            playerConnection.lastSeen = Date.now();
        });
    }

    update(deltaTime: number, entities: number[], ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
        throw new Error("Event system should not be calling update on ConnectionEvent");
    }
}