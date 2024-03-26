// Command.ts
import {ECManager} from "../ECManager";

export type CommandType<T extends Command = Command> = new (...args: any[]) => T;

export abstract class Command {
    abstract execute(ecManager: ECManager): void;
}
