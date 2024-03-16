// PersistingGameState.ts
import {IState} from "../../ecs/components/StateMachine/IState";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";

export class PersistingGameState implements IState {
    enter(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        // No need to do anything here
    }
    update(deltaTime: number, entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
    }
    exit(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        // Cleanup or prepare for the next state
    }
}