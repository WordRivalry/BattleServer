// FinishedState.ts
import {State} from "../../ecs/components/StateMachine/State";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";

export class FinishedState extends State {
    enter(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        // No need to do anything here
    }
    update(deltaTime: number, entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
    }
    exit(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        // Cleanup or prepare for the next state
    }
}