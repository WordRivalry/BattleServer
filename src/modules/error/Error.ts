import Joi from "joi";
import {createScopedLogger} from "../logger/logger";
import { WebSocket } from 'ws';

export class ErrorHandlingService {

    static logger = createScopedLogger('ErrorHandlingService');

    static sendError(ws: WebSocket, error: any) {
        if (error instanceof Error) {
            ws.close(1008, JSON.stringify({ type: 'error', code: 1008, message: error.message }));
        } else if (error instanceof CustomError) {
            const message = error.toWebSocketMessage();
            ErrorHandlingService.logger.context(error.name).error(message, { error });
            ws.close(1008, message);
            return;
        } else {
            ws.close(1008, JSON.stringify({ type: 'error', code: 1008, message: 'Unknown error' }));
        }
    }
}


export class CustomError extends Error {
    public statusCode: number;
    public cause?: string;

    constructor(message: string, statusCode: number, cause?: string) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        this.cause = cause;
        Error.captureStackTrace(this, this.constructor);
    }

    public toWebSocketMessage() {
        return JSON.stringify(this.sanitizedData());
    }

    private sanitizedData() {
        return {
            type: this.name,
            statusCode: this.statusCode,
            message: this.message,
            cause: this.cause
        };
    }

    protected get errorType() {
        return 'Custom Error';
    }
}

export class UnknownPlayerError extends CustomError {
    constructor(cause?: string) {
        super('Unknown player', 1000, cause);
    }
}

export class UnknownGameSessionError extends CustomError {
    constructor(cause?: string) {
        super('Unknown game session', 1001, cause);
    }
}

export class InvalidJsonError extends CustomError {
    constructor(error?: any) {
        super(error?.message || 'Invalid JSON', 2000);
    }
}


// SESSION ERRORS

export class SessionError extends CustomError {

    constructor(message: string, statusCode: number, cause?: string) {
        super(message, statusCode, cause);
    }

    override get errorType() {
        return 'Session Error';
    }
}

export class SessionNotFoundError extends SessionError {
    constructor(cause?: string) {
        super('Session not found', 3000, cause);
    }
}

export class PlayerNotFoundError extends SessionError {
    constructor(cause?: string) {
        super('Player not found', 3001, cause);
    }
}

export class PlayerNotInSessionError extends SessionError {
    constructor(cause?: string) {
        super('Player not in session', 3002, cause);
    }
}

export class PlayerAlreadyInSessionError extends SessionError {
    constructor(cause?: string) {
        super('Player already in session', 3003, cause);
    }
}

export class SessionInProgressError extends SessionError {
    constructor(cause?: string) {
        super('Session in progress', 3004, cause);
    }
}

export class SessionNotInProgressError extends SessionError {
    constructor(cause?: string) {
        super('Session not in progress', 3005, cause);
    }
}

export class SessionFullError extends SessionError {
    constructor(cause?: string) {
        super('Session full', 3006, cause);
    }
}

export class SessionAlreadyExistsError extends SessionError {
    constructor(cause?: string) {
        super('Session already exists', 3007, cause);
    }
}

export class SessionNotReadyError extends SessionError {
    constructor(cause?: string) {
        super('Session not ready', 3008, cause);
    }
}

export class SessionNotEndedError extends SessionError {
    constructor(cause?: string) {
        super('Session not ended', 3009, cause);
    }
}

export class SessionEndedError extends SessionError {
    constructor(cause?: string) {
        super('Session ended', 3010, cause);
    }
}

export class BadSessionRequestError extends SessionError {
    constructor(cause?: string) {
        super('Bad session request', 3011, cause);
    }
}

export class NoConnectionTimeoutError extends SessionError {
    constructor(cause?: string) {
        super('No connection timeout', 3011, cause);
    }
}

export class NoLastSeenError extends SessionError {
    constructor(cause?: string) {
        super('No last seen', 3012, cause);
    }
}

// VALIDATION ERRORS

export class ValidationError extends CustomError {
    constructor(message: string, statusCode: number, cause?: string) {
        super(message, statusCode, cause);
    }
}

export class ValidationFailedError extends ValidationError {
    constructor() {
        super('Validation failed', 2000);
    }
}

export class InvalidActionFormatError extends ValidationError {
    constructor(error: Joi.ValidationError) {
        super(error.message, 2001);
    }
}

export class InvalidJoinGameSessionActionError extends ValidationError {
    constructor(error: Joi.ValidationError) {
        super(error.message, 2002);
    }
}

export class InvalidLeaveGameSessionActionError extends ValidationError {
    constructor(error: Joi.ValidationError) {
        super(error.message, 2003);
    }
}

export class InvalidPlayerActionError extends ValidationError {
    constructor(error: Joi.ValidationError) {
        super(error.message, 2004);
    }
}

export class InvalidPlayerAction_PublishWordError extends ValidationError {
    constructor(error: Joi.ValidationError) {
        super(error.message, 2005);
    }
}

export class InvalidPlayerAction_SendChatMessageError extends ValidationError {
    constructor(error: Joi.ValidationError) {
        super(error.message, 2006);
    }
}