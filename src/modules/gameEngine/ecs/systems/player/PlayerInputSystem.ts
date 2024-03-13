// PlayerInputSystem.ts
import {ISystem} from "../System";
import {ECManager} from "../../ECManager";
import {TypedEventEmitter} from "../TypedEventEmitter";
import {ComponentType} from "../../components/ComponentManager";
import {PlayerControllerComponent} from "../../components/player/PlayerControllerComponent";
import {GlobalInputEventQueue} from "../../components/inputs/GlobalInputEventQueue";
import {InputEvent} from "../../components/inputs/InputEvent";

export class PlayerInputSystem implements ISystem {
    requiredComponents: ComponentType[] = [PlayerControllerComponent];

    init(ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
    }

    update(_deltaTime: number, entities: number[], ecsManager: ECManager, _eventSystem: TypedEventEmitter): void {
        entities.forEach(entityId => {
            const playerController = ecsManager.getComponent(entityId, PlayerControllerComponent);
            const inputEvents = this.fetchInputsForEntity(entityId);
            inputEvents.forEach(input => {
                const CommandComponentClass = playerController.inputMappings.get(input.inputType);
                if (CommandComponentClass) {
                    ecsManager.addComponent(entityId, CommandComponentClass, new CommandComponentClass(...input.parameters));
                }
            });
        });
    }

    fetchInputsForEntity(entityId: number): InputEvent[] {
        return GlobalInputEventQueue.fetchAndClearInputsForEntity(entityId);
    }
}