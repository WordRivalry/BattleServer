import {GameSessionNetworking, GameSessionNetworking_Delegate} from './GameSessionNetworking';
import {PlayerMetadata} from './GameSessionManager';
import {PlayerAction} from '../server_networking/validation/messageType';
import {TypedEventEmitter} from "../ecs/TypedEventEmitter";

export enum SessionState {
    WAITING = "waiting",
    IN_PROGRESS = "in_progress",
    ENDED = "ended"
}

export abstract class GameSession implements GameSessionNetworking_Delegate {

    protected sessionNetworking: GameSessionNetworking;
    private sessionState: SessionState = SessionState.WAITING;

    //////////////////////////////////////////////////
    //               Network Delegates              //
    //////////////////////////////////////////////////

    protected constructor(
        public readonly gameSessionUUID: string,
        public readonly playersMetadata: PlayerMetadata[],
        public readonly gameMode: string,
        public readonly modeType: string,
        eventEmitter: TypedEventEmitter
    ) {
        this.sessionNetworking = new GameSessionNetworking(gameSessionUUID, playersMetadata, eventEmitter);
        this.sessionNetworking.setDelegate(this);
    }

    abstract onPlayerLeft(playerName: string): void;

    abstract onAction(playerName: string, action: PlayerAction): void;

    abstract onAllPlayersJoined(): void;

    abstract onAPlayerJoined(playerName: string): void;

    protected changeStateToInProgress(): void {
        this.sessionState = SessionState.IN_PROGRESS;
    }

    protected closeGameSession(): void {
        this.changeStateToEnded();
        this.sessionNetworking.emitGameEnd();
    }

    private changeStateToEnded(): void {
        this.sessionState = SessionState.ENDED;
    }
}