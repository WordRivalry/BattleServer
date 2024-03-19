import {v4 as uuidv4} from 'uuid';
import {GameSession} from './GameSession';
import {createScopedLogger} from '../logger/logger';
import {NormalRankGameSession} from "./NormalRankGameSession";
import {BadSessionRequestError} from "../error/Error";
import {GameEvent} from "./GameEvent";
import {TypedEventEmitter} from "../ecs/TypedEventEmitter";
import {GameEngine} from "../ecs/GameEngine";
import {Arena} from "./Arena";

export interface PlayerMetadata {
    playerName: string;
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
        const cancellation = this.arena.eventSystem.subscribeTargeted(GameEvent.GAME_END, sessionUUID, () => {
            this.sessions.get(sessionUUID)?.listenerCancellation?.();
            this.sessions.delete(sessionUUID);
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