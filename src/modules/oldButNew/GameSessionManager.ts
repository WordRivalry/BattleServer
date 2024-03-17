import { v4 as uuidv4 } from 'uuid';
import { GameSession } from './GameSession';
import { createScopedLogger } from '../logger/logger';
import {NormalRankGameSession} from "./NormalRankGameSession";
import {BadSessionRequestError, SessionNotFoundError} from "../error/Error";

export interface PlayerMetadata {
    uuid: string;
    username: string;
}

export class GameSessionManager {
    private sessions: Map<string, GameSession> = new Map();
    private logger = createScopedLogger('GameSessionManager');

    constructor() {
        // Listen for gameEnd events from the game sessions
        this.sessions.forEach((session: GameSession) => {
            session.on('gameEnd', (sessionUUID: string) => {
                this.sessions.delete(sessionUUID);
                this.logger.context('GameSessionManager').debug('Game session ended', { sessionUUID });
            });
        });
    }

    createSession( playersMetadata: PlayerMetadata[], gameMode: string,  modeType: string): string {
        const sessionUUID: string = uuidv4();

        const session: GameSession = this.createGameSession(
            sessionUUID,
            playersMetadata,
            gameMode,
            modeType
        );

        this.sessions.set(session.uuid, session);
        this.logger.context('createSession').debug('Created game session', { sessionUUID });
        return sessionUUID;
    }

    getSession(sessionUUID: string): GameSession {
        const session: GameSession | undefined = this.sessions.get(sessionUUID);
        if (session === undefined) {
            throw new SessionNotFoundError(sessionUUID);
        }
        return session;
    }

    handlePlayerTimeout(playerUUID: string, sessionUUID: string) {
        try {
            const session = this.getSession(sessionUUID);
            session.validatePlayerIsInSession(playerUUID);
            session.playerLeaves(playerUUID);
        } catch (error) {
            this.logger.context('handlePlayerTimeout').error('An error occurred', error);
        }
    }

    private createGameSession(sessionUUID: string, playerMetadata: PlayerMetadata[], gameMode: string, gameType: string): GameSession {
        switch (gameMode) {
            case 'RANK':
                switch (gameType) {
                    case 'NORMAL':
                        return new NormalRankGameSession(sessionUUID, playerMetadata, gameMode, gameType);
                    case 'BLITZ':
                        return new NormalRankGameSession(sessionUUID, playerMetadata, gameMode, gameType);
                }
                break;
            case 'QUICK DUEL':
                switch (gameType) {
                    case 'NORMAL':
                        return new NormalRankGameSession(sessionUUID, playerMetadata, gameMode, gameType);
                    case 'BLITZ':
                        return new NormalRankGameSession(sessionUUID, playerMetadata, gameMode, gameType);
                }
                break;
        }

        throw new BadSessionRequestError('Invalid game mode or game type');
    }
}