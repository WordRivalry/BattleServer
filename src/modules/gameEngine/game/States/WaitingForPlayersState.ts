// WaitingForPlayersState.ts
import {IState} from "../../ecs/components/StateMachine/IState";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/systems/TypedEventEmitter";
import {GameEvent} from "../../ecs/systems/NetworkSystem";
import {GameIdentityComponent} from "../components/game/GameIdentityComponent";
import {ConnectionPayload} from "../../../server_networking/WebSocketMessageHandler";
import {PlayerConnectionComponent} from "../../ecs/components/player/PlayerConnectionComponent";
import {TimerComponent} from "../../ecs/components/TimerComponent";
import {WebSocket} from "ws";
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
    update(deltaTime: number, entity: number, ecManager: ECManager) {
        // Do nothing
    }
    exit(gameEntity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        this.cancelSubscription?.();
    }

    private handlePlayerJoined(payload: ConnectionPayload, gameEntity: number, ecManager: ECManager): void {
        const playerEntity = this.getPlayerEntity(payload.playerUUID, ecManager);
        const playerConnection = this.getPlayerConnection(payload.playerUUID, ecManager);

        // Update the player connection component
        const lastSeen = playerConnection.lastSeen;
        if (lastSeen === undefined) {
            this.setPlayerConnection(playerConnection, payload.socket);
        } else {
            this.clearReconnectionTimeout(payload.playerUUID);
            this.setPlayerConnection(playerConnection, payload.socket);
            if (!playerConnection.socket) return;
            this.sendMissedMessages(playerEntity, playerConnection.socket, ecManager);
        }

        // Check if all the required players are connected, and if so, start the game
        const allPlayersConnected = ecManager
            .queryEntities()
            .withParent(gameEntity)
            .withComponent(PlayerConnectionComponent)
            .execute()
            .every((entity) => {
                return componentManager
                    .getComponent(entity, PlayerConnectionComponent)
                    ?.socket !== undefined;
            });

        // Start the game if all players are connected
        if (allPlayersConnected) {
            const sessionComponent = componentManager.getComponent(gameEntity, GameStateComponent)
            if (!sessionComponent?.state) return;
            this.logger.info(`All players connected to game ${payload.gameSessionUUID}`);
            sessionComponent.state = SessionState.IN_PROGRESS;

            const timerComponent = componentManager.getComponent(gameEntity, TimerComponent);
            if (!timerComponent) return;
            this.logger.info(`Starting game timer for game ${payload.gameSessionUUID}`);
            timerComponent.isActive = true;
        }
    }

    private setPlayerConnection(playerConnection: PlayerConnectionComponent, socket: WebSocket) {
        playerConnection.socket = socket;
        playerConnection.lastSeen = Date.now();
    }

    private getPlayerEntity(playerUUID: string,  ecsManager: ECManager): number {
        const playerEntities = ecsManager
            .queryEntities()
            .withComponent(PlayerConnectionComponent)
            .execute();
        if (!playerEntities) throw new Error('Players not found');

        // Get the player entity having the player identity component with the given playerUUID
        const playerEntity = playerEntities
            .filter(entity => ecsManager.getComponent(entity, PlayerIdentityComponent)?.playerUUID === playerUUID)
            .pop();
        if (!playerEntity) throw new Error('Player not found');
        return playerEntity;
    }

    private getPlayerConnection(playerUUID: string, ecsManager: ECManager): PlayerConnectionComponent {
        const playerEntity = this.getPlayerEntity(playerUUID, ecsManager);
        const playerConnection = ecsManager.getComponent(playerEntity, PlayerConnectionComponent);
        if (!playerConnection) throw new Error('Player connection not found');
        return playerConnection;
    }
}