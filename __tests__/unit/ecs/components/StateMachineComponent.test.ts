// StateMachineComponent.test.ts
import {IState} from "../../../../src/modules/ecs/components/StateMachine/IState";
import {
    StateMachineComponent
} from "../../../../src/modules/ecs/components/StateMachine/StateMachineComponent";

class MockState implements IState {
    enter = jest.fn();
    update = jest.fn();
    exit = jest.fn();
}

const alwaysTrueCondition = jest.fn().mockReturnValue(true);
const alwaysFalseCondition = jest.fn().mockReturnValue(false);

describe('StateMachineComponent', () => {
    let initialState: MockState;
    let nextState: MockState;
    let anotherState: MockState;
    let stateMachine: StateMachineComponent;

    beforeEach(() => {
        initialState = new MockState();
        nextState = new MockState();
        anotherState = new MockState();
        stateMachine = new StateMachineComponent(initialState);
    });

    test('correctly adds and retrieves transitions', () => {
        stateMachine.addTransition(initialState, nextState, alwaysTrueCondition);

        const transitions = stateMachine.getTransitions();
        expect(transitions.get(initialState)).toEqual([
            { nextState: nextState, condition: alwaysTrueCondition }
        ]);
    });

    test('supports multiple transitions for the same state', () => {
        stateMachine.addTransition(initialState, nextState, alwaysTrueCondition);
        stateMachine.addTransition(initialState, anotherState, alwaysFalseCondition);

        const transitions = stateMachine.getTransitions();
        expect(transitions.get(initialState)).toHaveLength(2);
        expect(transitions.get(initialState)).toContainEqual({ nextState: nextState, condition: alwaysTrueCondition });
        expect(transitions.get(initialState)).toContainEqual({ nextState: anotherState, condition: alwaysFalseCondition });
    });

    test('transitions to the correct next state based on condition', () => {
        stateMachine.addTransition(initialState, nextState, alwaysTrueCondition);
        stateMachine.addTransition(initialState, anotherState, alwaysFalseCondition);

        // Simulate the condition checking process (normally handled by StateMachineSystem)
        const transitions = stateMachine.getTransitions().get(stateMachine.currentState);
        if (transitions) {
            for (const {nextState, condition} of transitions) {
                if (condition(0)) { // Assuming '0' is a placeholder entity ID
                    stateMachine.currentState = nextState;
                    break;
                }
            }
        }

        expect(stateMachine.currentState).toBe(nextState);
    });

    test('does not transition if no conditions are met', () => {
        stateMachine.addTransition(initialState, nextState, alwaysFalseCondition);
        stateMachine.addTransition(initialState, anotherState, alwaysFalseCondition);

        // Simulate the condition checking process
        const transitions = stateMachine.getTransitions().get(stateMachine.currentState);
        if (transitions) {
            for (const {nextState, condition} of transitions) {
                if (condition(0)) { // Assuming '0' is a placeholder entity ID
                    stateMachine.currentState = nextState;
                    break;
                }
            }
        }

        expect(stateMachine.currentState).toBe(initialState);
    });
});