import {createServer} from 'http';
import express from 'express';
import {Server as WebSocketServer, WebSocket} from 'ws'; // Correct import from 'ws'
import QueueService from './game/QueueService';
import MatchmakingService from './game/MatchmakingService';
import {GameSessionManager} from "./game/gameSession/GameSessionManager";

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

// Instantiate services used for matchmaking and game logic
const queueService = new QueueService();
const gameSessionManager = new GameSessionManager();
const matchmakingService = new MatchmakingService(queueService, gameSessionManager);

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

            switch (action.type) {
                case 'handshake':
                    handleHandshake(action, ws);
                    break;
                case 'findMatch':
                    handleFindMatch();
                    break;
                case 'stopFindMatch':
                    handleStopFindMatch();
                    break;
                case 'ackStartGame':
                    handlePlayerAckStartGame();
                    break;
                case 'scoreUpdate':
                    handleScoreUpdate(action);
                    break;
                default:
                    console.log(`Unknown action type: ${action.type}`);
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
            gameSessionManager.handlePlayerDisconnection(playerUUID);
            if (queueService.isPlayerInQueue(playerUUID)) {
                queueService.removePlayer(playerUUID);
            }
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
        const { uuid, username, reconnecting } = action;

        // Client-Side Handshake Message for New Connections
        // {
        //     "type": "handshake",
        //     "username": "player-username",
        //     "uuid": "unique-player-uuid",
        //     "reconnecting": false
        // }

        // Client-Side Handshake Message for Reconnections
        // {
        //     "type": "handshake",
        //     "username": "player-username",
        //     "uuid": "unique-player-uuid",
        //     "reconnecting": true
        // }

        playerUUID = uuid;
        console.log(`Player UUID set: ${playerUUID}`);

        playerUsername = username;
        console.log(`Player username set: ${username}`);

        if (reconnecting) {
            console.log(`Reconnection attempt by player: ${uuid}`);
            gameSessionManager.handleReconnection(uuid, ws);
        } else {
            // Handle new connection logic here
            console.log('New player connected...');
        }
    }

    function handleFindMatch() {
        // Ensure the UUID is set before adding to the matchmaking queue
        if (playerUUID && playerUsername) {
            queueService.addPlayer({uuid: playerUUID, username: playerUsername, socket: ws});
            console.log(`Player ${playerUUID} looking for a match`);
            matchmakingService.findMatches(); // Attempt to find a match immediately
        } else {
            console.warn('Player UUID or username not set. Cannot find match.');
        }
    }

    function handleStopFindMatch() {
        if (playerUUID) {
            queueService.removePlayer(playerUUID);
            console.log(`Player ${playerUUID} stopped searching for a match`);
        } else {
            console.warn('Player UUID not set. Cannot stop search.');
        }
    }

    function handleScoreUpdate(action: any) {
        const { wordPath, score } = action; // Assume action includes UUID and score
        // Logic to update and broadcast score
        console.log(`New word found from ${playerUsername}: ${wordPath}`);
        console.log(`New score for ${playerUsername}: ${score}`);

        if (!playerUUID || !playerUsername) {
            console.warn('Player UUID or username not set. Cannot update score.');
            return;
        }

        // Broadcast the score update
        gameSessionManager.getGameSession(playerUUID)?.updateScore(playerUUID, wordPath, score);
    }

    function handlePlayerAckStartGame() {
        if (playerUUID && playerUsername) {
            console.log(`Player ${playerUUID} acknowledged game start`);
            gameSessionManager.getGameSession(playerUUID)?.playerAckToStart(playerUUID);
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

