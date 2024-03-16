// InfoDispatchState.ts
import {IState} from "../../ecs/components/StateMachine/IState";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {GameIdentityComponent} from "../components/game/GameIdentityComponent";
import {PlayerIdentityComponent} from "../../ecs/components/player/PlayerIdentityComponent";
import {PlayerCommunication, PlayerCommunicationEventType} from "../../ecs/systems/network/PlayerCommunicationSystem";
import {GridComponent} from "../components/game/GridComponent";

export class InfoDispatchState implements IState {
    enter(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        const gameIdentityComponent = ecManager.getComponent(entity, GameIdentityComponent);
        const gridComponent = ecManager.getComponent(entity, GridComponent);
        const playerIdentities = ecManager
            .queryComponents(PlayerIdentityComponent)
            .forEntitiesWithParent(entity)
            .execute();

        playerIdentities.forEach((playerIdentity) => {
            eventSystem.emitGeneric(
                PlayerCommunicationEventType.sendMessageToPlayer,
                () => {
                    return {
                        type: "Grid",
                        gameSessionUUID: gameIdentityComponent.uuid,
                        playerUUID: playerIdentity.playerUUID,
                        payload: {
                            grid: gridComponent.grid
                        }
                    } as PlayerCommunication
                });
        });

        ecManager.addTag(entity, 201);
    }
    update(deltaTime: number, entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {}
    exit(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        ecManager.removeTag(entity, 201);
    }
}