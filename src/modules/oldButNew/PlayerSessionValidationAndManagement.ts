import EventEmitter from "events";
import { createScopedLogger } from "../logger/logger";
import { GameSessionManager } from "./GameSessionManager";
import { GameSession } from './GameSession';
import { WebSocket } from "ws";
import {
    NoConnectionTimeoutError,
} from "../error/Error";

export class PlayerSessionValidationAndManagement extends EventEmitter {
    private readonly reconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
    private logger = createScopedLogger('PlayerSessionValidationAndManagement');

    constructor(private gameSessionManager: GameSessionManager) {
        super();
    }

    validatePlayerConnection(playerUUID: string, sessionUUID: string): void {
        // Validate if the playerUUID belongs to the sessionUUID
        const session = this.getSession(sessionUUID);
        // Validate player belongs to the session
        session.validatePlayerIsInSession(playerUUID);
    }

    // Methods for handleDisconnection() and handleReconnection()
    handleDisconnection(playerUUID: string, sessionUUID: string): void {
        const session = this.getSession(sessionUUID);
        session.validatePlayerIsInSession(playerUUID);

        // Handle based on the session state
        if (session.isInProgress()) {
            // Mark the player as disconnected
            session.playerDisconnects(playerUUID);
            // Give 10 seconds for player to reconnect
            this.setTimeOutForPlayerReconnection(playerUUID, sessionUUID, 10);
            this.logger.context('handleDisconnection').info('Player disconnected from an in-progress game session', { playerUUID, sessionUUID });
        } else {
            // Mark the player as disconnected
            session.playerDisconnects(playerUUID);
            // Give 2 seconds for player to reconnect
            this.setTimeOutForPlayerReconnection(playerUUID, sessionUUID, 2);
            this.logger.context('handleDisconnection').info('Player disconnected from a game session', { playerUUID, sessionUUID });
        }
    }

    handleReconnection(playerUUID: string, sessionUUID: string, ws: WebSocket): void {
        // Validate if the playerUUID belongs to the sessionUUID
        const session = this.getSession(sessionUUID);
        // Validate player belongs to the session
        session.validatePlayerIsInSession(playerUUID);

        const timeout = this.reconnectionTimeouts.get(playerUUID);
        if (timeout === undefined) {
            throw new NoConnectionTimeoutError(playerUUID);
        }

        clearTimeout(timeout);
        this.reconnectionTimeouts.delete(playerUUID);
        session.playerJoins(playerUUID, ws, true);
    }

    private getSession(sessionUUID: string): GameSession {
        return this.gameSessionManager.getSession(sessionUUID);
    }

    private setTimeOutForPlayerReconnection(playerUUID: string, sessionUUID: string, timeout: number) {
        // Set a timeout for player reconnection
        const reconnectionTimeout = setTimeout(() => {
            // Handle the case where the player does not reconnect in time
            this.logger.context('onPlayerDisconnected').info('Player did not reconnect in time.', { playerUUID });
            this.gameSessionManager.handlePlayerTimeout(sessionUUID, playerUUID);
        }, timeout * 1000); // Seconds to milliseconds

        // Store the timeout so it can be cleared upon successful reconnection
        this.reconnectionTimeouts.set(playerUUID, reconnectionTimeout);
    }
}