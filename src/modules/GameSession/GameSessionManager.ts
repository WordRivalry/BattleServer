import { v4 as uuidv4 } from 'uuid';
import { GameSession } from './GameSession';
import { createScopedLogger } from '../logger/logger';
import { NormalRankGameSession } from "./GameSessionType/NormalRankGameSession";
import { BadSessionRequestError } from "../error/Error";
import { EventEmitter } from "events";
import { GameEvent } from "./GameEventsEmitter";

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


    constructor(private eventEmitter: EventEmitter) {}

    createSession(requestData: SessionRequestData): string {
        const sessionUUID: string = uuidv4();

        const session: GameSession = this.createGameSession(
            sessionUUID, 
            requestData.playersMetadata, 
            requestData.gameMode, 
            requestData.modeType
        );

        this.sessions.set(session.gameSessionId, session);

        // Register the destroy event
        this.eventEmitter.on(`${sessionUUID}:${GameEvent.GAME_END}`, () => {
            this.sessions.delete(sessionUUID);
        });

        this.logger.context('createSession').debug('Created game session', { sessionUUID });
        return sessionUUID;
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
