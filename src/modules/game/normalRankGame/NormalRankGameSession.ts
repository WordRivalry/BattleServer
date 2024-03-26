import {GameSession} from "../../framework/GameSession";
import {createScopedLogger} from "../../logger/logger";
import {PlayerMetadata} from "../../framework/GameSessionManager";
import {Path, PlayerAction_PublishWord} from "../../server_networking/validation/messageType";
import {Arena} from "../../framework/Arena";
import {WaitingState} from "../States/WaitingState";
import {InfoDispatchState} from "../States/InfoDispatchState";
import {PreGameCountdownState} from "../States/PreGameCountdownState";
import {InProgressState} from "../States/InProgressState";
import {ShowGameResultState} from "../States/ShowGameResultState";
import {PersistingGameState} from "../States/PersistingGameState";
import {FinishedState} from "../States/FinishedState";
import {StateMachineComponent} from "../../ecs/components/StateMachine/StateMachineComponent";
import {IdentityComponent} from "../../ecs/components/player/IdentityComponent";
import {ScoreComponent} from "../components/ScoreComponent";
import {PlayerControllerComponent} from "../../ecs/components/player/PlayerControllerComponent";
import {NormalRankComponent} from "../components/NormalRankComponent";
import {WordHistoricComponent} from "../components/WordHistoricComponent";
import {EloRatingComponent} from "../components/EloRatingComponent";

export enum NormalRankGameEvent {
    PUBLISH_WORD = 'PUBLISH_WORD',
    OPPONENT_PUBLISHED_WORD = 'OPPONENT_PUBLISHED_WORD',
    GAME_END_BY_PLAYER_LEFT = 'GAME_END_BY_PLAYER_LEFT',
    PRE_GAME_COUNTDOWN = 'PRE_GAME_COUNTDOWN',
    COUNTDOWN = 'COUNTDOWN',
    GAME_INFORMATION = 'GAME_INFORMATION',
    PLAYER_SCORE_UPDATED = "PLAYER_SCORE_UPDATED",
    GAME_RESULT = "GAME_RESULT"
}

export interface PublishWordEvent {
    wordPath: Path;
    playerName: string;
}

export interface PlayerScoreUpdateEvent {
    playerName: string;
    score: number;
}

export class NormalRankGameSession extends GameSession {
    private logger = createScopedLogger('NormalRankGameSession');
    private readonly fsm: StateMachineComponent;

    constructor(
        public gameSessionUUID: string,
        public playersMetadata: PlayerMetadata[],
        public gameMode: string,
        public modeType: string,
        arena: Arena,
    ) {
        super(
            gameSessionUUID,
            playersMetadata,
            gameMode,
            modeType,
            arena
        );

        const gameIdentityComponent = new IdentityComponent(gameSessionUUID);
        this.arena.attachComponent(this.gameEntity, IdentityComponent, gameIdentityComponent);

        // Finite State Machine
        this.fsm = this.setFSM();
        this.arena.attachStates(this.gameEntity, this.fsm);

        // Set the players
        this.setPlayers(this.gameEntity);

        // Register game engine listeners
        this.registerScoreUpdateListener();
    }

    //////////////////////////////////////////////////
    //               Network Delegates              //
    //////////////////////////////////////////////////

    override onPlayerJoined(player: string): void {
        this.logger.context('onAPlayerJoined').info('Player joined', {player, gameSessionUUID: this.gameSessionUUID});
    }

    override onAction(playerName: string, action: PlayerAction_PublishWord): void {
        this.logger.context('onAction').info('Player action', {player: playerName, action: action.payload.data.wordPath, gameSessionUUID: this.gameSessionUUID});
        this.arena.eventSystem.emitTargeted<PublishWordEvent>(NormalRankGameEvent.PUBLISH_WORD, this.gameSessionUUID, {
            wordPath: action.payload.data.wordPath,
            playerName: playerName
        });
    }

    override onPlayerLeft(playerName: string): void {
        this.logger.context('onPlayerLeft').info('Ending game due to player leaving', {player: playerName, gameSessionUUID: this.gameSessionUUID});

        // Send the game end message to all players
        this.broadcastMessage(NormalRankGameEvent.GAME_END_BY_PLAYER_LEFT, {});

        // End the game
        this.fsm.directTransition(ShowGameResultState);
    }

