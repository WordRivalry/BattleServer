import { v4 as uuidv4 } from 'uuid';
import { GameSession } from './GameSession';
import { createScopedLogger } from '../logger/logger';
import {NormalRankGameSession} from "./NormalRankGameSession";

export interface PlayerMetadata {
    uuid: string;
    username: string;
}

export interface SessionRequestData {
    playersMetadata: PlayerMetadata[];
    gameMode: string;
    modeType: string;
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

    createSession(requestData: SessionRequestData): string {
        const sessionUUID = uuidv4();

        const session = this.createGameSession(
            sessionUUID, 
            requestData.playersMetadata, 
            requestData.gameMode, 
            requestData.modeType
        );

        this.sessions.set(session.uuid, session);
        this.logger.context('createSession').debug('Created game session', { sessionUUID });
        return sessionUUID;
    }

    getSession(sessionUUID: string): GameSession | undefined {
        return this.sessions.get(sessionUUID);
    }

    handlePlayerTimeout(playerUUID: string, sessionUUID: string) {
        const session = this.getSession(sessionUUID);
        if (session === undefined) {
            this.logger.context('handlePlayerTimeout').warn('Game session not found', { sessionUUID });
            return;
        }

        if (!session.hasPlayer(playerUUID)) {
            this.logger.context('handlePlayerTimeout').error('Player not found in the game session', { playerUUID });
            return;
        }

        session.playerLeaves(playerUUID);
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
            default:
                this.logger.context('createGameSession').error('Invalid game mode or game type', { gameMode, gameType });
                throw new Error('Invalid game mode or game type');
        }

        return new NormalRankGameSession(sessionUUID, playerMetadata, gameMode, gameType);
    }
}
