// StateMachineSystem.ts
import {ISystem} from "./System";
import {TypedEventEmitter} from "./TypedEventEmitter";
import {StateMachineComponent} from "../components/StateMachine/StateMachineComponent";
import {ECManager} from "../ECManager";

export class StateMachineSystem implements ISystem {
    requiredComponents: any[] = [StateMachineComponent];
    update(deltaTime: number, entities: number[], ecManager: ECManager, eventSystem: TypedEventEmitter): void {
        entities.forEach(entity => {
            const gameStateComponent = ecManager.getComponent(entity, StateMachineComponent);

            if (gameStateComponent) {
                const transitions = gameStateComponent.getTransitions().get(gameStateComponent.currentState);
                if (transitions) {
                    for (const {nextState, condition} of transitions) {
                        if (condition(entity)) {
                            gameStateComponent.currentState.exit(entity, ecManager, eventSystem);
                            gameStateComponent.currentState = nextState;
                            gameStateComponent.currentState.enter(entity, ecManager, eventSystem);
                            break; // Break after the first successful transition
                        }
                    }
                }

                // Continue with the current state's update
                gameStateComponent.currentState.update(deltaTime, entity, ecManager);
            }
        });
    }
}
