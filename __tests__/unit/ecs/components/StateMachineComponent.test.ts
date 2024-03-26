// StateMachineComponent.test.ts
import {State} from "../../../../src/modules/ecs/components/StateMachine/State";
import {
    StateMachineComponent, StateTransitionCondition
} from "../../../../src/modules/ecs/components/StateMachine/StateMachineComponent";
import {ECManager} from "../../../../src/modules/ecs/ECManager";
import {EntityManager} from "../../../../src/modules/ecs/entities/EntityManager";
import {ComponentManager} from "../../../../src/modules/ecs/components/ComponentManager";

abstract class MockState extends State {
    public name: string;
    constructor(name: string) {
        super();
        this.name = name;
    }

    enter = jest.fn();
    update = jest.fn();
    exit = jest.fn();
}

class InitialState extends MockState {}
class NextState extends MockState {}
class AnotherState extends MockState {}
class YetAnotherState extends MockState {}
class FinalState extends MockState {}

const alwaysTrueCondition = jest.fn().mockReturnValue(true);
const alwaysFalseCondition = jest.fn().mockReturnValue(false);

describe('StateMachineComponent', () => {
    let initialState: InitialState;
    let nextState: NextState;
    let anotherState: AnotherState;
    let stateMachine: StateMachineComponent;
    let ecManager: ECManager;
    let entity = 0;

    beforeEach(() => {
        initialState = new InitialState('Initial');
        nextState = new NextState('Next');
        anotherState = new AnotherState('Another');
        stateMachine = new StateMachineComponent(InitialState, initialState);
        ecManager = new ECManager(new EntityManager(), new ComponentManager());
    });


    describe('Constructor & Initial State', () => {
        it('should initialize with the provided initial state', () => {
            const gameStateComponent = new StateMachineComponent(InitialState, initialState);
            expect(gameStateComponent.currentState).toBe(initialState);
        });
    });

    test('correctly adds and retrieves transitions', () => {
        stateMachine.addTransition(InitialState, NextState, nextState, alwaysTrueCondition);

        const transitions = stateMachine.getTransitions();
        expect(transitions.get(InitialState)).toEqual([
            { nextState: nextState, nextStateType: NextState, condition: alwaysTrueCondition }
        ]);
    });

    test('supports multiple transitions for the same state', () => {
        stateMachine.addTransition(InitialState, NextState, nextState, alwaysTrueCondition);
        stateMachine.addTransition(InitialState, AnotherState, anotherState, alwaysFalseCondition);

        const transitions = stateMachine.getTransitions();
        expect(transitions.get(InitialState)).toHaveLength(2);
        expect(transitions.get(InitialState)).toContainEqual({ nextState: nextState, nextStateType: NextState, condition: alwaysTrueCondition });
        expect(transitions.get(InitialState)).toContainEqual({ nextState: anotherState, nextStateType: AnotherState, condition: alwaysFalseCondition });
    });

    test('transitions to the correct next state based on condition', () => {
        stateMachine.addTransition(InitialState, NextState, nextState, alwaysTrueCondition);
        stateMachine.addTransition(InitialState, AnotherState, anotherState, alwaysFalseCondition);

        // Simulate the condition checking process (normally handled by StateMachineSystem)
        const transitions = stateMachine.getTransitions().get(stateMachine.currentStateType);
        if (transitions) {
            for (const {nextState, nextStateType, condition} of transitions) {
                if (condition(entity, ecManager)) { // Assuming '0' is a placeholder entity ID
                    stateMachine.currentState = nextState;
                    break;
                }
            }
        }

        expect(stateMachine.currentState).toBe(nextState);
    });

    test('does not transition if no conditions are met', () => {
        stateMachine.addTransition(InitialState, NextState, nextState, alwaysFalseCondition);
        stateMachine.addTransition(InitialState, AnotherState, anotherState, alwaysFalseCondition);

        // Simulate the condition checking process
        const transitions = stateMachine.getTransitions().get(stateMachine.currentStateType);
        if (transitions) {
            for (const {nextState, condition} of transitions) {
                if (condition(entity, ecManager)) {
                    stateMachine.currentState = nextState;
                    break;
                }
            }
        }

        expect(stateMachine.currentState).toBe(initialState);
    });

    describe('Transition Management', () => {
        it('should allow adding transitions and retrieve them correctly', () => {
            const condition: StateTransitionCondition = (entity) => true; // Simplified condition for testing
            stateMachine.addTransition(InitialState, NextState, nextState, condition);

            const transitions = stateMachine.getTransitions();
            expect(transitions.has(InitialState)).toBeTruthy();
            expect(transitions.get(InitialState)).toEqual([{
                nextState: nextState,
                nextStateType: NextState,
                condition: condition
            }]);
        });

        it('should handle multiple transitions for the same state', () => {
            const conditionA: StateTransitionCondition = (entity: number) => true;
            const conditionB: StateTransitionCondition = (entity: number) => false;
            const anotherState: State = {
                enter: jest.fn(),
                update: jest.fn(),
                exit: jest.fn(),
            };

            stateMachine.addTransition(InitialState, NextState, nextState, conditionA);
            stateMachine.addTransition(InitialState, AnotherState, anotherState, conditionB);

            const transitions = stateMachine.getTransitions();
            expect(transitions.get(InitialState)).toContainEqual({
                nextState: nextState,
                nextStateType: NextState,
                condition: conditionA
            });
            expect(transitions.get(InitialState)).toContainEqual({
                nextState: anotherState,
                nextStateType: AnotherState,
                condition: conditionB
            });
        });
    });

    describe('State Transition Logic', () => {
        it('should not transition if no condition is met', () => {
            const falseCondition: StateTransitionCondition = (entity) => false;
            stateMachine.addTransition(InitialState, NextState, nextState, falseCondition);

            // Simulate a game loop tick where transitions might be checked
            // Normally, you might have a method to evaluate transitions which would be called here.
            // For simplicity, we'll just manually invoke the condition.
            const transitions = stateMachine.getTransitions();
            const applicableTransitions = transitions.get(InitialState) || [];
            const transitionOccurred = applicableTransitions.some(transition => {
                if (transition.condition(entity, ecManager)) {
                    stateMachine.currentState = transition.nextState;
                    return true;
                }
                return false;
            });

            expect(transitionOccurred).toBeFalsy();
            expect(stateMachine.currentState).toBe(initialState);
        });

        it('should transition to the next state when a condition is met', () => {
            const trueCondition: StateTransitionCondition = (entity) => true;
            stateMachine.addTransition(InitialState, NextState, nextState, trueCondition);

            // Simulating a condition check as in a game loop tick
            const transitions = stateMachine.getTransitions();
            const applicableTransitions = transitions.get(InitialState) || [];
            applicableTransitions.some(transition => {
                if (transition.condition(entity, ecManager)) {
                    stateMachine.currentState = transition.nextState;
                    return true;
                }
                return false;
            });

            expect(stateMachine.currentState).toBe(nextState);
        });
    });
});