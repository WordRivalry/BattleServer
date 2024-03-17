// WaitingForPlayersState.ts
import {IState} from "../../ecs/components/StateMachine/IState";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {GameEvent} from "../../ecs/systems/network/NetworkSystem";
import {GameIdentityComponent} from "../components/game/GameIdentityComponent";
import {ConnectionPayload} from "../../server_networking/WebSocketMessageHandler";
import {PlayerConnectionComponent} from "../../ecs/components/player/PlayerConnectionComponent";
import {PlayerIdentityComponent} from "../../ecs/components/player/PlayerIdentityComponent";
import {createScopedLogger} from "../../logger/logger";

export class WaitingForPlayersState implements IState {

    private readonly logger = createScopedLogger('WaitingForPlayersState')

    cancelSubscription: (() => void) | null = null

    enter(gameEntity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        const gameIdentifyComponent = ecManager.getComponent(gameEntity, GameIdentityComponent);
        this.cancelSubscription = eventSystem.subscribeTargeted(
             GameEvent.PLAYER_CONNECTS,
            gameEntity.toString(),
            (payload: ConnectionPayload) => this.handlePlayerJoined(payload, gameEntity, ecManager));
    }

    update(deltaTime: number, entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {}
    exit(gameEntity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        this.cancelSubscription?.();
        this.logger.info(`Exiting waiting for players state`);
    }

    private handlePlayerJoined(payload: ConnectionPayload, gameEntity: number, ecManager: ECManager): void {
        const playerEntity = ecManager
            .queryEntities()
            .withParent(gameEntity)
            .withComponentCondition(PlayerIdentityComponent, (identity) => identity.playerUUID === payload.playerUUID)
            .getOne();
        const playerConnection = ecManager.getComponent(playerEntity, PlayerConnectionComponent);
        playerConnection.socket = payload.socket;
        playerConnection.lastSeen = Date.now();
        this.logger.info(`Player ${payload.playerUUID} joined game ${payload.gameSessionUUID}`);
    }
}