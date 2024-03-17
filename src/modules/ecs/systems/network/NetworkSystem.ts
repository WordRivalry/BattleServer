// import {System} from "../System";
// import {ComponentManager, ComponentType} from "../../components/ComponentManager";
// import {PlayerConnectionComponent} from "../../components/player/PlayerConnectionComponent";
// import {TypedEventEmitter} from "../../TypedEventEmitter";
// import {ConnectionPayload, PlayerDisconnectionPayload} from "../../../server_networking/WebSocketMessageHandler";
// import {NoConnectionTimeoutError} from "../../../error/Error";
// import {PlayerMessageComponent} from "../../components/player/PlayerMessageComponent";
// import {WebSocket} from "ws";
// import {clearTimeout} from "timers";
// import {createScopedLogger} from "../../../logger/logger";
// import {PlayerIdentityComponent} from "../../components/player/PlayerIdentityComponent";
// import {TimerComponent} from "../../components/TimerComponent";
// import {ECManager} from "../../ECManager";
//
export enum GameEvent {
    PLAYER_ACTION = "PLAYER_ACTION",
    PLAYER_CONNECTS = "PLAYER_CONNECTS",
    PLAYER_LEFT = "PLAYER_LEFT",
    PLAYER_LOST_CONNECTION = "PLAYER_LOST_CONNECTION",
    GAME_END = "GAME_END",
}
//
// export class NetworkSystem extends System {
//     private readonly reconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
//     private logger = createScopedLogger('NetworkSystem');
//
//     init(ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
//         eventSystem.subscribeGeneric(GameEvent.PLAYER_CONNECTS, (payload: ConnectionPayload) => {
//             this.handlePlayerJoined(payload, ecsManager);
//             this.logger.info(`Player ${payload.playerUUID} joined game ${payload.gameSessionUUID}`);
//         });
//
//         eventSystem.subscribeGeneric(GameEvent.PLAYER_LEFT, (payload: PlayerDisconnectionPayload) => {
//             this.handlePlayerLeft(payload.playerUUID, payload.gameSessionUUID, ecsManager);
//             this.logger.info(`Player ${payload.playerUUID} left game ${payload.gameSessionUUID}`);
//         });
//
//         eventSystem.subscribeGeneric(GameEvent.PLAYER_LOST_CONNECTION, (payload: PlayerDisconnectionPayload) => {
//             this.handlePlayerDisconnected(payload, ecsManager);
//             this.logger.info(`Player ${payload.playerUUID} lost connection to game ${payload.gameSessionUUID}`);
//         });
//     }
//
//     private handlePlayerJoined(payload: ConnectionPayload, ecsManager: ECManager): void {
//         const gameEntity = this.getGameEntity(payload.gameSessionUUID, ecsManager);
//         const playerEntity = this.getPlayerEntity(payload.playerUUID, ecsManager);
//         const playerConnection = this.getPlayerConnection(payload.playerUUID, ecsManager);
//
//         // Update the player connection component
//         const lastSeen = playerConnection.lastSeen;
//         if (lastSeen === undefined) {
//             this.setPlayerConnection(playerConnection, payload.socket);
//         } else {
//             this.clearReconnectionTimeout(payload.playerUUID);
//             this.setPlayerConnection(playerConnection, payload.socket);
//             if (!playerConnection.socket) return;
//             this.sendMissedMessages(playerEntity, playerConnection.socket, ecsManager);
//         }
//
//         // Check if all the required players are connected, and if so, start the game
//         const allPlayersConnected = ecsManager
//             .queryEntities()
//             .withParent(gameEntity)
//             .withComponent(PlayerConnectionComponent)
//             .execute()
//             .every((entity) => {
//                 return componentManager
//                     .getComponent(entity, PlayerConnectionComponent)
//                     ?.socket !== undefined;
//             });
//
//         // Start the game if all players are connected
//         if (allPlayersConnected) {
//             const sessionComponent = componentManager.getComponent(gameEntity, GameStateComponent)
//             if (!sessionComponent?.state) return;
//             this.logger.info(`All players connected to game ${payload.gameSessionUUID}`);
//             sessionComponent.state = SessionState.IN_PROGRESS;
//
//             const timerComponent = componentManager.getComponent(gameEntity, TimerComponent);
//             if (!timerComponent) return;
//             this.logger.info(`Starting game timer for game ${payload.gameSessionUUID}`);
//             timerComponent.isActive = true;
//         }
//     }
//
//     private setPlayerConnection(playerConnection: PlayerConnectionComponent, socket: WebSocket) {
//         playerConnection.socket = socket;
//         playerConnection.lastSeen = Date.now();
//     }
//
//     private clearReconnectionTimeout(playerUUID: string) {
//         const timeout = this.reconnectionTimeouts.get(playerUUID);
//         if (timeout === undefined) {
//             throw new NoConnectionTimeoutError(playerUUID);
//         }
//         clearTimeout(timeout);
//         this.reconnectionTimeouts.delete(playerUUID);
//     }
//
//     private handlePlayerDisconnected(payload: PlayerDisconnectionPayload,  ecsManager: ECManager) {
//         const playerConnection = this.getPlayerConnection(payload.playerUUID, ecsManager);
//         this.disconnectPlayer(playerConnection);
//
//         // Store the timeout, so it can be cleared upon successful reconnection
//         const reconnectionTimeout = setTimeout(() => {
//             // Handle the case where the player does not reconnect in time
//             this.handlePlayerLeft(payload.playerUUID, payload.gameSessionUUID, ecsManager);
//         }, 5 * 1000); // Seconds to milliseconds
//
//         // Store the timeout, so it can be cleared upon successful reconnection
//         this.reconnectionTimeouts.set(payload.playerUUID, reconnectionTimeout);
//     }
//
//     private handlePlayerLeft(playerUUID: string, gameSessionUUID: string, ecsManager: ECManager) {
//         const playerConnection = this.getPlayerConnection(playerUUID, ecsManager);
//         this.disconnectPlayer(playerConnection);
//
//         // Stop the game
//         const gameEntity = this.getGameEntity(gameSessionUUID, ecsManager);
//         const sessionComponent = componentManager.getComponent(gameEntity, GameStateComponent)
//         if (!sessionComponent?.state) return;
//         sessionComponent.state = SessionState.FINISHED;
//     }
//
//     private disconnectPlayer(playerConnection: PlayerConnectionComponent) {
//         playerConnection.lastSeen = Date.now();
//         playerConnection.socket = undefined;
//     }
//
//     private sendMissedMessages(playerEntity: number, playerSocket: WebSocket, ecsManager: ECManager): void {
//         const playerMessageComponent = ecsManager.getComponent(playerEntity, PlayerMessageComponent);
//         playerMessageComponent
//             .messages
//             .forEach(message => playerSocket.send(JSON.stringify(message)))
//
//         // Clear the messages after sending them
//         playerMessageComponent.messages = [];
//     }
//     private getPlayerEntity(playerUUID: string,  ecsManager: ECManager): Entity {
//         const playerEntities = ecsManager
//             .queryEntities()
//             .withComponent(PlayerConnectionComponent)
//             .execute();
//         if (!playerEntities) throw new Error('Players not found');
//
//         // Get the player entity having the player identity component with the given playerUUID
//         const playerEntity = playerEntities
//             .filter(entity => ecsManager.getComponent(entity, PlayerIdentityComponent)?.playerUUID === playerUUID)
//             .pop();
//         if (!playerEntity) throw new Error('Player not found');
//         return playerEntity;
//     }
//
//     private getPlayerConnection(playerUUID: string, ecsManager: ECManager): PlayerConnectionComponent {
//         const playerEntity = this.getPlayerEntity(playerUUID, ecsManager);
//         const playerConnection = componentManager.getComponent(playerEntity, PlayerConnectionComponent);
//         if (!playerConnection) throw new Error('Player connection not found');
//         return playerConnection;
//     }
//
//     private getGameEntity(gameSessionUUID: string, ecsManager: ECManager): Entity {
//         const gameEntity = ecsManager
//             .getEntitiesWithComponent(GameStateComponent)
//             .filter(entity => entity.uuid === gameSessionUUID)
//             .pop();
//         if (!gameEntity) throw new Error('Game session not found');
//         return gameEntity;
//     }
//
//     requiredComponents: ComponentType[] = [];
//     update(deltaTime: number, entities: Entity[], componentManager: ComponentManager, eventSystem: TypedEventEmitter): void {
//         throw new Error('Method not implemented.');
//     }
// }
