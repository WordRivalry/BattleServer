import { Player, PlayerUUID } from '../types';
import { MessagingService } from './MessagingService';
import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { createScopedLogger } from '../logger/logger';
import { PlayerMetadata } from './GameSessionManager';

export abstract class GameSession extends EventEmitter {
    protected players: Player[] = [];
    protected hasStarted: boolean = false;
    protected messagingService: MessagingService;
    private logger = createScopedLogger('GameSession');

    abstract startGame(): void;
    abstract handlePlayerLeaves(playerUUID: string): void;
    abstract handlePlayerAction(playerUUID: string, action: any): void;

    constructor(
        public uuid: string,
        public playersMetadata: PlayerMetadata[],
        public gameMode: string,
        public modeType: string

    ) {
        super();

        // Initialize the messaging service for the game session
        this.messagingService = new MessagingService(uuid);

        // Initialize the awaited player
        this.players = this.playersMetadata.map((metadata: PlayerMetadata) => {
            return {
                uuid: metadata.uuid,
                username: metadata.username,
                lastSeen: undefined,
                isConnected: false
            };
        });
    }

    public playerJoins(playerUUID: PlayerUUID, ws: WebSocket, isReconnecting = false) {
        const player = this.getPlayer(playerUUID);
        if (player === undefined) {
            this.logger.context('playerJoins').warn('Player not registered in the game session', { playerUUID });
            return;
        }

        // Register player to the messaging service
        this.messagingService.registerPlayerSocket(playerUUID, ws);

        if (isReconnecting) {
            //Fetch the last seen time
            const lastSeen = player.lastSeen;
            if (lastSeen === undefined) {
                this.logger.context('playerJoins').error('LastSeen needed for reconnection...', { playerUUID });
                return;
            }
            this.messagingService.sendMissedMessages(playerUUID, lastSeen);
        }

        // Update the player's connection status
        player.isConnected = true;
        player.lastSeen = Date.now();

        // if all players have joined, start the game
        if (!this.hasStarted && this.allPlayersJoined()) {
            // Start the game
            this.startGame();
        }
    }

    public playerDisconnects(playerUUID: string) {
        const player = this.getPlayer(playerUUID);
        if (player === undefined) {
            this.logger.context('playerLeaves').error('Player not registered in the game session', { playerUUID });
            return;
        }

        // Update the player's connection status
        player.isConnected = false;
        player.lastSeen = Date.now();
    }

    public playerLeaves(playerUUID: string) {
        this.playerDisconnects(playerUUID);
        this.handlePlayerLeaves(playerUUID);
    }

    public hasPlayer(playerUUID: string): boolean {
        return this.players.some(player => player.uuid === playerUUID);
    }

    public isInProgress(): boolean {
        return this.hasStarted;
    }

    private allPlayersJoined(): boolean {
        return this.players.every(player => player.isConnected);
    }

    private getPlayer(playerUUID: string): Player | undefined {
        const player = this.players.find(player => player.uuid === playerUUID);
        if (player === undefined) {
            this.logger.context('getPlayer').error('Player not found', { playerUUID, gameSessionUUID: this.uuid });
        }
        return player;
    }
}
