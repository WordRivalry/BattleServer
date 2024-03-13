// InProgressState.ts
import {IState} from "../../ecs/components/StateMachine/IState";
import {ECManager} from "../../ecs/ECManager";
import {TimerComponent} from "../../ecs/components/TimerComponent";

export class InProgressState implements IState {
    enter(gameEntity: number, ecManager: ECManager) {
        // This timer run the game for 10 seconds
        const timer = new TimerComponent(10000, false, () => {});
        ecManager.addComponent(gameEntity, TimerComponent, timer);
    }
    update(entity: number, ecManager: ECManager) {
    }
    exit(gameEntity: number, ecManager: ECManager) {
        // Cleanup
        ecManager.removeComponent(gameEntity, TimerComponent);
    }
}