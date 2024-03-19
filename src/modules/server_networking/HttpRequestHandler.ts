// HttpRequestHandler.ts
import {PlayerMetadata} from "../oldButNew/GameSessionManager";
import {GameMode, ModeType} from "./validation/messageType";
import {GameSessionManager} from "../oldButNew/GameSessionManager";

export class HttpRequestHandler {
    constructor(private sessionManager: GameSessionManager) {}

    public handleRequestAlloc(playersMetadata: PlayerMetadata[], gameMode: string, modeType: string): string {
        const gameModeEnum = this.toGameMode(gameMode);
        const modeTypeEnum = this.toModeType(modeType);

        if (!gameModeEnum || !modeTypeEnum) {
            throw new Error("Invalid game mode or mode type provided.");
        }

        return this.sessionManager.createSession(playersMetadata, gameModeEnum, modeTypeEnum);
    }

    private toGameMode(value: string): GameMode | undefined {
        if (Object.values(GameMode).includes(value as GameMode)) {
            return value as GameMode;
        }
        return undefined;
    }

    private toModeType(value: string): ModeType | undefined {
        if (Object.values(ModeType).includes(value as ModeType)) {
            return value as ModeType;
        }
        return undefined;
    }
}