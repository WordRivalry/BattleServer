import {GameSession} from "./GameSession";
import {createScopedLogger} from "../logger/logger";
import {PlayerMetadata} from "./GameSessionManager";
import {Path, PlayerAction_PublishWord} from "../server_networking/validation/messageType";
import {Arena} from "./Arena";
import {WaitingState} from "../game/States/WaitingState";
import {InfoDispatchState} from "../game/States/InfoDispatchState";
import {CountdownState} from "../game/States/CountdownState";
import {InProgressState} from "../game/States/InProgressState";
import {PerformingEndGameState} from "../game/States/PerformingEndGameState";
import {PersistingGameState} from "../game/States/PersistingGameState";
import {FinishedState} from "../game/States/FinishedState";
import {StateMachineComponent} from "../ecs/components/StateMachine/StateMachineComponent";
import {TimerComponent} from "../ecs/components/TimerComponent";
import {IdentityComponent} from "../ecs/components/player/IdentityComponent";
import {ScoreComponent} from "../game/components/ScoreComponent";
import {PlayerControllerComponent} from "../ecs/components/player/PlayerControllerComponent";
import {NormalRankComponent} from "../game/components/NormalRankComponent";
import {SubmitWordCommandComponent} from "../game/components/SubmitWordCommandComponent";
import {PlayerScoreUpdateEvent} from "../game/systems/SubmitWordCommandSystem";

export enum NormalRankGameEvent {
    PUBLISH_WORD = 'publishWord'
}

export interface PublishWordEvent {
    wordPath: Path;
    playerName: string;
}

export class NormalRankGameSession extends GameSession {
    private logger = createScopedLogger('NormalRankGameSession');
    private readonly fsm: StateMachineComponent;
    private readonly gameEntity: number;

    constructor(
        public gameSessionUUID: string,
        public playersMetadata: PlayerMetadata[],
        public gameMode: string,
        public modeType: string,
        private readonly arena: Arena,
    ) {
        super(
            gameSessionUUID,
            playersMetadata,
            gameMode,
            modeType,
            arena.eventSystem
        );

        this.gameEntity = this.arena.createEntity();

        const gameIdentityComponent = new IdentityComponent(gameSessionUUID);
        this.arena.attachComponent(this.gameEntity, IdentityComponent, gameIdentityComponent);

        // Finite State Machine
        this.fsm = this.setFSM();
        this.arena.attachStates(this.gameEntity, this.fsm);

        // Set the players
        this.setPlayers(this.gameEntity);

        // Register game engine listeners
        this.registerGameEngineListener();
    }

    /////////////////////////////////////////////////
    //               Arena preparation             //
    /////////////////////////////////////////////////

    private setFSM(): StateMachineComponent {
        const stateMachineComponent = new StateMachineComponent(WaitingState);
        const infoDispatchState = new InfoDispatchState(this.sessionNetworking);
        const countdownState = new CountdownState(this.sessionNetworking);
        const inProgressState = new InProgressState(this.sessionNetworking);
        const performEndGame = new PerformingEndGameState(this.sessionNetworking);
        const persistingGame = new PersistingGameState();
        const finishedState = new FinishedState();

        stateMachineComponent.addTransition(
            WaitingState,
            InfoDispatchState,
            infoDispatchState,
            () => {
            return this.sessionNetworking.isAllPlayersConnected();
        });

        stateMachineComponent.addTransition(
            InfoDispatchState,
            CountdownState,
            countdownState,
            (gameEntity: number, ecManager) => {
            return ecManager.hasTag(gameEntity, 201);
        });

        stateMachineComponent.addTransition(
            CountdownState,
            InProgressState,
            inProgressState,
            (gameEntity: number, ecManager) => {
            return ecManager.getComponent(gameEntity, TimerComponent)?.isActive === false;
        });

        stateMachineComponent.addTransition(
            InProgressState,
            PerformingEndGameState,
            performEndGame,
            (gameEntity: number, ecManager) => {
            return ecManager.getComponent(gameEntity, TimerComponent)?.isActive === false;
        });

        stateMachineComponent.addTransition(
            PerformingEndGameState,
            PersistingGameState,
            persistingGame,
            (gameEntity: number, ecManager) => {
            return ecManager.hasTag(gameEntity, 202);
        });

        stateMachineComponent.addTransition(
            PersistingGameState,
            FinishedState,
            finishedState,
            (gameEntity: number, ecManager) => {
            return ecManager.hasTag(gameEntity, 203);
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

            // Enable targeting the right system
            this.arena.attachComponent(playerEntity, NormalRankComponent, new NormalRankComponent());

            // Assign the player to the game
            this.arena.assignPlayerToGame(playerEntity, gameEntity);
        });
    }

    //////////////////////////////////////////////////
    //               Network Delegates              //
    //////////////////////////////////////////////////

    override onAPlayerJoined(player: string): void {
        this.logger.context('onAPlayerJoined').info('Player joined', {player, gameSessionUUID: this.gameSessionUUID});
    }

    override onAllPlayersJoined(): void {
        this.logger.context('onAllPlayersJoined').info('All players joined', {gameSessionUUID: this.gameSessionUUID});
    }

    override onAction(playerName: string, action: PlayerAction_PublishWord): void {
        this.logger.context('onAction').info('Player action', {player: playerName, action: action.payload.data.wordPath, gameSessionUUID: this.gameSessionUUID});
        // const submitWordCommandComponent = new SubmitWordCommandComponent(action.payload.data.wordPath);
        // const playerEntity = this.arena.getPlayerEntity(this.gameEntity, playerName);
        // this.arena.attachComponent(playerEntity, SubmitWordCommandComponent, submitWordCommandComponent);

        this.arena.eventSystem.emitTargeted<PublishWordEvent>(NormalRankGameEvent.PUBLISH_WORD, this.gameSessionUUID, {
            wordPath: action.payload.data.wordPath,
            playerName: playerName
        });
    }

    override onPlayerLeft(playerName: string): void {
        this.logger.context('onPlayerLeft').info('Ending game due to player leaving', {player: playerName, gameSessionUUID: this.gameSessionUUID});

        // Send the game end message to all players
        this.sessionNetworking.broadcastMessage('gameEndByPlayerLeft', {});

        //  this.gameEngine.endGame();
        this.fsm.directTransition(PerformingEndGameState);
    }

    //////////////////////////////////////////////////
    //             Game engine Listeners            //
    //////////////////////////////////////////////////

    registerGameEngineListener(): void {
        this.registerScoreUpdateListener();
        this.registerGameEndListener();
    }

    registerScoreUpdateListener(): void {
        this.arena.eventSystem.subscribeTargeted<PlayerScoreUpdateEvent>('playerScoreUpdate', this.gameSessionUUID, (event) => {
            // Broadcast the updated score to all players except the one who scored
            this.sessionNetworking.sendMessage(
                'playerScoreUpdate',
                event,
                this.playersMetadata
                    .filter(player => player.playerName !== event.playerName)
                    .map(player => player.playerName)
            );
            this.logger.context('notifyPlayersScoreUpdate').info('Score updated', {playerName: event.playerName, newScore: event.score, gameSessionUUID: this.gameSessionUUID});
        });
    }

    registerGameEndListener(): void {

        this.arena.eventSystem.subscribeTargeted('gameEnd', this.gameSessionUUID, () => {
            this.logger.context('notifyPlayersGameEnd').info('Game ended', {gameSessionUUID: this.gameSessionUUID});
            this.closeGameSession();
        });
    }
}