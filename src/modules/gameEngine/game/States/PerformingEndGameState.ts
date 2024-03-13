// PerformingEndGameState.ts
import {IState} from "../../ecs/components/StateMachine/IState";
import {ECManager} from "../../ecs/ECManager";

export class PerformingEndGameState implements IState {
    enter(gameEntity: number) {
        // No need to do anything here
    }
    update(entity: number, ecsManager: ECManager) {
    }
    exit(gameEntity: number) {
        // Cleanup or prepare for the next state
    }
}