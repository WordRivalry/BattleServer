
import { GameSessionManager, PlayerMetadata, SessionRequestData } from './GameSessionManager';
import { PlayerSessionValidationAndManagement } from './PlayerSessionValidationAndManagement';

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