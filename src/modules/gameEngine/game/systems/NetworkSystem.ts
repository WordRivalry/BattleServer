import {ISystem} from "../../ecs/systems/System";
import {Entity} from "../../ecs/entities/entity";
import {ComponentManager, ComponentType} from "../../ecs/ComponentManager";
import {PlayerConnectionComponent} from "../components/player/PlayerConnectionComponent";
import {TypedEventEmitter} from "../../ecs/systems/TypedEventEmitter";
import {GameEvent} from "../../../GameSession/GameEventsEmitter";
import {ConnectionPayload, PlayerActionPayload, PlayerDisconnectionPayload} from "../../../server_networking/WebSocketMessageHandler";
import {EntityManager} from "../../ecs/EntityManager";
import {GameSessionStateComponent} from "../components/game/GameSessionStateComponent";
import {SessionState} from "../../../GameSession/GameSession";
import {NoConnectionTimeoutError} from "../../../error/Error";
import {GameMessage, GameMessageComponent} from "../components/game/GameMessageComponent";
import {WebSocket} from "ws";
import {clearTimeout} from "timers";

export class NetworkSystem implements ISystem {
    requiredComponents: ComponentType[] = [PlayerConnectionComponent, GameSessionStateComponent];
    private readonly reconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private eventSystem: TypedEventEmitter;
    private entityManager: EntityManager;
    private componentManager: ComponentManager;

    constructor(eventSystem: TypedEventEmitter, entityManager: EntityManager, componentManager: ComponentManager) {

        this.eventSystem = eventSystem;
        this.entityManager = entityManager;
        this.componentManager = componentManager;

        this.eventSystem.subscribeGeneric(GameEvent.PLAYER_JOINED, (payload: ConnectionPayload) => {
            this.handlePlayerJoined(payload);
        });

        this.eventSystem.subscribeGeneric(GameEvent.PLAYER_ACTION, (payload: PlayerActionPayload) => {
            this.handlePlayerAction(payload);
        });

        this.eventSystem.subscribeGeneric(GameEvent.PLAYER_LEFT, (payload: PlayerDisconnectionPayload) => {
            this.handlePlayerLeft(payload.playerUUID, payload.gameSessionUUID);
        });

        this.eventSystem.subscribeGeneric(GameEvent.PLAYER_LOST_CONNECTION, (payload: PlayerDisconnectionPayload) => {
            this.handlePlayerDisconnected(payload);
        });
    }

    private handlePlayerJoined(payload: ConnectionPayload) {
        const playerConnection = this.getPlayerConnection(payload.playerUUID);
        const gameEntity = this.getGameEntity(payload.gameSessionUUID);

        // Update the player connection component
        const lastSeen = playerConnection.lastSeen;
        if (lastSeen === undefined) {
            this.setPlayerConnection(playerConnection, payload.socket);
        } else {
            this.clearReconnectionTimeout(payload.playerUUID);
            this.setPlayerConnection(playerConnection, payload.socket);
            if (!playerConnection.socket) return;
            this.sendMissedMessages(gameEntity, payload.playerUUID, playerConnection.socket, lastSeen);
        }

        // Check if all the required players are connected, and if so, start the game
        const allPlayersConnected = this.entityManager
            .getChildrenWithComponent(gameEntity, PlayerConnectionComponent)
            .every((entity) => {
                return this.componentManager
                    .getComponent(entity, PlayerConnectionComponent)
                    ?.isConnected;
            });

        // Start the game if all players are connected
        if (allPlayersConnected) {
            const sessionComponent = this.componentManager.getComponent(gameEntity, GameSessionStateComponent)
            if (!sessionComponent?.state) return;
            sessionComponent.state = SessionState.IN_PROGRESS;
        }
    }

    private handlePlayerAction(payload: PlayerActionPayload) {
        this.eventSystem.emitTargeted(payload.action.type, payload.gameSessionUUID, payload.action)
    }

    private setPlayerConnection(playerConnection: PlayerConnectionComponent, socket: WebSocket) {
        playerConnection.isConnected = true;
        playerConnection.socket = socket;
        playerConnection.lastSeen = Date.now();
    }

    private clearReconnectionTimeout(playerUUID: string) {
        const timeout = this.reconnectionTimeouts.get(playerUUID);
        if (timeout === undefined) {
            throw new NoConnectionTimeoutError(playerUUID);
        }
        clearTimeout(timeout);
        this.reconnectionTimeouts.delete(playerUUID);
    }

    private handlePlayerDisconnected(payload: PlayerDisconnectionPayload) {
        const playerConnection = this.getPlayerConnection(payload.playerUUID);
        this.disconnectPlayer(playerConnection);

        // Store the timeout, so it can be cleared upon successful reconnection
        const reconnectionTimeout = setTimeout(() => {
            // Handle the case where the player does not reconnect in time
            this.handlePlayerLeft(payload.playerUUID, payload.gameSessionUUID);
        }, 5 * 1000); // Seconds to milliseconds

        // Store the timeout, so it can be cleared upon successful reconnection
        this.reconnectionTimeouts.set(payload.playerUUID, reconnectionTimeout);
    }

    private handlePlayerLeft(playerUUID: string, gameSessionUUID: string) {
        const playerConnection = this.getPlayerConnection(playerUUID);
        this.disconnectPlayer(playerConnection);

        // Stop the game
        const gameEntity = this.getGameEntity(gameSessionUUID);
        const sessionComponent = this.componentManager.getComponent(gameEntity, GameSessionStateComponent)
        if (!sessionComponent?.state) return;
        sessionComponent.state = SessionState.ENDED;
    }

    private disconnectPlayer(playerConnection: PlayerConnectionComponent) {
        playerConnection.isConnected = false;
        playerConnection.lastSeen = Date.now();
        playerConnection.socket = undefined;
    }

    private sendMissedMessages(gameEntity: Entity, playerUUID: string, playerSocket: WebSocket, lastSeen: number): void {
        const gameMessageComponent = this.componentManager.getComponent(gameEntity, GameMessageComponent);
        if (!gameMessageComponent) return;

        gameMessageComponent
            .messages
            .filter(message => this.condition(message, lastSeen, playerUUID))
            .forEach(message => playerSocket.send(JSON.stringify(message)));
    }

    private condition(message: GameMessage, lastSeen: number, playerUUID: string) {
        return message.timestamp > lastSeen
            && (message.recipient === 'all'
                || message.recipient === playerUUID
                || message.recipient.includes(playerUUID));
    }

    private getPlayerConnection(playerUUID: string): PlayerConnectionComponent {
        const playerEntity = this.entityManager
            .getEntitiesWithComponent(PlayerConnectionComponent)
            .filter(entity => entity.uuid === playerUUID)
            .pop();
        if (!playerEntity) throw new Error('Player not found');

        const playerConnection = this.componentManager.getComponent(playerEntity, PlayerConnectionComponent);
        if (!playerConnection) throw new Error('Player connection not found');
        return playerConnection;
    }

    private getGameEntity(gameSessionUUID: string): Entity {
        const gameEntity = this.entityManager
            .getEntitiesWithComponent(GameSessionStateComponent)
            .filter(entity => entity.uuid === gameSessionUUID)
            .pop();
        if (!gameEntity) throw new Error('Game session not found');
        return gameEntity;
    }

    update(deltaTime: number, entities: Entity[], componentManager: ComponentManager, eventSystem: TypedEventEmitter): void {
        throw new Error('Method not implemented.');
    }
}
