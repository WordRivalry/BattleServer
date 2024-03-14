// PerformingEndGameState.ts
import {IState} from "../../ecs/components/StateMachine/IState";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/systems/TypedEventEmitter";
import {GameIdentityComponent} from "../components/game/GameIdentityComponent";
import {GridComponent} from "../components/game/GridComponent";
import {PlayerIdentityComponent} from "../../ecs/components/player/PlayerIdentityComponent";
import {PlayerCommunication, PlayerCommunicationEventType} from "../../ecs/systems/PlayerCommunicationSystem";

export class PerformingEndGameState implements IState {
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
                        type: "EndGameResult",
                        gameSessionUUID: gameIdentityComponent.uuid,
                        playerUUID: playerIdentity.playerUUID,
                        payload: {
                            msg: "Hello World!"
                        }
                    } as PlayerCommunication
                });
        });
    }
    update(deltaTime: number, entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
    }
    exit(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        // Cleanup or prepare for the next state
    }
}