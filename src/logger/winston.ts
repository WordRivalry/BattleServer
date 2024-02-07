// logger.js
import winston from "winston";
import config from "../../config";

// Environment-specific configurations
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

const level = (): string => {
    const env = config.nodeEnv;
    const isDevelopment = env === "development";
    return isDevelopment ? "debug" : "warn";
};

// Define different formats for different environments
const format = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.colorize({ all: true }),
    winston.format.printf((info) => {
        // TIMESTAMP LEVEL MESSAGE
        const timestamp = info.timestamp.padEnd(19, " ");

        // CONVERT LEVEL TO UPPERCASE AND PAD
        const ansiEscapeRegex = /(\u001b\[.*?m)/; // Regular expression for ANSI escape codes
        const parts = info.level.split(ansiEscapeRegex); // Splitting based on ANSI codes
        const upperCaseLevel = parts
            .map((part) => {
                // If the part is an ANSI code, return as is; otherwise, convert to uppercase
                return ansiEscapeRegex.test(part) ? part : part.toUpperCase();
            })
            .join("")
            .padEnd(15, " "); // Reassembling the string and padding it

        const message = info.message;
        return `${timestamp} ${upperCaseLevel} ${message}`;
    })
);

// Transports define where your logs will be stored
const transports = [
    new winston.transports.Console()
    // Add more transports (like file transports) as needed
];

// Create the logger instance
export const Logger = winston.createLogger({
    level: level(),
    levels,
    format,
    transports
});