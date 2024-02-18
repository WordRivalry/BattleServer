// import { EventEmitter } from 'events';
// import { WebSocket } from 'ws';
// import { GameSession } from "./GameSession";
// import { createScopedLogger } from "../../logger/logger";
// import { v4 as uuidv4 } from 'uuid';
//
// export interface GameSessionCallback {
//     onGameEnd: (gameSessionUUID: string) => void;
// }
//
// export class GameSessionManager extends EventEmitter {
//     private sessions: Map<string, GameSession> = new Map();
//     private logger = createScopedLogger('GameSessionManager');
//
//     constructor() {
//         super();
//
//         // Listen for game end events from game sessions
//         this.on('gameEnd', this.onGameEnd.bind(this));
//     }
//
//     public createSession(profileUUIDs: string[], gameMode: string, gameType: string): string {
//         const sessionUUID = uuidv4();
//         let session: GameSession = this.createGameSession(sessionUUID, profileUUIDs, gameMode, gameType);
//         this.sessions.set(sessionUUID, session);
//         this.logger.context('createSession').debug('Created game session', { sessionUUID });
//         return sessionUUID;
//     }
//
//     public getSession(sessionId: string): GameSession | undefined {
//         return this.sessions.get(sessionId);
//     }
//
//     public onGameEnd(gameSessionUUID: string) {
//         const gameSession = this.getSession(gameSessionUUID);
//         if (gameSession !== undefined) {
//             // Remove the game session and player-session associations
//             this.sessions.delete(gameSessionUUID);
//             this.logger.context('onGameEnd').debug('Game session ended', { gameSessionUUID });
//         } else {
//             this.logger.context('onGameEnd').warn('No active game session found', { gameSessionUUID });
//         }
//     }
//
//     public handleReconnection(playerUUID: string, newSocket: WebSocket) {
//         const gameSession: GameSession | undefined = this.getSession(playerUUID);
//         if (gameSession !== undefined) {
//             gameSession.playerService.handleReconnection(playerUUID, newSocket);
//
//             this.logger.context('handleReconnection').debug('Handled reconnection for player', { playerUUID });
//         } else {
//             this.logger.context('handleReconnection').warn('No active game session found for player to reconnect', { playerUuid });
//         }
//     }
//
//     public handlePlayerDisconnection(playerUUID: string) {
//         const gameSession: GameSession | undefined = this.getSession(playerUUID);
//         if (gameSession !== undefined) {
//             gameSession.playerService.handleDisconnection(playerUUID);
//             this.logger.context('handlePlayerDisconnection').debug('Handled disconnection for player', { playerUuid: playerUUID });
//         } else {
//             this.logger.context('handlePlayerDisconnection').warn('No active game session found for player to disconnect', { playerUuid: playerUUID });
//         }
//     }
//
//     private createGameSession(sessionUUID: string, profileUUIDs: string[], gameMode: string, gameType: string): GameSession {
//         switch (gameMode) {
//             case 'RANK':
//                 switch (gameType) {
//                     case 'NORMAL':
//                         return new NormalRankGameSession(sessionUUID, profileUUIDs);
//                     case 'BLITZ':
//                         return new BlitzRankGameSession(sessionUUID, profileUUIDs);
//                 }
//                 break;
//             case 'QUICK DUEL':
//                 switch (gameType) {
//                     case 'NORMAL':
//                         return new NormalQuickDuelGameSession(sessionUUID, profileUUIDs);
//                     case 'BLITZ':
//                         return new BlitzQuickDuelGameSession(sessionUUID, profileUUIDs);
//                 }
//                 break;
//         }
//
//         throw new Error('Invalid game mode or game type');
//     }
// }
