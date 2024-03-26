// StateMachineComponent.ts
import {Component} from "../Component";
import {State, StateType} from "./State";
import {ECManager} from "../../ECManager";
import {createScopedLogger} from "../../../logger/logger";

export type StateTransitionCondition = (entity: number, ecManager: ECManager) => boolean;

export class StateMachineComponent extends Component {
    public currentState: State;
    public currentStateType: StateType;
    private readonly transitions: Map<StateType, { nextState: State, nextStateType: StateType, condition: StateTransitionCondition }[]> = new Map();
    private readonly logger = createScopedLogger('StateMachineComponent')

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

        // Check if the target state is the same as the current state
        if (this.currentStateType === targetStateType) {
            this.logger.context('directTransition()').error(`Target state is the same as the current state`);
            return;
        }

        // Check if target is within the currentStateType transitions
        if (this.transitions.get(this.currentStateType)?.find(transition => transition.nextStateType === targetStateType)) {
            this.logger.context('directTransition()').debug(`Target state is already a transition from the current state`);
            let obj = this.transitions.get(this.currentStateType)?.find(transition => targetStateType === transition.nextStateType);

            // Modify the condition to return true
            obj!.condition = () => true;
            return;
        }

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
            this.logger.context('directTransition()').error(`Could not find target state instance for ${targetStateType}`);
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
