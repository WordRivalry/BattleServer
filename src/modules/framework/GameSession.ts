// GameSession.ts
import {GameSessionNetworking, GameSessionNetworking_Delegate} from './GameSessionNetworking';
import {PlayerMetadata} from './GameSessionManager';
import {PlayerAction} from '../server_networking/validation/messageType';
import {Arena} from "./Arena";

export abstract class GameSession implements GameSessionNetworking_Delegate {

    private sessionNetworking: GameSessionNetworking;
    protected gameEntity: number;

    protected constructor(
        public readonly gameSessionUUID: string,
        public readonly playersMetadata: PlayerMetadata[],
        public readonly gameMode: string,
        public readonly modeType: string,
        public readonly arena: Arena
    ) {
        this.sessionNetworking = new GameSessionNetworking(gameSessionUUID, playersMetadata, arena.eventSystem);
        this.sessionNetworking.setDelegate(this);
        this.gameEntity = this.arena.createEntity();
    }

    //////////////////////////////////////////////////
    //               Network Delegates              //
    //////////////////////////////////////////////////

    abstract onPlayerLeft(playerName: string): void;
    abstract onAction(playerName: string, action: PlayerAction): void;
    abstract onPlayerJoined(playerName: string): void;

    //////////////////////////////////////////////////
    //               Game Session API               //
    //////////////////////////////////////////////////

    public cleanup(): void {
        this.sessionNetworking.cleanup();
        this.arena.cleanup(this.gameEntity);
        // Ready for garbage collection
    }

    protected broadcastMessage(type: string, payload: any): void {
        this.sessionNetworking.broadcastMessage(type, payload);
    }

    protected sendMessage(to: string, type: string, payload: any): void {
        this.sessionNetworking.sendMessage(type, payload, to);
    }

    protected isAllPlayersConnected(): boolean {
        return this.sessionNetworking.isAllPlayersConnected();
    }
}