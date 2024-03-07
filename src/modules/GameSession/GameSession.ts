import { GameSessionNetworking, GameSessionNetworking_Delegate } from './GameSessionNetworking';
import { PlayerMetadata } from './GameSessionManager';
import { PlayerAction } from '../server_networking/validation/messageType';

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

    abstract onPlayerLeft(player: string): void;
    abstract onAction(player: string, action: PlayerAction): void;
    abstract onAllPlayersJoined(): void;
    abstract onAPlayerJoined(player: string): void;

    protected constructor(
        public gameSessionId: string,
        protected playersMetadata: PlayerMetadata[],
        public gameMode: string,
        public modeType: string
    ) {
        this.sessionNetworking = new GameSessionNetworking(gameSessionId, playersMetadata);
        this.sessionNetworking.setDelegate(this);
    }

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