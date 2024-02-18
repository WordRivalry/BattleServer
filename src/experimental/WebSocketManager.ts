// WebSocketManager.ts
import { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import { createScopedLogger } from '../logger/logger';
import http from 'http';
import config from "../../config";

export interface IMessageHandler {
    handleMessage(ws: WebSocket, action: any, playerUUID: string, gameSessionUUID: string): void;
    handleConnection(ws: WebSocket, playerUUID: string | undefined, gameSessionUUID: string | undefined): void;
    handleDisconnect(playerUUID: string | undefined, gameSessionUUID: string | undefined): void;
}

export class WebSocketManager {
    private logger = createScopedLogger('WebSocketManager');

    constructor(private wss: WebSocketServer, private messageHandler: IMessageHandler, server: http.Server) {
        this.setupUpgradeHandler(server);
        this.setupWebSocketServer();
    }

    private setupUpgradeHandler( server: http.Server): void {
        server.on('upgrade', (request, socket, head) => {
            this.logger.context("setupUpgradeHandler").info('Upgrade request received');
            const apiKey = request.headers['x-api-key'] as string | undefined;

            if (!this.isValidApiKey(apiKey)) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            // Extract the game session UUID and player UUID from the request
            const gameSessionUUID = request.headers['x-game-session-uuid'] as string | undefined;
            const playerUUID = request.headers['x-player-uuid'] as string | undefined;

            if (!gameSessionUUID || !playerUUID) {
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }

            this.wss.handleUpgrade(request, socket, head, (ws) => {
                this.wss.emit('connection', ws, request );
            });
        });
    }

    private isValidApiKey(apiKey: string | undefined): boolean {
        const VALID_API_KEY = config.upgradeApiKey;
        return apiKey === VALID_API_KEY;
    }

    private setupWebSocketServer(): void {
        this.wss.on('connection', (ws, request) => {
            const gameSessionUUID = request.headers['x-game-session-uuid'] as string;
            const playerUUID = request.headers['x-player-uuid'] as string;
            this.messageHandler.handleConnection(ws, playerUUID, gameSessionUUID);

            ws.on('message', (message) => {

                let action;
                try {
                    action = JSON.parse(message.toString());
                } catch (error) {
                    this.logger.context("handleMessage").error('Error parsing message:', error);
                    ws.close(1007, 'Invalid JSON');
                    return;
                }

                this.messageHandler.handleMessage(ws, action, playerUUID, gameSessionUUID);
            });

            ws.on('close', () => {
                this.messageHandler.handleDisconnect(playerUUID, gameSessionUUID);
            });

            ws.on('error', (error) => {
                this.logger.context("on.error").error('WebSocket error:', error);
            });

            ws.on('pong', () => {
                this.logger.context("on.pong").info('Received a pong from user', { playerUUID: playerUUID });
                // Here, you can update some kind of "last seen" timestamp for the client
            });
        });
    }
}
