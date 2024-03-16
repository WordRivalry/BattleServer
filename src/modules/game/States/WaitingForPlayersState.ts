// WaitingForPlayersState.ts
import {IState} from "../../ecs/components/StateMachine/IState";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {GameEvent} from "../../ecs/systems/network/NetworkSystem";
import {GameIdentityComponent} from "../components/game/GameIdentityComponent";
import {ConnectionPayload} from "../../server_networking/WebSocketMessageHandler";
import {PlayerConnectionComponent} from "../../ecs/components/player/PlayerConnectionComponent";
import {PlayerIdentityComponent} from "../../ecs/components/player/PlayerIdentityComponent";

export class WaitingForPlayersState implements IState {

    cancelSubscription: (() => void) | null = null
    enter(gameEntity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        const gameIdentifyComponent = ecManager.getComponent(gameEntity, GameIdentityComponent);
        this.cancelSubscription = eventSystem.subscribeTargeted(
             GameEvent.PLAYER_CONNECTS,
             gameIdentifyComponent.uuid,
            (payload: ConnectionPayload) => this.handlePlayerJoined(payload, gameEntity, ecManager));
    }
    update(deltaTime: number, entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {}
    exit(gameEntity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        this.cancelSubscription?.();
    }

    private handlePlayerJoined(payload: ConnectionPayload, gameEntity: number, ecManager: ECManager): void {
        const playerEntity = ecManager.queryEntities()
            .withParent(gameEntity)
            .withComponentCondition(PlayerIdentityComponent, (identity) => identity.playerUUID === payload.playerUUID)
            .execute()[0];
        const playerConnection = ecManager.getComponent(playerEntity, PlayerConnectionComponent);
        playerConnection.socket = payload.socket;
        playerConnection.lastSeen = Date.now();
    }
}