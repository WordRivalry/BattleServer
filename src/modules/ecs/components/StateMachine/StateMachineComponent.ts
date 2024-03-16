// StateMachineComponent.ts
import {Component} from "../Component";
import {IState} from "./IState";

export type StateTransitionCondition = (entity: number) => boolean;

export class StateMachineComponent extends Component {
    public currentState: IState;
    private transitions: Map<IState, { nextState: IState, condition: StateTransitionCondition }[]> = new Map();

    constructor(initialState: IState) {
        super();
        this.currentState = initialState;
    }

    public addTransition(currentState: IState, nextState: IState, condition: StateTransitionCondition) {
        if (!this.transitions.has(currentState)) {
            this.transitions.set(currentState, []);
        }
        this.transitions.get(currentState)!.push({nextState, condition});
    }

    public getTransitions(): Map<IState, { nextState: IState, condition: StateTransitionCondition }[]> {
        return this.transitions;
    }
}
