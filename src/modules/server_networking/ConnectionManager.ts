// ConnectionManager.ts
import {WebSocketServer} from 'ws';
import {createScopedLogger} from '../logger/logger';
import {IMessageHandler, WebSocketManager} from './WebSocketManager';
import {HttpManager, IHttpRequestHandler} from './HttpManager';
import http, {createServer} from 'http';
import express from 'express';
import config from "../../../config";

export class ConnectionManager {
    private readonly app: express.Application;
    private readonly server: http.Server;
    private readonly wss: WebSocketServer;

    private logger = createScopedLogger('ConnectionManager');
    private webSocketManager: WebSocketManager;
    private apiManager: HttpManager;

    constructor(
        requestHandler: IHttpRequestHandler,
        messageHandler: IMessageHandler
    ) {

        // Create an express app
        this.app = express();

        // Create an HTTP server and a WebSocket server
        this.server = createServer(this.app);
        this.wss = new WebSocketServer({noServer: true});

        // Apply the API manager
        this.apiManager = new HttpManager(this.app, requestHandler);

        // Apply the WebSocket handlers
        this.webSocketManager = new WebSocketManager(this.wss, messageHandler, this.server);

        // Apply shutdown handler
        this.setupShutdownHandler();
    }

    public listen(): void {
        const PORT = config.port;
        this.server.listen(PORT, () => {
            this.logger.context("listen").info(`Server is listening on port ${PORT}`);
        });
    }

    shutdown() {
      //  this.logger.context("shutdown").info('Shutting down server');
        this.wss.clients.forEach((client) => {
            client.close(1001, 'Server is shutting down');
        });
    //    this.server.close(() => {
    //        this.logger.context("shutdown").info('Server has been shut down');
    //    });
    }

    private setupShutdownHandler(): void {
        process.on('SIGTERM', this.shutdown);
        process.on('SIGINT', this.shutdown);
    }
}