    //////////////////////////////////////////////////
    //             Game engine Listeners            //
    //////////////////////////////////////////////////

    registerScoreUpdateListener(): void {
        this.arena.eventSystem.subscribeTargeted<PlayerScoreUpdateEvent>(NormalRankGameEvent.PLAYER_SCORE_UPDATED, this.gameSessionUUID, (event) => {
            // Broadcast the updated score to all players except the one who scored

            const playerName =  this.playersMetadata
                .filter(player => player.playerName !== event.playerName)
                .map(player => player.playerName)
                .pop();
            if (playerName === undefined) throw new Error('Player not found');

            this.sendMessage(
                playerName,
                NormalRankGameEvent.OPPONENT_PUBLISHED_WORD,
                event
            );
            this.logger.context('notifyPlayersScoreUpdate').info('Score updated', {playerName: event.playerName, newScore: event.score, gameSessionUUID: this.gameSessionUUID});
        });
    }

    /////////////////////////////////////////////////
    //               Arena preparation             //
    /////////////////////////////////////////////////

    private setFSM(): StateMachineComponent {

        const broadcastMethod = (type: string, payload: any) => this.broadcastMessage(type, payload);

        const stateMachineComponent = new StateMachineComponent(WaitingState);
        const infoDispatchState = new InfoDispatchState(broadcastMethod);
        const countdownState = new PreGameCountdownState(broadcastMethod);
        const inProgressState = new InProgressState(broadcastMethod);
        const showGameResultState = new ShowGameResultState(broadcastMethod);
        const persistingGame = new PersistingGameState();
        const finishedState = new FinishedState();

        stateMachineComponent.addTransition(
            WaitingState,
            InfoDispatchState,
            infoDispatchState,
            () => {
                return this.isAllPlayersConnected();
            });

        stateMachineComponent.addTransition(
            InfoDispatchState,
            PreGameCountdownState,
            countdownState,
            (gameEntity: number, ecManager) => {
                return ecManager.hasTag(gameEntity, 200);
            });

        stateMachineComponent.addTransition(
            PreGameCountdownState,
            InProgressState,
            inProgressState,
            (gameEntity: number, ecManager) => {
                return ecManager.hasTag(gameEntity, 200);
            });

        stateMachineComponent.addTransition(
            InProgressState,
            ShowGameResultState,
            showGameResultState,
            (gameEntity: number, ecManager) => {
                return ecManager.hasTag(gameEntity, 200);
            });

        stateMachineComponent.addTransition(
            ShowGameResultState,
            PersistingGameState,
            persistingGame,
            (gameEntity: number, ecManager) => {
                return ecManager.hasTag(gameEntity, 200);
            });

        stateMachineComponent.addTransition(
            PersistingGameState,
            FinishedState,
            finishedState,
            (gameEntity: number, ecManager) => {
                return ecManager.hasTag(gameEntity, 200);
            });

        return stateMachineComponent;
    }

    private setPlayers(gameEntity: number) {
        this.playersMetadata.map(playerMetadata => {
            const playerEntity = this.arena.createEntity();

            // Player identity component
            this.arena.attachComponent(
                playerEntity,
                IdentityComponent,
                new IdentityComponent(playerMetadata.playerName)
            );

            // Score component
            this.arena.attachComponent(
                playerEntity,
                ScoreComponent,
                new ScoreComponent()
            );

            // Player controller component
            this.arena.attachComponent(
                playerEntity,
                PlayerControllerComponent,
                new PlayerControllerComponent()
            );

            // Word History
            this.arena.attachComponent(
                playerEntity,
                WordHistoricComponent,
                new WordHistoricComponent()
            )

            // Elo ranking component
            this.arena.attachComponent(
                playerEntity,
                EloRatingComponent,
                new EloRatingComponent(playerMetadata.playerEloRating)
            )

            // Enable targeting the right system
            this.arena.attachComponent(playerEntity, NormalRankComponent, new NormalRankComponent());

            // Assign the player to the game
            this.arena.assignPlayerToGame(playerEntity, gameEntity);
        });
    }
}