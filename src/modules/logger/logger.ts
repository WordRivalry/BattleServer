import LoggerFactory from './winston';

class ScopedLogger {
    private readonly baseScope: string;
    private logger: any;

    constructor(scope: string) {
        this.baseScope = scope;
        this.logger = LoggerFactory.createLogger(scope);
    }

    // Method to dynamically adjust the scope/context
    context(context: string) {
        const newScope = `${this.baseScope}:${context}`;
        return {
            debug: (message: string, meta = {}) => this.logger.debug({ message, scope: newScope, ...meta }),
            info: (message: string, meta = {}) => this.logger.info({ message, scope: newScope, ...meta }),
            warn: (message: string, meta = {}) => this.logger.warn({ message, scope: newScope, ...meta }),
            error: (message: string, error?: any, meta = {}) => {
                let errorMeta = {};
                if (error && error instanceof Error) {
                    errorMeta = { error: { message: error.message, stack: error.stack } };
                }
                this.logger.error({ message, scope: newScope, ...meta, ...errorMeta });
            },
        };
    }

    debug(message: string, meta = {}): void {
        this.logger.debug({ message, scope: this.baseScope, ...meta });
    }

    info(message: string, meta = {}): void {
        this.logger.info({ message, scope: this.baseScope, ...meta });
    }

    warn(message: string, meta = {}): void {
        this.logger.warn({ message, scope: this.baseScope, ...meta });
    }

    http(message: string, meta = {}): void {
        this.logger.http({ message, scope: this.baseScope, ...meta });
    }

    error(message: string, error?: any, meta = {}): void {
        let errorMeta = {};
        if (error && error instanceof Error) {
            errorMeta = { error: { message: error.message, stack: error.stack } };
        }

        this.logger.error({ message, scope: this.baseScope, ...meta, ...errorMeta });
    }

    fatal(message: string, error?: Error, meta = {}): void {
        const errorMeta = error ? { error: { message: error.message, stack: error.stack } } : {};
        this.logger.error({ message, scope: this.baseScope, ...meta, ...errorMeta });
    }
}

export const createScopedLogger = (scope: string): ScopedLogger => new ScopedLogger(scope);
