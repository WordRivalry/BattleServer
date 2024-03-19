import {IdentityComponent} from "../ecs/components/player/IdentityComponent";
import {PlayerConnectionComponent} from "../ecs/components/player/PlayerConnectionComponent";
import {GridPoolSystem} from "../game/systems/GridPoolSystem";
import {GameMode, ModeType} from "../server_networking/validation/messageType";
import {ScoreComponent} from "../game/components/ScoreComponent";
import {GameEngine} from "../ecs/GameEngine";
import {GlobalComponent} from "../ecs/components/GlobalComponent";
import {GridPoolComponent} from "../game/components/game/GridPoolComponent";
import {GridComponent} from "../game/components/game/GridComponent";
import {TypedEventEmitter} from "../ecs/TypedEventEmitter";
import {StateMachineSystem} from "../ecs/systems/fsm/StateMachineSystem";
import {StateMachineComponent} from "../ecs/components/StateMachine/StateMachineComponent";
import {ControlledByComponent} from "../ecs/components/pawn/ControlledByComponent";
import {PlayerMetadata} from "./GameSessionManager";
import {PlayerActionSystem} from "../ecs/systems/player/PlayerActionSystem";
import {ComponentType} from "../ecs/components/ComponentManager";
import {Component} from "../ecs/components/Component";
import {SubmitWordCommandSystem} from "../game/systems/SubmitWordCommandSystem";

export enum ArenaEvent {
    GRID_POOL_REFILLED = 'GRID_POOL_REFILLED',
}

export class Arena {

    private readonly gameEngine: GameEngine;

    constructor(eventSystem: TypedEventEmitter) {
        this.gameEngine = new GameEngine(eventSystem);
        this.initializeUpdatePipeline();

        // Listen for gridPoolRefilled event to start the game
        this.gameEngine.eventSystem.subscribeGeneric(ArenaEvent.GRID_POOL_REFILLED, () => {
           this.gameEngine.start();
        });
    }

    get eventSystem(): TypedEventEmitter {
        return this.gameEngine.eventSystem;
    }

    public attachComponent<T extends Component>(entity: number, componentType: ComponentType<T>, component: T) {
        this.gameEngine.ecManager.addComponent(entity, componentType, component);
    }

    public attachStates(gameEntity: number, stateMachineComponent: StateMachineComponent) {
        this.gameEngine.ecManager.addComponent(gameEntity, StateMachineComponent, stateMachineComponent);
    }

    public assignPlayerToGame(playerEntity: number, gameEntity: number) {
        this.gameEngine.ecManager.setParent(playerEntity, gameEntity);
    }

    private initializeUpdatePipeline(): void {

        this.gameEngine.systemManager.registerSystem(new SubmitWordCommandSystem());
                                                                                // Main Pipeline
        this.gameEngine.systemManager.registerSystem(new PlayerActionSystem()); // Player input      <-
        this.gameEngine.systemManager.registerSystem(new StateMachineSystem()); // State machine     <-
        this.gameEngine.systemManager.registerSystem(new GridPoolSystem());     // Grid pool         <-
    }

    public stop(): void {
        this.gameEngine.stop();
    }

    public createEntity(): number {
        return this.gameEngine.ecManager.createEntity();
    }

    public getPlayerEntity(gameEntity: number, name: string) {
        return this.gameEngine.ecManager
            .queryEntities()
            .withComponentCondition(IdentityComponent, (identityComponent) => identityComponent.identity === name)
            .withParent(gameEntity)
            .getOne();
    }
}
