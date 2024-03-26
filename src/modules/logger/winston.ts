// LoggerFactory.js
import winston from 'winston';
import {LoggingWinston} from '@google-cloud/logging-winston';
import config from '../../../config'; // Adjust the import path as needed

class LoggerFactory {
    static loggers = new Map();

    static createLogger(name: string) {
        // Check if logger already exists
        if (this.loggers.has(name)) {
            return this.loggers.get(name);
        }

        // Define log levels
        const levels = {
            error: 0,
            warn: 1,
            info: 2,
            http: 3,
            debug: 4,
        };

        // Determine the log level based on the environment
        const level = config.nodeEnv === 'development' ? 'debug' : 'warn';

        // Define formatting based on the environment
        const format = config.nodeEnv === 'development'
            ? winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
                winston.format.printf(({timestamp, level, message, ...metadata}) => {
                    const messageString = typeof message === 'object' ? JSON.stringify(message) : message;
                    const metadataString = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
                    return `${timestamp} [${level}]: ${messageString}${metadataString}`;
                })
            )
            : winston.format.combine(
                winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
                winston.format.errors({stack: true}),
                winston.format.json()
            );

        // Create and configure the logger
        const logger = winston.createLogger({
            level: level,
            levels: levels,
            format: format,
            transports: [
                config.nodeEnv === 'production'
                    ? new LoggingWinston()
                    : new winston.transports.Console(),
            ],
        });

        // Store the logger in the map
        this.loggers.set(name, logger);
        return logger;
    }

    static enableLogger(name: string) {
        const logger = this.loggers.get(name);
        if (logger) {
            logger.level = 'debug';
        }
    }

    static disableLogger(name: string) {
        const logger = this.loggers.get(name);
        if (logger) {
            logger.level = 'silent'; // Or use 'none'
        }
    }
}

export default LoggerFactory;
