
import {WebSocket} from 'ws';
import {EventEmitter} from 'events';
import {createScopedLogger} from '../logger/logger';
import {PlayerMetadata} from './GameSessionManager';
import {PlayerNotInSessionError} from "../error/Error";
import {PlayerAction} from "../server_networking/validation/messageType";
import {MessagingService} from "./MessageService";
import {Player} from "../../types";

export abstract class GameSession extends EventEmitter {
    protected players: Player[] = [];
    protected isProgressing: boolean = false;
    protected messagingService: MessagingService;
    private logger = createScopedLogger('GameSession');

    abstract startGame(): void;
    abstract handlePlayerLeaves(playerUUID: string): void;
    abstract handlePlayerAction(playerUUID: string, action:  PlayerAction): void;

    protected constructor(
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

    public playerJoins(playerUUID: string, ws: WebSocket, isReconnecting: boolean = false): void {
        const player: Player = this.getPlayer(playerUUID);

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
        if (!this.isProgressing && this.allPlayersJoined()) {
            // Start the game
            this.startGame();
        }
    }

    public playerDisconnects(playerUUID: string): void {
        const player: Player = this.getPlayer(playerUUID);

        // Update the player's connection status
        player.isConnected = false;
        player.lastSeen = Date.now();
    }

    public playerLeaves(playerUUID: string): void {
        this.playerDisconnects(playerUUID);
        this.handlePlayerLeaves(playerUUID);
    }

    public validatePlayerIsInSession(playerUUID: string): void {
        if (!this.hasPlayer(playerUUID)) {
            throw new PlayerNotInSessionError(playerUUID);
        }
    }

    public isInProgress(): boolean {
        return this.isProgressing;
    }

    private hasPlayer(playerUUID: string): boolean {
        return this.players.some(player => player.uuid === playerUUID);
    }

    private allPlayersJoined(): boolean {
        return this.players.every(player => player.isConnected);
    }

    private getPlayer(playerUUID: string): Player {
        const player: Player | undefined = this.players.find(player => player.uuid === playerUUID);
        if (player === undefined) {
            throw new PlayerNotInSessionError(playerUUID);
        }
        return player;
    }

    protected closeGameSession() {
        this.isProgressing = false;
        this.messagingService.disconnectAllPlayers()
        this.emit('gameEnd', this.uuid);
    }
}