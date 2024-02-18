// import {WebSocket} from 'ws';
// import {createScopedLogger} from "../../logger/logger";
// import {clearTimeout} from "timers";
// import {PlayerUUID} from "../../types";
// import {Player} from "../player/Player";
//
// export interface GameSessionPlayerDelegate {
//     onPlayerReconnected(playerUUID: string, newSocket: WebSocket): void;
//     onPlayerTimedOut(playerUUID: string): void;
// }
//
// export class GameSessionPlayerService {
//     private playerStates: Map<string, Player> = new Map();
//     private delegate: GameSessionPlayerDelegate | undefined;
//     private readonly reconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map(); // Attributes to track reconnection timeouts
//
//     private logger = createScopedLogger('GameSessionPlayerService');
//
//     constructor() {
//     }
//
//     public setDelegate(delegate: GameSessionPlayerDelegate) {
//         this.delegate = delegate;
//     }
//
//     public addPlayer(player: Player) {
//         this.playerStates.set(player.uuid, player);
//     }
//
//     public removePlayer(playerUUID: string) {
//         this.playerStates.delete(playerUUID);
//         // Additional cleanup as needed
//     }
//
//     // Username + uuid
//     public forEachPlayer(callback: (playerUUID: string, username: string) => void) {
//         this.playerStates.forEach((value, key) => {
//             callback(key, value.username);
//         });
//     }
//
//     public getAllPlayerUUIDs(): PlayerUUID[] {
//         return Array.from(this.playerStates.keys());
//     }
//
//     public getAllUsernames(): string[] {
//         return Array.from(this.playerStates.values()).map(playerState => playerState.username);
//     }
//
//     // Delegate methods
//     public handleDisconnection(playerUUID: string) {
//         // // Implementation of handling disconnection logic
//         // this.delegate?.onPlayerDisconnected(playerUUID);
//
//         // Set a timeout for player reconnection
//         const reconnectionTimeout = setTimeout(() => {
//             // Handle the case where the player does not reconnect in time
//             this.logger.context('onPlayerDisconnected').info('Player did not reconnect in time.', { playerUUID });
//             this.delegate?.onPlayerTimedOut(playerUUID);
//         }, 10000); // Wait for 10 seconds
//
//         // Store the timeout so it can be cleared upon successful reconnection
//         this.reconnectionTimeouts.set(playerUUID, reconnectionTimeout);
//     }
//
//     public handleReconnection(playerUUID: string, newSocket: WebSocket) {
//         const playerState = this.playerStates.get(playerUUID);
//         if (playerState) {
//
//             const timeout = this.reconnectionTimeouts.get(playerUUID);
//             if (timeout) {
//                 clearTimeout(timeout);
//                 this.reconnectionTimeouts.delete(playerUUID);
//             }
//
//             playerState.socket = newSocket;
//             this.delegate?.onPlayerReconnected(playerUUID, newSocket);
//         }
//     }
// }
