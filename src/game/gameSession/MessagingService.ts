import WebSocket from 'ws';
import {PlayerUUID} from "./GameEngine";
import { v4 as uuidv4 } from 'uuid';
import {createScopedLogger} from "../../logger/Logger";

export type Recipient = 'all' | PlayerUUID | PlayerUUID[];

interface GameMessage {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
    recipient: Recipient; // 'all', a single player UUID, or an array of player UUIDs
}

export class MessagingService {
    private messages: GameMessage[] = [];
    private playerLastSeen: Map<string, number> = new Map(); // Maps player UUID to last message timestamp
    private playerSockets: Map<string, WebSocket> = new Map();
    private logger = createScopedLogger('MessagingService');

    public publish(type: string, payload: any, recipient: Recipient): void {
        const message: GameMessage = {
            id: uuidv4(), // Generate a unique ID for the message
            type: type,
            payload: payload,
            timestamp: Date.now(), // Use the current timestamp
            recipient: recipient
        };

        this.messages.push(message);
        this.deliverMessage(message);
    }

    public getMessagesSince(playerUuid: string): GameMessage[] {
        const lastTimestamp = this.playerLastSeen.get(playerUuid) || 0;
        return this.messages.filter(message => message.timestamp > lastTimestamp && (message.recipient === 'all' || message.recipient === playerUuid || message.recipient.includes(playerUuid)));
    }

    public updatePlayerLastSeen(playerUuid: string, timestamp: number) {
        this.playerLastSeen.set(playerUuid, timestamp);
    }

    public handlePlayerReconnection(playerUuid: string): void {
        // Fetch all messages since the player's last known timestamp
        const messages: GameMessage[] = this.getMessagesSince(playerUuid);

        // Filter messages to include only those intended for this player or all players
        const relevantMessages: GameMessage[] = messages.filter((message: GameMessage) =>
            message.recipient === 'all'
            || message.recipient === playerUuid
            || (Array.isArray(message.recipient) && message.recipient.includes(playerUuid))
        );

        // Directly send the relevant messages to the reconnecting player
        relevantMessages.forEach(message => {
            this.notifyPlayer(playerUuid, message);
        });

        // Update the player's last known timestamp with the timestamp of the last message sent, if any
        if (relevantMessages.length > 0) {
            const lastMessageTimestamp = relevantMessages[relevantMessages.length - 1].timestamp;
            this.updatePlayerLastSeen(playerUuid, lastMessageTimestamp);
        }
    }

    public registerPlayerSocket(playerUuid: string, socket: WebSocket) {
        this.playerSockets.set(playerUuid, socket);
    }

    public unregisterPlayerSocket(playerUuid: string) {
        this.playerSockets.delete(playerUuid);
    }

    private deliverMessage(message: GameMessage) {
        if (message.recipient === 'all') {
            this.logger.info(`Delivering message to all players: ${message.type}`);
            this.notifyAllPlayers(message);
        } else if (Array.isArray(message.recipient)) {
            this.logger.info(`Delivering message to multiple players: ${message.type}`);
            message.recipient.forEach(uuid => this.notifyPlayer(uuid, message));
        } else {
            this.logger.info(`Delivering message to player: ${message.type}`);
            this.notifyPlayer(message.recipient, message);
        }
    }

    private notifyPlayer(playerUuid: string, message: GameMessage): void {
        const socket = this.playerSockets.get(playerUuid);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }


    /**
     * Sends a message to all players except those specified.
     *
     * @param message The message object to be sent.
     * @param except A single PlayerUUID or an array of PlayerUUIDs to exclude from receiving the message.
     */
    private notifyAllPlayers(message: GameMessage, except?: string | string[]): void {
        this.playerSockets.forEach((socket, playerUuid) => {
            const isExcluded = Array.isArray(except) ? except.includes(playerUuid) : playerUuid === except;
            if (!isExcluded && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(message));
            }
        });
    }
}
