// modules/Player/PlayerService.ts
import { EventEmitter } from 'events';
import { WebSocket } from 'ws'; // Correct import from 'ws'
import { Player } from '../../types';
import { createScopedLogger } from '../../logger/logger';

export class PlayerService extends EventEmitter {
    private players: Map<string, Player> = new Map();
    private readonly reconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private logger = createScopedLogger('PlayerService');

    constructor() {
        super();
        this.on('gameEnd', this.onGameEnd.bind(this));
    }

    getPlayer(uuid: string): Player | undefined {
        return this.players.get(uuid);
    }

    addPlayer(uuid: string, player: Player) {
        this.players.set(uuid, player);
    }
        
    removePlayer(uuid: string) {
        this.players.delete(uuid);
    }

    onGameEnd(gameSessionUUID: string) {
        // Remove the game session and player-session associations
        this.players.forEach((player: Player, uuid: string) => {
            if (player.uuid === gameSessionUUID) {
                this.removePlayer(uuid);
            }
        });
    }

    public handleDisconnection(playerUUID: string) {
        // Set a timeout for player reconnection
        const reconnectionTimeout = setTimeout(() => {
            // Handle the case where the player does not reconnect in time
            this.logger.context('onPlayerDisconnected').info('Player did not reconnect in time.', { playerUUID });
            this.emit('playerTimedOut', playerUUID);
        }, 10000); // Wait for 10 seconds

        // Store the timeout so it can be cleared upon successful reconnection
        this.reconnectionTimeouts.set(playerUUID, reconnectionTimeout);
    }

    public handleReconnection(playerUUID: string, newSocket: WebSocket) {
        const player = this.players.get(playerUUID);

        if (player === undefined) {
            this.logger.context('handleReconnection').warn('No active game session found for player to reconnect', { playerUUID });
            return;
        }

        const timeout = this.reconnectionTimeouts.get(playerUUID);
        if (timeout) {
            clearTimeout(timeout);
            this.reconnectionTimeouts.delete(playerUUID);
        }

        player.ws = newSocket;
        this.emit('playerReconnected', playerUUID, newSocket);
    }
}
