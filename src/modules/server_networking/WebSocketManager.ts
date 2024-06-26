// WebSocketManager.ts
import {RawData, WebSocket, WebSocketServer} from 'ws';
import {createScopedLogger} from '../logger/logger';
import {ErrorHandlingService} from "../error/Error";
import http from 'http';
import config from "../../../config";

export interface IMessageHandler {
    handleMessage(message: RawData, playerName: string, gameSessionUUID: string): void;

    handleConnection(ws: WebSocket, playerName: string, gameSessionUUID: string): void;

    handleDisconnect(playerName: string | undefined, gameSessionUUID: string | undefined): void;
}

export class WebSocketManager {
    private logger = createScopedLogger('WebSocketManager');

    constructor(private wss: WebSocketServer, private messageHandler: IMessageHandler, server: http.Server) {
        this.setupUpgradeHandler(server);
        this.setupWebSocketServer();
    }

    private setupUpgradeHandler(server: http.Server): void {
        server.on('upgrade', (request, socket, head) => {
            this.logger.context("setupUpgradeHandler").info('Upgrade request received');

            if (!this.authenticateRequest(request)) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            // Extract from header
            const gameSessionUUID: string | undefined = request.headers['x-game-session-uuid'] as string | undefined;
            const playerName: string | undefined = request.headers['x-player-name'] as string | undefined;

            if (!gameSessionUUID || !playerName) {
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }

            this.wss.handleUpgrade(request, socket, head, (ws: WebSocket): void => {
                this.wss.emit('connection', ws, request);
            });
        });
    }

    private authenticateRequest(request: http.IncomingMessage): boolean {
        const apiKey: string | undefined = request.headers['x-api-key'] as string | undefined;
        return this.isValidApiKey(apiKey);
    }

    private isValidApiKey(apiKey: string | undefined): boolean {
        const VALID_API_KEY = config.upgradeApiKey;
        return apiKey === VALID_API_KEY;
    }

    private setupWebSocketServer(): void {
        this.wss.on('connection', (ws, request) => {
            const gameSessionUUID = request.headers['x-game-session-uuid'] as string;
            const playerName = request.headers['x-player-name'] as string;

            try {
                this.messageHandler.handleConnection(ws, playerName, gameSessionUUID);
            } catch (error) {
                ErrorHandlingService.sendError(ws, error);
            }

            ws.on('message', (message: RawData) => {
                try {
                    this.messageHandler.handleMessage(message, playerName, gameSessionUUID);
                } catch (error) {
                    ErrorHandlingService.sendError(ws, error);
                }
            });

            ws.on('close', (code) => {
                if (code === 1001) return; // Normal closure

                if (code === 1006) {
                    this.logger.context("setupWebSocketServer").error('Client closed connection unexpectedly');
                }

                if (code === 1008) {
                    this.logger.context("setupWebSocketServer").error('Client closed connection due to an error');
                }

                try {
                    this.messageHandler.handleDisconnect(playerName, gameSessionUUID);
                } catch (error) {
                    ErrorHandlingService.sendError(ws, error);
                }
            });

            ws.on('error', (error) => {
                ErrorHandlingService.sendError(ws, error);
            });
        });
    }
}
