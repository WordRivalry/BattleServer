// InProgressState.ts
import {IState} from "../../ecs/components/StateMachine/IState";
import {ECManager} from "../../ecs/ECManager";
import {TimerComponent} from "../../ecs/components/TimerComponent";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {PlayerIdentityComponent} from "../../ecs/components/player/PlayerIdentityComponent";
import {PlayerCommunication, PlayerCommunicationEventType} from "../../ecs/systems/network/PlayerCommunicationSystem";
import {GameIdentityComponent} from "../components/game/GameIdentityComponent";

export class InProgressState implements IState {
    enter(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        // This timer run the game for 10 seconds
        const timer = new TimerComponent(10000, false, () => {});
        ecManager.addComponent(entity, TimerComponent, timer);

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
                        type: "gameStarted",
                        gameSessionUUID: gameIdentityComponent.uuid,
                        playerUUID: playerIdentity.playerUUID,
                        payload: {
                            grid: timer.duration
                        }
                    } as PlayerCommunication
                });
        });
    }
    update(_deltaTime: number, _entity: number, _ecManager: ECManager, _eventSystem: TypedEventEmitter) {}
    exit(entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        ecManager.removeComponent(entity, TimerComponent);
    }
}