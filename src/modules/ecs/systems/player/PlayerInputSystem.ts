// PlayerInputSystem.ts
import {System} from "../System";
import {ECManager} from "../../ECManager";
import {TypedEventEmitter} from "../../TypedEventEmitter";
import {ComponentType} from "../../components/ComponentManager";
import {PlayerControllerComponent} from "../../components/player/PlayerControllerComponent";
import {GlobalInputEventQueue} from "../../components/inputs/GlobalInputEventQueue";
import {InputEvent} from "../../components/inputs/InputEvent";

export class PlayerInputSystem extends System {
    requiredComponents: ComponentType[] = [PlayerControllerComponent];

    update(_deltaTime: number, playerEntities: number[], ecsManager: ECManager, _eventSystem: TypedEventEmitter): void {
        playerEntities.forEach(playerEntity => {
            const playerController = ecsManager.getComponent(playerEntity, PlayerControllerComponent);
            const inputEvents = this.fetchInputsForEntity(playerEntity);
            inputEvents.forEach(input => {
                const CommandComponentClass = playerController.inputMappings.get(input.inputType);
                if (CommandComponentClass) {
                    ecsManager.addComponent(playerEntity, CommandComponentClass, new CommandComponentClass(...input.parameters));
                }
            });
        });
    }

    fetchInputsForEntity(entityId: number): InputEvent[] {
        return GlobalInputEventQueue.fetchAndClearInputsForEntity(entityId);
    }
}