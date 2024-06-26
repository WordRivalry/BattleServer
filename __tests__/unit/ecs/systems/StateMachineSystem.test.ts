// StateMachineSystem.test.ts
import {State} from "../../../../src/modules/ecs/components/StateMachine/State";
import {
    StateMachineComponent
} from "../../../../src/modules/ecs/components/StateMachine/StateMachineComponent";
import {ECManager} from "../../../../src/modules/ecs/ECManager";
import {EntityManager} from "../../../../src/modules/ecs/entities/EntityManager";
import {ComponentManager} from "../../../../src/modules/ecs/components/ComponentManager";
import {StateMachineSystem} from "../../../../src/modules/ecs/systems/fsm/StateMachineSystem";
import {TypedEventEmitter} from "../../../../src/modules/ecs/TypedEventEmitter";

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

const conditionTrue = jest.fn().mockReturnValue(true);
const conditionFalse = jest.fn().mockReturnValue(false);

describe('StateMachineComponent Transitions', () => {
    let stateMachine: StateMachineComponent;
    let initialState: InitialState;
    let nextState: NextState;
    let anotherState: AnotherState;
    let yetAnotherState: YetAnotherState;
    let finalState: FinalState;
    let ecManager: ECManager;
    let entity: number;

    beforeEach(() => {
        initialState = new InitialState('Initial');
        nextState = new NextState('Next');
        anotherState = new AnotherState('Another');
        yetAnotherState = new YetAnotherState('YetAnother');
        finalState = new FinalState('Final');
        stateMachine = new StateMachineComponent(InitialState, initialState);
        ecManager = new ECManager(new EntityManager(), new ComponentManager());
        entity = ecManager.createEntity();
        ecManager.addComponent(entity, StateMachineComponent, stateMachine);
    });

    test('transitions to the next state on condition', () => {
        stateMachine.addTransition(InitialState, NextState, nextState, conditionTrue);

        // Simulate update cycle where transition condition is met
        const stateMachineSystem = new StateMachineSystem();
        const eventSystem = new TypedEventEmitter();
        stateMachineSystem.update(0, [entity], ecManager, eventSystem);

        expect(initialState.exit).toHaveBeenCalledWith(entity, ecManager, eventSystem);
        expect(nextState.enter).toHaveBeenCalledWith(entity, ecManager, eventSystem);
        expect(stateMachine.currentState).toBe(nextState);
    });

    test('stays in the current state when condition is not met', () => {
        stateMachine.addTransition(InitialState, NextState, nextState, conditionFalse);

        // Simulate update cycle where transition condition is not met
        const stateMachineSystem = new StateMachineSystem();
        stateMachineSystem.update(0, [entity], ecManager, new TypedEventEmitter());

        expect(initialState.exit).not.toHaveBeenCalled();
        expect(nextState.enter).not.toHaveBeenCalled();
        expect(stateMachine.currentState).toBe(initialState);
    });

    test('current state update is called during system update', () => {
        stateMachine.addTransition(InitialState, NextState, nextState, conditionFalse); // Condition that prevents transition

        // Simulate update cycle
        const stateMachineSystem = new StateMachineSystem();
        const eventSystem = new TypedEventEmitter();
        stateMachineSystem.update(0, [entity], ecManager, eventSystem);

        expect(initialState.update).toHaveBeenCalledWith(0, entity, ecManager, eventSystem);
    });

    test('evaluates multiple transitions, executing only the first valid one', () => {
        stateMachine.addTransition(InitialState, NextState, nextState, conditionFalse);
        stateMachine.addTransition(InitialState, AnotherState, anotherState, conditionFalse);
        stateMachine.addTransition(InitialState, YetAnotherState, yetAnotherState, conditionTrue);

        const stateMachineSystem = new StateMachineSystem();
        const eventSystem = new TypedEventEmitter();
        stateMachineSystem.update(0, [entity], ecManager, eventSystem);

        expect(nextState.enter).not.toHaveBeenCalled();
        expect(initialState.exit).toHaveBeenCalled();
        expect(yetAnotherState.enter).toHaveBeenCalledWith(entity, ecManager, eventSystem);
        expect(stateMachine.currentState).toBe(yetAnotherState);
    });

    test('directTransition() work if target is already next state', () => {
        stateMachine.addTransition(InitialState, NextState, nextState, conditionFalse);
        stateMachine.addTransition(NextState, AnotherState, anotherState, conditionFalse);
        stateMachine.addTransition(AnotherState, YetAnotherState, yetAnotherState, conditionFalse);
        stateMachine.addTransition(YetAnotherState, FinalState, finalState, conditionFalse);

        stateMachine.directTransition(NextState);

        const stateMachineSystem = new StateMachineSystem();
        const eventSystem = new TypedEventEmitter();
        stateMachineSystem.update(0, [entity], ecManager, eventSystem);

        expect(initialState.exit).toHaveBeenCalled();
        expect(nextState.enter).toHaveBeenCalled();
        expect(anotherState.enter).not.toHaveBeenCalled();
        expect(yetAnotherState.enter).not.toHaveBeenCalled();
        expect(finalState.enter).not.toHaveBeenCalledWith(entity, ecManager, eventSystem);
        expect(stateMachine.currentState).toBe(nextState);
    });

    test('directTransition() links the current state to the target state, and perform transition on update', () => {
        stateMachine.addTransition(InitialState, NextState, nextState, conditionFalse);
        stateMachine.addTransition(NextState, AnotherState, anotherState, conditionFalse);
        stateMachine.addTransition(AnotherState, YetAnotherState, yetAnotherState, conditionFalse);
        stateMachine.addTransition(YetAnotherState, FinalState, finalState, conditionFalse);

        stateMachine.directTransition(FinalState);

        const stateMachineSystem = new StateMachineSystem();
        const eventSystem = new TypedEventEmitter();
        stateMachineSystem.update(0, [entity], ecManager, eventSystem);

        expect(initialState.exit).toHaveBeenCalled();
        expect(nextState.enter).not.toHaveBeenCalled();
        expect(anotherState.enter).not.toHaveBeenCalled();
        expect(yetAnotherState.enter).not.toHaveBeenCalled();
        expect(finalState.enter).toHaveBeenCalledWith(entity, ecManager, eventSystem);
        expect(stateMachine.currentState).toBe(finalState);
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
        stateMachine.addTransition(InitialState, NextState, nextState, conditionThrows);

        const stateMachineSystem = new StateMachineSystem();
        const eventSystem = new TypedEventEmitter();
        expect(() => {
            stateMachineSystem.update(0, [entity], ecManager, eventSystem);
        }).toThrow();

        expect(initialState.exit).not.toHaveBeenCalled();
        expect(nextState.enter).not.toHaveBeenCalled(); // Ensure no transition occurs on error
    });
});
