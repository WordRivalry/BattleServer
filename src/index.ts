import {createServer} from 'http';
import express from 'express';
import {Server as WebSocketServer, WebSocket} from 'ws'; // Correct import from 'ws'
import QueueService from './game/QueueService';
import MatchmakingService from './game/MatchmakingService';
import {GameSessionManager} from "./game/GameSessionManager";
import {ExperimentalPlayerLifecycleService, PlayerState} from "./game/ExperimentalPlayerService";

// Initialize the Express application
const app = express();

// Create an HTTP server from the Express application
const server = createServer(app);

// API key validation logic
server.on('upgrade', (request, socket, head) => {
    console.log('Upgrading...');

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

// Instantiate services
const playerService = new ExperimentalPlayerLifecycleService();
const gameSessionManager = new GameSessionManager();
const matchmakingService = new MatchmakingService(
    gameSessionManager,
    playerService
);

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
                        console.log(`Player ${playerUUID} is searching for a match`);
                        playerService.updatePlayerState(playerUUID, PlayerState.InQueue);
                        break;
                    case 'stopFindMatch':
                        console.log(`Player ${playerUUID} stopped searching for a match`);
                        playerService.updatePlayerState(playerUUID, PlayerState.Idle);
                        break;
                    case 'ackStartGame':
                        console.log(`Player ${playerUUID} acknowledged game start`);
                        playerService.updatePlayerState(playerUUID, PlayerState.IsReady);
                        break;
                    case 'scoreUpdate':
                        const { wordPath } = action;
                        console.log(`Score update from ${playerUUID}:`, action);
                        gameSessionManager.getGameSession(playerUUID)?.updateScore(playerUUID, wordPath);
                        break;
                    default:
                        console.log(`Unknown action type: ${action.type}`);
                }
            }
        } catch (error) {
            console.error('Failed to parse JSON:', error);
            ws.close(1007, 'Invalid JSON');
        }
    });

    // In WebSocket server connection event
    ws.on('close', () => {
        if (playerUUID) {
            console.log(`Player disconnected: ${playerUUID}`);
            playerService.handleDisconnection(playerUUID);
        }
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for user ${playerUUID}:`, error);
    });

    ws.on('pong', () => {
        console.log(`Pong received from ${playerUUID}`);
        // Here, you can update some kind of "last seen" timestamp for the client

    });

    function handleHandshake(action: any, ws: WebSocket) {
        const { uuid, username, reconnecting: isReconnecting } = action;

        playerUUID = uuid;
        console.log(`Player UUID set: ${playerUUID}`);

        playerUsername = username;
        console.log(`Player username set: ${username}`);

        if (isReconnecting) {
            console.log(`Reconnection attempt by player: ${uuid}`);
            playerService.handleReconnection(uuid, ws);
        } else {
            console.log('New player connected...');
            playerService.addPlayer(uuid, username, ws);
        }
    }
});

// Define the port number from the environment or use 8080 as a fallback
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

function shutdown() {
    console.log('Shutting down server...');
    wss.clients.forEach((client) => {
        client.close(1001, 'Server is shutting down');
    });
    server.close(() => {
        console.log('Server shut down complete');
    });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

