// PlayerActionSystem.ts

import {ECManager} from "../../ECManager";
import {System} from "../System";
import {ComponentType} from "../../components/ComponentManager";
import {TypedEventEmitter} from "../../TypedEventEmitter";
import {PlayerInputComponent} from "../../components/player/PlayerInputComponent";

export class PlayerActionSystem extends System {
    requiredComponents: ComponentType[] = [PlayerInputComponent];

    update(_deltaTime: number, playerEntities: number[], ecManager: ECManager, _eventSystem: TypedEventEmitter): void {

        for (const playerEntity of playerEntities) {
            const inputComponent = ecManager.getComponent(playerEntity, PlayerInputComponent);

            // Execute each command
            for (const command of inputComponent.commands) {
                command.execute();
            }

            // Clear commands after processing
            inputComponent.clearCommands();
        }
    }

}
