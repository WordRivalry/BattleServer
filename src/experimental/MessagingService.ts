import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createScopedLogger } from "../logger/logger";
import { PlayerUUID } from "../types";

export type Recipient = 'all' | PlayerUUID | PlayerUUID[];

interface GameMessage {
    id: string;
    type: string;
    payload: any;
    timestamp: number;
    gameSessionUUID: string;
    recipient: Recipient; // 'all', a single player UUID, or an array of player UUIDs
}

export class MessagingService {
    private messages: GameMessage[] = [];
    private playerSockets: Map<string, WebSocket> = new Map();
    private logger = createScopedLogger('MessagingService');

    constructor(private gameSessionUUID: string) {}

    public publish(type: string, payload: any, recipient: Recipient): void {
        const message: GameMessage = {
            id: this.generateMessageUUID(),
            type: type,
            payload: payload,
            timestamp: Date.now(),
            gameSessionUUID: this.gameSessionUUID,
            recipient: recipient
        };

        this.messages.push(message);
        this.deliverMessage(message);
    }

    public registerPlayerSocket(playerUUID: string, socket: WebSocket) {
        this.playerSockets.set(playerUUID, socket);
    }

    public unregisterPlayerSocket(playerUUID: string) {
        this.playerSockets.delete(playerUUID);
    }

    public sendMissedMessages(playerUUID: string, lastSeen: number): void {
        const messages: GameMessage[] = this.getMessagesSince(playerUUID, lastSeen);
        messages.forEach(message => {
            this.notifyPlayer(playerUUID, message);
        });
    }

    private deliverMessage(message: GameMessage) {
        if (message.recipient === 'all') {
            this.logger.context('deliverMessage').debug('Delivering message to all players', {messageType: message.type});
            this.notifyAllPlayers(message);
        } else if (Array.isArray(message.recipient)) {
            this.logger.context('deliverMessage').debug('Delivering message to multiple players', {messageType: message.type});
            message.recipient.forEach(uuid => this.notifyPlayer(uuid, message));
        } else {
            this.logger.context('deliverMessage').debug('Delivering message to player', {messageType: message.type});
            this.notifyPlayer(message.recipient, message);
        }
    }

    private notifyPlayer(playerUUID: string, message: GameMessage): void {
        const socket = this.playerSockets.get(playerUUID);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        }
    }

    /**
     * Sends a message to all players except those specified.
     *
     * @param message The message object to be sent.
     * @param except A single playerUUID or an array of playerUUIDs to exclude from receiving the message.
     */
    private notifyAllPlayers(message: GameMessage, except?: string | string[]): void {
        this.playerSockets.forEach((socket, playerUUID) => {
            const isExcluded = Array.isArray(except) ? except.includes(playerUUID) : playerUUID === except;
            if (!isExcluded && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(message));
            }
        });
    }

    private getMessagesSince(playerUUID: PlayerUUID, lastSeen: number): GameMessage[] {
        return this.messages
        .filter(message => message.timestamp > lastSeen 
            && (message.recipient === 'all' 
            || message.recipient === playerUUID 
            || message.recipient.includes(playerUUID)));
    }

    private generateMessageUUID(): string {
        return uuidv4();
    }
}
