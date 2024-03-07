
import { GameSessionManager, PlayerMetadata, SessionRequestData } from '../GameSession/GameSessionManager';

export class HttpRequestHandler {
    constructor(private gameSessionManager: GameSessionManager) {}

    handleRequestAlloc(playersMetadata: PlayerMetadata[], gameMode: string, modeType: string): string {
        const sessionRequestData: SessionRequestData = {
            playersMetadata,
            gameMode,
            modeType
        };
        return this.gameSessionManager.createSession(sessionRequestData);
    }
}