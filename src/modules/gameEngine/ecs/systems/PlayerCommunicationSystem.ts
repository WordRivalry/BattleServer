import {System} from "./System";
import {ComponentType} from "../components/ComponentManager";
import {TypedEventEmitter} from "./TypedEventEmitter";
import {EngineClock} from "../EngineClock";
import {PlayerMessage, PlayerMessageComponent} from "../components/player/PlayerMessageComponent";
import {v4 as uuidv4} from "uuid";
import {PlayerConnectionComponent} from "../components/player/PlayerConnectionComponent";
import {createScopedLogger} from "../../../logger/logger";
import {ECManager} from "../ECManager";
import {PlayerIdentityComponent} from "../components/player/PlayerIdentityComponent";
import {GameIdentityComponent} from "../../game/components/game/GameIdentityComponent";

export interface PlayerCommunication {
    type: string;
    gameSessionUUID: string;
    playerUUID: string;
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
            const gameEntity = this.getGameEntity(ecsManager, data.gameSessionUUID);
            const playerEntity = ecsManager
                .queryEntities()
                .withParent(gameEntity)
                .withComponentCondition(PlayerIdentityComponent, (component: PlayerIdentityComponent) => component.playerUUID === data.playerUUID)
                .execute()[0];
            if (playerEntity === undefined) throw new Error("Player entity not found");
            const playerConnection = ecsManager.getComponent(playerEntity, PlayerConnectionComponent);
            if (!playerConnection.socket) throw new Error("Player connection not found");

            // Form the message
            const message: PlayerMessage = {
                id: uuidv4(),
                type: data.type,
                payload: data.payload,
                timestamp: this.engineClock.getCurrentTime(),
                gameSessionUUID: data.gameSessionUUID,
                recipient: data.playerUUID
            };

            // Send the message to a player
            if (playerConnection.socket) {
                playerConnection.socket.send(JSON.stringify(message));
                this.logger.context("eventSystem").debug(`Sent message to player ${data.playerUUID}`);
            } else {
                const playerMessageComponent = ecsManager.getComponent(playerEntity, PlayerMessageComponent);
                playerMessageComponent.messages.push(message);
                this.logger.context("eventSystem").debug(`Player ${data.playerUUID} is not connected. Storing message for later`);
            }
        });
    }

    private getGameEntity(ecManager: ECManager, gameSessionUUID: string) {
        const gameEntity = ecManager
            .queryEntities()
            .withComponentCondition(GameIdentityComponent, (component: GameIdentityComponent) => component.uuid === gameSessionUUID)
            .execute()[0];
        if (gameEntity === undefined) throw new Error("Game entity not found");
        return gameEntity;
    }

    requiredComponents: ComponentType[] = [];
    update(deltaTime: number, entities: number[], ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
        throw new Error("Method not implemented.");
    }
}