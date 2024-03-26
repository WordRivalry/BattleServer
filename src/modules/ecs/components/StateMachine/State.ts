// State.ts
import {ECManager} from "../../ECManager";
import {TypedEventEmitter} from "../../TypedEventEmitter";

export type StateType<T extends State = State> = new (...args: any[]) => T;

export abstract class State {
    abstract enter(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter): void;

    abstract update(deltaTime: number, entity: number, ecsManager: ECManager, eventSystem: TypedEventEmitter): void;

    abstract exit(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter): void;
}