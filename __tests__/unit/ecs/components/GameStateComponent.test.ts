import {IState} from "../../../../src/modules/gameEngine/ecs/components/StateMachine/IState";

import {
    StateMachineComponent,
    StateTransitionCondition
} from "../../../../src/modules/gameEngine/ecs/components/StateMachine/StateMachineComponent";


describe('GameStateComponent', () => {
    let initialState: IState;
    let nextState: IState;
    let entity: number;

    beforeEach(() => {
        initialState = {
            enter: jest.fn(),
            update: jest.fn(),
            exit: jest.fn(),
        };
        nextState = {
            enter: jest.fn(),
            update: jest.fn(),
            exit: jest.fn(),
        };
        entity = 0;
    });

    describe('Constructor & Initial State', () => {
        it('should initialize with the provided initial state', () => {
            const gameStateComponent = new StateMachineComponent(initialState);
            expect(gameStateComponent.currentState).toBe(initialState);
        });
    });

    describe('Transition Management', () => {
        it('should allow adding transitions and retrieve them correctly', () => {
            const condition: StateTransitionCondition = (entity) => true; // Simplified condition for testing
            const gameStateComponent = new StateMachineComponent(initialState);
            gameStateComponent.addTransition(initialState, nextState, condition);

            const transitions = gameStateComponent.getTransitions();
            expect(transitions.has(initialState)).toBeTruthy();
            expect(transitions.get(initialState)).toEqual([{ nextState, condition }]);
        });

        it('should handle multiple transitions for the same state', () => {
            const conditionA: StateTransitionCondition = (entity) => true;
            const conditionB: StateTransitionCondition = (entity) => false;
            const anotherState: IState = {
                enter: jest.fn(),
                update: jest.fn(),
                exit: jest.fn(),
            };

            const gameStateComponent = new StateMachineComponent(initialState);
            gameStateComponent.addTransition(initialState, nextState, conditionA);
            gameStateComponent.addTransition(initialState, anotherState, conditionB);

            const transitions = gameStateComponent.getTransitions();
            expect(transitions.get(initialState)).toContainEqual({ nextState, condition: conditionA });
            expect(transitions.get(initialState)).toContainEqual({ nextState: anotherState, condition: conditionB });
        });
    });

    describe('State Transition Logic', () => {
        it('should not transition if no condition is met', () => {
            const falseCondition: StateTransitionCondition = (entity) => false;
            const gameStateComponent = new StateMachineComponent(initialState);
            gameStateComponent.addTransition(initialState, nextState, falseCondition);

            // Simulate a game loop tick where transitions might be checked
            // Normally, you might have a method to evaluate transitions which would be called here.
            // For simplicity, we'll just manually invoke the condition.
            const transitions = gameStateComponent.getTransitions();
            const applicableTransitions = transitions.get(initialState) || [];
            const transitionOccurred = applicableTransitions.some(transition => {
                if (transition.condition(entity)) {
                    gameStateComponent.currentState = transition.nextState;
                    return true;
                }
                return false;
            });

            expect(transitionOccurred).toBeFalsy();
            expect(gameStateComponent.currentState).toBe(initialState);
        });

        it('should transition to the next state when a condition is met', () => {
            const trueCondition: StateTransitionCondition = (entity) => true;
            const gameStateComponent = new StateMachineComponent(initialState);
            gameStateComponent.addTransition(initialState, nextState, trueCondition);

            // Simulating a condition check as in a game loop tick
            const transitions = gameStateComponent.getTransitions();
            const applicableTransitions = transitions.get(initialState) || [];
            applicableTransitions.some(transition => {
                if (transition.condition(entity)) {
                    gameStateComponent.currentState = transition.nextState;
                    return true;
                }
                return false;
            });

            expect(gameStateComponent.currentState).toBe(nextState);
        });
    });

    // Additional tests can be added to cover more complex scenarios, including multiple entity instances,
    // transitions with overlapping conditions, and transitions that should not occur due to specific game logic.
});
