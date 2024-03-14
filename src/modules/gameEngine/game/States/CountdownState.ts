// CountdownState.ts
import {IState} from "../../ecs/components/StateMachine/IState";
import {ECManager} from "../../ecs/ECManager";
import {TimerComponent} from "../../ecs/components/TimerComponent";
import {TypedEventEmitter} from "../../ecs/systems/TypedEventEmitter";
import {PlayerCommunication, PlayerCommunicationEventType} from "../../ecs/systems/PlayerCommunicationSystem";
import {GameIdentityComponent} from "../components/game/GameIdentityComponent";
import {PlayerIdentityComponent} from "../../ecs/components/player/PlayerIdentityComponent";

export class CountdownState implements IState {
    enter(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        // Set timer
        const timerComponent = new TimerComponent(3000, false);
        ecManager.addComponent(entity, TimerComponent, timerComponent);

        // Send countdown duration to all players
        const gameIdentityComponent = ecManager.getComponent(entity, GameIdentityComponent);
        const playerIdentities = ecManager
            .queryComponents(PlayerIdentityComponent)
            .forEntitiesWithParent(entity)
            .execute();

        playerIdentities.forEach((playerIdentity) => {
            eventSystem.emitGeneric(
                PlayerCommunicationEventType.sendMessageToPlayer,
                () => {
                    return {
                        type: "countdown",
                        gameSessionUUID: gameIdentityComponent.uuid,
                        playerUUID: playerIdentity.playerUUID,
                        payload: {
                            time: timerComponent.duration
                        }
                    } as PlayerCommunication
                });
        });
    }

    update(_deltaTime: number, _entity: number, _ecManager: ECManager, _eventSystem: TypedEventEmitter) {}

    exit(gameEntity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        ecManager.removeComponent(gameEntity, TimerComponent);
    }
}