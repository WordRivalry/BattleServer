// GameSessionManager.ts
import {v4 as uuidv4} from 'uuid';
import {GameSession} from './GameSession';
import {createScopedLogger} from '../logger/logger';
import {NormalRankGameSession} from "../game/normalRankGame/NormalRankGameSession";
import {BadSessionRequestError} from "../error/Error";
import {Arena} from "./Arena";
import {EngineGameEventEnum} from "./EngineGameEventEnum";

export interface PlayerMetadata {
    playerName: string;
    playerEloRating: number;
}

export class GameSessionManager {
    private sessions: Map<string, { session: GameSession, listenerCancellation: (() => void) | null }> = new Map();
    private logger = createScopedLogger('GameSessionManager');

    constructor(private arena: Arena) {}

    createSession(
        playersMetadata: PlayerMetadata[],
        gameMode: string,
        modeType: string
    ): string {
        const sessionUUID: string = uuidv4();

        const session: GameSession = this.createGameSession(
            sessionUUID,
            playersMetadata,
            gameMode,
            modeType
        );

        // Register event
        const cancellation = this.arena.eventSystem.subscribeTargeted(EngineGameEventEnum.GAME_END, sessionUUID, () => {
            const obj = this.sessions.get(sessionUUID);
            if (obj === undefined) throw new Error(`Game session ${sessionUUID} not found.`);
            obj.listenerCancellation?.();
            obj.session.cleanup();
            this.sessions.delete(sessionUUID);

            // Session ready for garbage collection
            this.logger.context('createSession').debug('Game session ended', {sessionUUID});
        });

        // Store session
        this.sessions.set(session.gameSessionUUID, {
            session: session,
            listenerCancellation: cancellation
        });

        this.logger.context('createSession').debug('Created game session', {sessionUUID});
        return sessionUUID;
    }

    private createGameSession(sessionUUID: string, playerMetadata: PlayerMetadata[], gameMode: string, gameType: string): GameSession {
        switch (gameMode) {
            case 'RANK':
                switch (gameType) {
                    case 'NORMAL':
                        return new NormalRankGameSession(sessionUUID, playerMetadata, gameMode, gameType, this.arena);
                    case 'BLITZ':
                        return new NormalRankGameSession(sessionUUID, playerMetadata, gameMode, gameType, this.arena);
                }
                break;
            case 'QUICK DUEL':
                switch (gameType) {
                    case 'NORMAL':
                        return new NormalRankGameSession(sessionUUID, playerMetadata, gameMode, gameType, this.arena);
                    case 'BLITZ':
                        return new NormalRankGameSession(sessionUUID, playerMetadata, gameMode, gameType, this.arena);
                }
                break;
        }

        throw new BadSessionRequestError('Invalid game mode or game type');
    }
}