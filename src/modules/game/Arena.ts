import {PlayerIdentityComponent} from "../ecs/components/player/PlayerIdentityComponent";
import {PlayerConnectionComponent} from "../ecs/components/player/PlayerConnectionComponent";
import {GridPoolSystem} from "./systems/GridPoolSystem";
import {GameMode, ModeType} from "../server_networking/validation/messageType";
import {ScoreComponent} from "./components/ScoreComponent";
import {GameEngine} from "../ecs/GameEngine";
import {GlobalComponent} from "../ecs/components/GlobalComponent";
import {GridPoolComponent} from "./components/game/GridPoolComponent";
import {GridComponent} from "./components/game/GridComponent";
import {TimerComponent} from "../ecs/components/TimerComponent";
import {TypedEventEmitter} from "../ecs/TypedEventEmitter";
import {WaitingForPlayersState} from "./States/WaitingForPlayersState";
import {InProgressState} from "./States/InProgressState";
import {FinishedState} from "./States/FinishedState";
import {CountdownState} from "./States/CountdownState";
import {StateMachineSystem} from "../ecs/systems/fsm/StateMachineSystem";
import {StateMachineComponent} from "../ecs/components/StateMachine/StateMachineComponent";
import {PlayerCommunicationSystem} from "../ecs/systems/network/PlayerCommunicationSystem";
import {InfoDispatchState} from "./States/InfoDispatchState";
import {PerformingEndGameState} from "./States/PerformingEndGameState";
import {PersistingGameState} from "./States/PersistingGameState";
import {ReconnectionRequestSystem} from "../ecs/systems/network/ReconnectionRequestSystem";
import {ConnectionRequestSystem} from "../ecs/systems/network/ConnectionRequestSystem";
import {PlayerControllerComponent} from "../ecs/components/player/PlayerControllerComponent";
import {ControlledByComponent} from "../ecs/components/pawn/ControlledByComponent";
import {ControllingComponent} from "../ecs/components/player/ControllingComponent";
import {PlayerActionSystem} from "../ecs/systems/player/PlayerActionSystem";
import {ConnectionEventSystem} from "./events/ConnectionEventSystem";
import {ActionEventSystem} from "./events/ActionEventSystem";

export interface PlayerMetadata {
    uuid: string;
    username: string;
}

export interface SessionRequestData {
    playersMetadata: PlayerMetadata[];
    gameMode: string;
    modeType: string;
}

export class Arena {

    private readonly gameEngine: GameEngine;

    constructor(eventSystem: TypedEventEmitter) {
        this.gameEngine = new GameEngine(eventSystem);
        this.initializeUpdatePipeline();

        // Listen for gridPoolRefilled event to start the game
        this.gameEngine.eventSystem.subscribeGeneric('gridPoolRefilled', () => {
           this.gameEngine.start();
        });
    }

    private initializeUpdatePipeline(): void { // Main Pipeline

        this.gameEngine.systemManager.registerSystemOutOfPipe(new ConnectionEventSystem());
        this.gameEngine.systemManager.registerSystemOutOfPipe(new ActionEventSystem());
        this.gameEngine.systemManager.registerSystemOutOfPipe(new PlayerCommunicationSystem(this.gameEngine.engineClock));                                                                              // Player comm.      <-
      //  this.gameEngine.systemManager.registerSystem(new ConnectionEventSystem());      // Connection        <-
      //  this.gameEngine.systemManager.startSubPipeline();                               // Sub-pipeline
      //  this.gameEngine.systemManager.registerSystem(new ReconnectionRequestSystem());  // -> Reconnection -> Missed messages
      //  this.gameEngine.systemManager.endSubPipeline();                                 // End sub-pipeline
      //   this.gameEngine.systemManager.registerSystem(new PlayerActionSystem());         // Player input      <-
        this.gameEngine.systemManager.registerSystem(new StateMachineSystem());         // State machine     <-
        this.gameEngine.systemManager.registerSystem(new GridPoolSystem());             // Grid pool         <-
    }

    public stop(): void {
        this.gameEngine.stop();
    }

    // API to create a new game
    public createMatch(playersMetadata: PlayerMetadata[], gameMode: GameMode, modeType: ModeType): string {
        const gameEntity = this.createGameEntity();
        const playerEntities = this.createPlayerEntities(playersMetadata);
       // const pawnEntities = this.createPawnEntities(playerEntities.length);

        // // Link player entity to pawn entity
        // playerEntities.forEach((playerEntity, index) => {
        //
        //     // Pawn controlled by Player
        //     const controlledByComponent = new ControlledByComponent();
        //     controlledByComponent.entityId = playerEntity;
        //     this.gameEngine.ecManager.addComponent(pawnEntities[index], ControlledByComponent, controlledByComponent);
        //
        //     // Player controlling Pawn
        //     const controllingComponent = new ControllingComponent();
        //     controllingComponent.entityId = pawnEntities[index];
        //     this.gameEngine.ecManager.addComponent(playerEntity, ControllingComponent, controllingComponent);
        // });

        // Put player entities under game entity
        playerEntities.forEach(playerEntity => {
            this.gameEngine.ecManager.setParent(playerEntity, gameEntity);
        });

        // Attach a grid component to the game
        const gridComponent = this.getGridFromPool();
        this.gameEngine.ecManager.addComponent(gameEntity, GridComponent, gridComponent);

        return gameEntity.toString();
    }

