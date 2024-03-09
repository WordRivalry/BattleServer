
import { PlayerMetadata } from '../GameSession/GameSessionManager';
import { MasterGame } from "../gameEngine/game/MasterGame";
import { GameMode, ModeType } from "./validation/messageType";

export class HttpRequestHandler {
    constructor(private masterGame: MasterGame) {}

    public handleRequestAlloc(playersMetadata: PlayerMetadata[], gameMode: string, modeType: string): string {
        const gameModeEnum = this.toGameMode(gameMode);
        const modeTypeEnum = this.toModeType(modeType);

        if (!gameModeEnum || !modeTypeEnum) {
            throw new Error("Invalid game mode or mode type provided.");
        }

        return this.masterGame.createGame(playersMetadata, gameModeEnum, modeTypeEnum);
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