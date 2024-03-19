// StateMachineComponent.ts
import {Component} from "../Component";
import {State, StateType} from "./State";
import {ECManager} from "../../ECManager";

export type StateTransitionCondition = (entity: number, ecManager: ECManager) => boolean;

export class StateMachineComponent extends Component {
    public currentState: State;
    public currentStateType: StateType;
    private transitions: Map<StateType, { nextState: State, nextStateType: StateType, condition: StateTransitionCondition }[]> = new Map();

    constructor(initialStateType: StateType, initialState?: State) {
        super();
        this.currentState = initialState || new initialStateType();
        this.currentStateType = initialStateType;
    }

    public addTransition(currentState: StateType, nextStateType: StateType, nextState: State, condition: StateTransitionCondition) {
        if (!this.transitions.has(currentState)) {
            this.transitions.set(currentState, []);
        }
        this.transitions.get(currentState)!.push({nextState, nextStateType, condition});
    }

    public getTransitions(): Map<StateType, { nextState: State, nextStateType: StateType, condition: StateTransitionCondition }[]> {
        return this.transitions;
    }

    public directTransition(targetStateType: StateType) {
        // Clear all transitions from the current state
        this.transitions.set(this.currentStateType, []);

        // Get the existing instance of the target state from any transition in the map
        // This requires iterating over the transitions map to find the target state instance
        let targetStateInstance = null;
        for (let [_, transitions] of this.transitions) {
            for (let transition of transitions) {
                if (transition.nextStateType === targetStateType) {
                    targetStateInstance = transition.nextState;
                    break;
                }
            }
            if (targetStateInstance) break;
        }

        // Check if we found the target state instance
        if (!targetStateInstance) {
            console.error("Target state instance not found for direct transition.");
            return;
        }

        // Directly link the current state to the target state with a true condition
        this.transitions.get(this.currentStateType)?.push({
            nextState: targetStateInstance,
            nextStateType: targetStateType,
            condition: () => true,
        });
    }
}
