// IState.ts
import {ECManager} from "../../ECManager";
import {TypedEventEmitter} from "../../systems/TypedEventEmitter";

export interface IState {
    enter(entity: number, ecsManager: ECManager, eventSystem: TypedEventEmitter): void;
    update(deltaTime: number, entity: number, ecsManager: ECManager, eventSystem: TypedEventEmitter): void;
    exit(entity: number, ecsManager: ECManager, eventSystem: TypedEventEmitter): void;
}