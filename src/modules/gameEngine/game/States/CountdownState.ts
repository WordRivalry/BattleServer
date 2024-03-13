// CountdownState.ts
import {IState} from "../../ecs/components/StateMachine/IState";
import {ECManager} from "../../ecs/ECManager";
import {TimerComponent} from "../../ecs/components/TimerComponent";
import {TypedEventEmitter} from "../../ecs/systems/TypedEventEmitter";

export class CountdownState implements IState {
    enter(gameEntity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        // Set timer
        const timerComponent = new TimerComponent(3000, false);
        ecManager.addComponent(gameEntity, TimerComponent, timerComponent);
    }
    update(deltaTime: number, entity: number, ecManager: ECManager) {
    }

    exit(gameEntity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        // Cleanup
        ecManager.removeComponent(gameEntity, TimerComponent);
    }
}