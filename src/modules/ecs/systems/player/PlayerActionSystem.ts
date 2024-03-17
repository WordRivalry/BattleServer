// PlayerActionSystem.ts
import {ECManager} from "../../ECManager";
import {System} from "../System";
import {ComponentType} from "../../components/ComponentManager";
import {TypedEventEmitter} from "../../TypedEventEmitter";
import {PlayerInputComponent} from "../../components/player/PlayerInputComponent";
import {PlayerControllerComponent} from "../../components/player/PlayerControllerComponent";
import {Command} from "../../commands/Command";
import {ControllingComponent} from "../../components/player/ControllingComponent";

export class PlayerActionSystem extends System {
    requiredComponents: ComponentType[] = [PlayerInputComponent, PlayerControllerComponent, ControllingComponent];

    update(_deltaTime: number, entities: number[], ecManager: ECManager, _eventSystem: TypedEventEmitter): void {
        for (const entity of entities) {
            const inputComponent = ecManager.getComponent(entity, PlayerInputComponent);
            const controllerComponent = ecManager.getComponent(entity, PlayerControllerComponent);

            inputComponent.inputs.forEach(input => {
                const commandType = controllerComponent.inputToCommandMapping.get(input.type);
                if (commandType) {
                    const pawnId = this.findControlledPawn(entity, ecManager);
                    const command: Command = new commandType(pawnId, input.parameters);
                    command.execute(ecManager);
                }
            });

            ecManager.removeComponent(entity, PlayerInputComponent);
        }
    }

    private findControlledPawn(playerEntity: number, ecManager: ECManager): number {
        const controllingComponent = ecManager.getComponent(playerEntity, ControllingComponent);
        if (controllingComponent.entityId === undefined) {
            throw new Error(`Player entity ${playerEntity} does not have a controlled pawn`);
        }
        return controllingComponent.entityId;
    }
}
