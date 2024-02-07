import {createServer} from 'http';
import express from 'express';
import {Server as WebSocketServer, WebSocket} from 'ws'; // Correct import from 'ws'
import MatchmakingService from './game/MatchmakingService';
import {GameSessionManager} from "./game/GameSessionManager";
import {createScopedLogger} from "./logger/Logger";

const logger = createScopedLogger('index.ts');

// Initialize the Express application
const app = express();

// Create an HTTP server from the Express application
const server = createServer(app);

// API key validation logic
server.on('upgrade', (request, socket, head) => {
    logger.info('Upgrade request received');

    // Extract API key from headers
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (!isValidApiKey(apiKey)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
    }

    // Proceed with the WebSocket upgrade since the API key is valid
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

const isValidApiKey = (apiKey: string | undefined): boolean => {
    const VALID_API_KEY = "your_valid_api_key"; // This should be stored securely
    return apiKey === VALID_API_KEY;
};

// Initialize a WebSocket server on top of the HTTP server
const wss = new WebSocketServer({ noServer: true });

// Instantiate services used for matchmaking and game logic
const gameSessionManager = new GameSessionManager();
const matchmakingService = new MatchmakingService(gameSessionManager);


// Define the root endpoint for simple HTTP GET requests
app.get('/', (req, res) => {
    res.send('WebSocket Server for Matchmaking');
});

// Listen for new connections to the WebSocket server
wss.on('connection', (ws) => {

    // Initially, we don't have the player's UUID or username.
    let playerUUID: string | undefined = undefined;
    let playerUsername: string | undefined  = undefined;

    // Event listener for messages from the client
    ws.on('message', (message) => {
        try {
            const action = JSON.parse(message.toString());

            if (action.type === 'handshake') {
                handleHandshake(action, ws);
            } else if (playerUUID && playerUsername) {
                switch (action.type) {
                    case 'findMatch':
                        logger.info(`Player ${playerUUID} is searching for a match`);
                        matchmakingService.addPlayerToQueue({ uuid: playerUUID, username: playerUsername, socket: ws });
                        break;
                    case 'stopFindMatch':
                        logger.info(`Player ${playerUUID} stopped searching for a match`);
                        // TODO: RACE - Handle case where player is not in queue anymore
                        matchmakingService.removePlayerFromQueue(playerUUID);
                        break;
                    case 'ackStartGame':
                        logger.info(`Player ${playerUUID} acknowledged the start of the game`);
                        gameSessionManager.getGameSession(playerUUID)?.playerAckToStart(playerUUID);
                        break;
                    case 'scoreUpdate':
                        const { wordPath } = action;
                        logger.info(`Player ${playerUUID} submitted a word path: ${wordPath}`);
                        gameSessionManager.getGameSession(playerUUID)?.updateScore(playerUUID, wordPath);
                        break;
                    default:
                        logger.warn(`Unknown action type: ${action.type}`);
                        break;
                }
            }
        } catch (error) {
            logger.error('Error parsing message:', error);
            ws.close(1007, 'Invalid JSON');
        }
    });

    // In WebSocket server connection event
    ws.on('close', () => {
        logger.info(`WebSocket connection closed for user ${playerUUID}`);
        if (playerUUID) {
            if (matchmakingService.isPlayerInQueue(playerUUID)) {
                matchmakingService.removePlayerFromQueue(playerUUID);
            } else if (gameSessionManager.getGameSession(playerUUID)) {
                gameSessionManager.handlePlayerDisconnection(playerUUID);
            } else {
                logger.warn(`Player ${playerUUID} was not found in the queue or in an active game session`);
            }
        }
    });

    ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
    });

    ws.on('pong', () => {
        logger.info(`Received a pong from user ${playerUUID}`);
        // Here, you can update some kind of "last seen" timestamp for the client
    });

    function handleHandshake(action: any, ws: WebSocket) {
        const { uuid, username, reconnecting: isReconnecting } = action;

        playerUUID = uuid;
        playerUsername = username;

        if (isReconnecting) {
            logger.info(`Player ${uuid} is reconnecting`);

            if (gameSessionManager.getGameSession(uuid)) {
                logger.info(`Player ${uuid} is in an active game session`);
                gameSessionManager.handleReconnection(uuid, ws);
            }

        } else {
            logger.info(`Player ${uuid} connected with username: ${username}`);
            // Additional logic for new connections
        }
    }
});

// Define the port number from the environment or use 8080 as a fallback
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => logger.info(`Server is listening on port ${PORT}`));

function shutdown() {
    logger.info('Shutting down server');
    wss.clients.forEach((client) => {
        client.close(1001, 'Server is shutting down');
    });
    server.close(() => {
        logger.info('Server has been shut down');
    });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

