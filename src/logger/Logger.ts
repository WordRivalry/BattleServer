// scopedLogger.js
import { Logger } from "./winston"; // Adjust the import path as needed

export class ScopedLogger {
    constructor(private readonly scope: string) {}

    debug(message: string): void {
        Logger.debug(this.#format(message));
    }

    info(message: string): void {
        Logger.info(this.#format(message));
    }

    warn(message: string): void {
        Logger.warn(this.#format(message));
    }

    http(message: string): void {
        Logger.http(this.#format(message));
    }

    error(message: string, error?: unknown): void {
        Logger.error(this.#format(message), error);
    }

    fatal(message: string, error?: unknown): void {
        Logger.error(this.#format(message), error);
    }

    #format(message: string): string {
        const fixedWidthScope = this.#padScope(this.scope, 20); // Adjust width as needed
        return `[${fixedWidthScope}] - ${message}`;
    }

    #padScope(scope: string, width: number): string {
        // Abbreviate if length exceeds the width
        if (scope.length > width) {
            // cut short the end with a ...
            scope = scope.slice(0, width - 1) + ".";
        }

        // Right-align and ensure fixed width
        return scope.padStart(width, " ").slice(-width);
    }
}

export const createScopedLogger = (scope: string): ScopedLogger => new ScopedLogger(scope);