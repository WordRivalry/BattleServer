import {System} from "../System";
import {ComponentType} from "../../components/ComponentManager";
import {TypedEventEmitter} from "../../TypedEventEmitter";
import {EngineClock} from "../../EngineClock";
import {PlayerMessage, PlayerMessageComponent} from "../../components/player/PlayerMessageComponent";
import {v4 as uuidv4} from "uuid";
import {PlayerConnectionComponent} from "../../components/player/PlayerConnectionComponent";
import {createScopedLogger} from "../../../logger/logger";
import {ECManager} from "../../ECManager";
import {PlayerIdentityComponent} from "../../components/player/PlayerIdentityComponent";
import {WebSocket} from "ws";

export interface PlayerCommunication {
    socket?: WebSocket;
    playerEntity: string;
    type: string;
    payload: any;
}

export enum PlayerCommunicationEventType {
    sendMessageToPlayer = "sendMessageToPlayer"
}

export class PlayerCommunicationSystem extends System {

    private engineClock: EngineClock;
    private logger = createScopedLogger('PlayerCommunicationSystem');

    constructor(engineClock: EngineClock) {
        super();
        this.engineClock = engineClock;
    }

    init(ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
        eventSystem.subscribeGeneric('sendMessageToPlayer', (data: PlayerCommunication) => {
            // Get the player connection details

            // Form the message
            const message: PlayerMessage = {
                uuid: uuidv4(),
                type: data.type,
                payload: data.payload,
                timestamp: this.engineClock.getCurrentTime()
            };

            // Send the message to a player
            if (data.socket) {
                data.socket.send(JSON.stringify(message));
                this.logger.context("eventSystem").debug(`Sent message to player  ${playerEntity}`);
            } else {
                const playerMessageComponent = ecsManager.getComponent(playerEntity, PlayerMessageComponent);
                playerMessageComponent.messages.push(message);
               this.logger.context("eventSystem").debug(`Player ${playerEntity} is not connected. Storing message for later`);
            }
        });
    }

    requiredComponents: ComponentType[] = [];
    update(deltaTime: number, entities: number[], ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
        throw new Error("Method not implemented.");
    }
}