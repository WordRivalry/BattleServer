// StateMachineSystem.test.ts
import {IState} from "../../../../src/modules/ecs/components/StateMachine/IState";
import {
    StateMachineComponent
} from "../../../../src/modules/ecs/components/StateMachine/StateMachineComponent";
import {ECManager} from "../../../../src/modules/ecs/ECManager";
import {EntityManager} from "../../../../src/modules/ecs/entities/EntityManager";
import {ComponentManager} from "../../../../src/modules/ecs/components/ComponentManager";
import {StateMachineSystem} from "../../../../src/modules/ecs/systems/fsm/StateMachineSystem";
import {TypedEventEmitter} from "../../../../src/modules/ecs/TypedEventEmitter";

class MockState implements IState {
    public name: string;
    constructor(name: string) {
        this.name = name;
    }

    enter = jest.fn();
    update = jest.fn();
    exit = jest.fn();
}

const conditionTrue = jest.fn().mockReturnValue(true);
const conditionFalse = jest.fn().mockReturnValue(false);

describe('StateMachineComponent Transitions', () => {
    let stateMachine: StateMachineComponent;
    let initialState: MockState;
    let nextState: MockState;
    let ecManager: ECManager;
    let entity: number;

    beforeEach(() => {
        initialState = new MockState('Initial');
        nextState = new MockState('Next');
        stateMachine = new StateMachineComponent(initialState);
        ecManager = new ECManager(new EntityManager(), new ComponentManager());
        entity = ecManager.createEntity();
        ecManager.addComponent(entity, StateMachineComponent, stateMachine);
    });

    test('transitions to the next state on condition', () => {
        stateMachine.addTransition(initialState, nextState, conditionTrue);

        // Simulate update cycle where transition condition is met
        const stateMachineSystem = new StateMachineSystem();
        const eventSystem = new TypedEventEmitter();
        stateMachineSystem.update(0, [entity], ecManager, eventSystem);

        expect(initialState.exit).toHaveBeenCalledWith(entity, ecManager, eventSystem);
        expect(nextState.enter).toHaveBeenCalledWith(entity, ecManager, eventSystem);
        expect(stateMachine.currentState).toBe(nextState);
    });

    test('stays in the current state when condition is not met', () => {
        stateMachine.addTransition(initialState, nextState, conditionFalse);

        // Simulate update cycle where transition condition is not met
        const stateMachineSystem = new StateMachineSystem();
        stateMachineSystem.update(0, [entity], ecManager, new TypedEventEmitter());

        expect(initialState.exit).not.toHaveBeenCalled();
        expect(nextState.enter).not.toHaveBeenCalled();
        expect(stateMachine.currentState).toBe(initialState);
    });

    test('current state update is called during system update', () => {
        stateMachine.addTransition(initialState, nextState, conditionFalse); // Condition that prevents transition

        // Simulate update cycle
        const stateMachineSystem = new StateMachineSystem();
        const eventSystem = new TypedEventEmitter();
        stateMachineSystem.update(0, [entity], ecManager, eventSystem);

        expect(initialState.update).toHaveBeenCalledWith(0, entity, ecManager, eventSystem);
    });

    test('evaluates multiple transitions, executing only the first valid one', () => {
        let anotherState = new MockState('Another');
        stateMachine.addTransition(initialState, nextState, conditionFalse); // This condition will not be met
        stateMachine.addTransition(initialState, anotherState, conditionTrue); // This condition will be met

        const stateMachineSystem = new StateMachineSystem();
        const eventSystem = new TypedEventEmitter();
        stateMachineSystem.update(0, [entity], ecManager, eventSystem);

        expect(nextState.enter).not.toHaveBeenCalled();
        expect(anotherState.enter).toHaveBeenCalledWith(entity, ecManager, eventSystem);
        expect(stateMachine.currentState).toBe(anotherState);
    });

    test('does nothing when no transitions are defined for the current state', () => {
        // No transitions added for initialState

        const stateMachineSystem = new StateMachineSystem();
        const eventSystem = new TypedEventEmitter();
        stateMachineSystem.update(0, [entity], ecManager, eventSystem);

        expect(initialState.exit).not.toHaveBeenCalled();
        expect(initialState.enter).not.toHaveBeenCalled();
        expect(initialState.update).toHaveBeenCalledWith(0, entity, ecManager, eventSystem); // Ensures current state is still updated
    });

    const conditionThrows = jest.fn().mockImplementation(() => { throw new Error("Error during condition"); });

    test('handles exceptions in transition conditions gracefully', () => {
        stateMachine.addTransition(initialState, nextState, conditionThrows);

        const stateMachineSystem = new StateMachineSystem();
        const eventSystem = new TypedEventEmitter();
        expect(() => {
            stateMachineSystem.update(0, [entity], ecManager, eventSystem);
        }).toThrow();

        expect(initialState.exit).not.toHaveBeenCalled();
        expect(nextState.enter).not.toHaveBeenCalled(); // Ensure no transition occurs on error
    });
});
