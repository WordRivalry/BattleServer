// GameEventEmitter.ts

import {EventEmitter} from "events";

export enum GameEvent {
    PLAYER_ACTION = "PLAYER_ACTION",
    PLAYER_JOINED = "PLAYER_JOINED",
    PLAYER_LEFT = "PLAYER_LEFT",
    PLAYER_LOST_CONNECTION = "PLAYER_LOST_CONNECTION",
    GAME_END = "GAME_END",
}

export class GameEventEmitter extends EventEmitter {
    constructor(private sessionId: string) {
        super();
    }

    // Override the emit method to namespace the event name
    override emit(eventName: GameEvent, ...args: any[]): boolean {
        const scopedEventName = `${this.sessionId}:${eventName}`;
        return super.emit(scopedEventName, ...args);
    }

    // Override the on method to namespace the event name
    override on(eventName: GameEvent, listener: (...args: any[]) => void): this {
        const scopedEventName = `${this.sessionId}:${eventName}`;
        return super.on(scopedEventName, listener);
    }
}