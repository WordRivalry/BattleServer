// index.ts
import { ConnectionManager } from './modules/server_networking/ConnectionManager';
import { WebSocketMessageHandler as WebSocketMessageHandler } from './modules/server_networking/WebSocketMessageHandler';

import { HttpRequestHandler } from "./modules/server_networking/HttpRequestHandler";
import { Arena } from "./modules/game/Arena";
import { TypedEventEmitter } from "./modules/ecs/TypedEventEmitter";

// Instantiate the TypedEventEmitter
const eventEmitter = new TypedEventEmitter();

// Instantiate the MasterGame
const arena = new Arena(eventEmitter);

// Instantiate http Request Handler
const requestHandler = new HttpRequestHandler(arena);

// Instantiate WebSocket Message Handler
const messageHandler = new WebSocketMessageHandler(eventEmitter);

// Instantiate the ConnectionManager with the MatchmakingQueue and PlayerSessionStore
const connectionManager: ConnectionManager = new ConnectionManager(requestHandler, messageHandler);

// Start the server
connectionManager.listen();















    // // Event listener for messages from the client
    // ws.on('message', (message) => {
    //     try {
    //         const action = JSON.parse(message.toString());

    //         if (action.type === 'handshake') {
    //             handleHandshake(action, ws);
    //         } else if (playerUUID) {
    //             switch (action.type) {
    //                 case 'scoreUpdate':
    //                     const { wordPath } = action;
    //                     logger.debug('Submitted a word', { playerUUID: player.uuid, wordPath });
    //                     gameSessionManager.getGameSession(player.uuid)?.updateScore(player.uuid, wordPath);
    //                     break;
    //                 default:
    //                     logger.warn('Unknown Action type', { playerUUID: player.uuid, actionType: action.type });
    //                     // Disconnect the client if an unknown action type is received
    //                     ws.close(1003, 'Teapot Error');
    //                     break;
    //             }
    //         }
    //     } catch (error) {
    //         logger.error('Error parsing message:', error);
    //         ws.close(1007, 'Invalid JSON');
    //     }
    // });

    // // In WebSocket server connection event
    // ws.on('close', () => {
    //     logger.info('WebSocket connection closed for user', { playerUUID: player?.uuid });
    //     if (player) {
    //       if (gameSessionManager.getGameSession(player.uuid)) {
    //             gameSessionManager.handlePlayerDisconnection(player.uuid);
    //         } else {
    //             logger.warn('Player was not found in the queue or in an active game session', { playerUUID: player.uuid });
    //         }
    //     }
    // });

    // ws.on('error', (error) => {
    //     logger.error('WebSocket error:', error);
    // });

    // ws.on('pong', () => {
    //     logger.info('Received a pong from user', { playerUUID: player?.uuid });
    //     // Here, you can update some kind of "last seen" timestamp for the client
    // });

    // function handleHandshake(action: any, ws: WebSocket) {
    //     const { uuid, username, reconnecting: isReconnecting } = action;

    //     if (isReconnecting) {
    //         logger.info('Player is reconnecting', { playerUUID: uuid });

    //         playerService.addPlayerSocket(uuid, ws);

    //         if (gameSessionManager.getGameSession(uuid)) {
    //             logger.info('Player is in an active game session', { playerUUID: uuid });
    //             gameSessionManager.handleReconnection(uuid, ws);
    //         }

    //     } else {
    //         logger.info('Player connected', { uuid, username });
    //         // Additional logic for new connections

    //         player = new Player(uuid, username);
    //         playerService.addPlayerSocket(player.uuid, ws);
    //     }
    // }

