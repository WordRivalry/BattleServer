// StateMachineSystem.ts
import {System} from "./System";
import {TypedEventEmitter} from "./TypedEventEmitter";
import {StateMachineComponent} from "../components/StateMachine/StateMachineComponent";
import {ECManager} from "../ECManager";

export class StateMachineSystem extends System {
    requiredComponents: any[] = [StateMachineComponent];
    update(deltaTime: number, entities: number[], ecManager: ECManager, eventSystem: TypedEventEmitter): void {
        entities.forEach(entity => {
            const stateMachineComponent = ecManager.getComponent(entity, StateMachineComponent);

            if (stateMachineComponent) {
                const transitions = stateMachineComponent.getTransitions().get(stateMachineComponent.currentState);
                if (transitions) {
                    for (const {nextState, condition} of transitions) {
                        if (condition(entity)) {
                            stateMachineComponent.currentState.exit(entity, ecManager, eventSystem);
                            stateMachineComponent.currentState = nextState;
                            stateMachineComponent.currentState.enter(entity, ecManager, eventSystem);
                            break; // Break after the first successful transition
                        }
                    }
                }

                // Continue with the current state's update
                stateMachineComponent.currentState.update(deltaTime, entity, ecManager, eventSystem);
            }
        });
    }
}