    private getGridFromPool() {
        const globalEntity = this.gameEngine.ecManager.getEntitiesWithComponent(GlobalComponent)[0];
        const gridPoolComponent = this.gameEngine.ecManager.getComponent(globalEntity, GridPoolComponent);
        const gridComponent = gridPoolComponent.gridPool.pop();
        if (!gridComponent) {
            throw new Error("Grid pool is empty");
        }
        return gridComponent;
    }

    private createGameEntity() {
        const gameEntity = this.gameEngine.ecManager.createEntity();

        // State machine component
        const waitingState = new WaitingForPlayersState();
        const infoDispatchState = new InfoDispatchState();
        const countdownState = new CountdownState();
        const inProgressState = new InProgressState();
        const performEndGame = new PerformingEndGameState();
        const persistingGame = new PersistingGameState();
        const finishedState = new FinishedState();
        const stateMachineComponent = new StateMachineComponent(waitingState);

        stateMachineComponent.addTransition(waitingState, infoDispatchState, (gameEntity: number) => {
            return this.gameEngine.ecManager
                .queryEntities()
                .withParent(gameEntity)
                .withComponent(PlayerIdentityComponent)
                .execute()
                .map(playerEntity => this.gameEngine.ecManager.getComponent(playerEntity, PlayerConnectionComponent))
                .every(playerConnectionComponent => playerConnectionComponent.socket !== undefined);
        });
        stateMachineComponent.addTransition(infoDispatchState, countdownState, (gameEntity: number) => {
            return this.gameEngine.ecManager.hasTag(gameEntity, 201);
        });
        stateMachineComponent.addTransition(countdownState, inProgressState, (gameEntity: number) => {
            return this.gameEngine.ecManager.getComponent(gameEntity, TimerComponent)?.isActive === false;
        });
        stateMachineComponent.addTransition(inProgressState, performEndGame, (gameEntity: number) => {
            return this.gameEngine.ecManager.getComponent(gameEntity, TimerComponent)?.isActive === false;
        });
        stateMachineComponent.addTransition(performEndGame, persistingGame, (gameEntity: number) => {
            return this.gameEngine.ecManager.hasTag(gameEntity, 202);
        });
        stateMachineComponent.addTransition(persistingGame, finishedState, (gameEntity: number) => {
            return this.gameEngine.ecManager.hasTag(gameEntity, 203);
        });

        this.gameEngine.ecManager.addComponent(gameEntity, StateMachineComponent, stateMachineComponent);

        return gameEntity;
    }

    private createPlayerEntities(playersMetadata: PlayerMetadata[]) {
        return playersMetadata.map(playerMetadata => {
            const playerEntity = this.gameEngine.ecManager.createEntity();

            // Player identity component
            this.gameEngine.ecManager.addComponent(
                playerEntity,
                PlayerIdentityComponent,
                new PlayerIdentityComponent(playerMetadata.uuid, playerMetadata.username)
            );

            // Player connection component
            this.gameEngine.ecManager.addComponent(
                playerEntity,
                PlayerConnectionComponent,
                new PlayerConnectionComponent()
            );

            // Score component
            this.gameEngine.ecManager.addComponent(playerEntity, ScoreComponent, new ScoreComponent());

            // // Pawn controlling component
            // this.gameEngine.ecManager.addComponent(
            //     playerEntity,
            //     ControllingComponent,
            //     new ControllingComponent()
            // );

            // // Player controller component
            // const playerControllerComponent = new PlayerControllerComponent();
            // this.gameEngine.ecManager.addComponent(
            //     playerEntity,
            //     PlayerControllerComponent,
            //     playerControllerComponent
            // );
            //
            return playerEntity;
        });
    }

    createPawnEntities(count: number): number[] {
        const pawnEntities = [];
        for (let i = 0; i < count; i++) {
            const pawnEntity = this.gameEngine.ecManager.createEntity();
            this.gameEngine.ecManager.addComponent(pawnEntity, ControlledByComponent, new ControlledByComponent());
            this.gameEngine.ecManager.addComponent(pawnEntity, ScoreComponent, new ScoreComponent());
            pawnEntities.push(pawnEntity);
        }
        return pawnEntities;
    }


}
