// PersistingGameState.ts
import {State} from "../../ecs/components/StateMachine/State";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {createScopedLogger} from "../../logger/logger";

export class PersistingGameState extends State {

    private readonly logger = createScopedLogger('PersistingGameState')

    enter(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        this.logger.context('enter').info(`Entering persisting game state`);
    }

    update(deltaTime: number, entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        ecManager.addTag(entity, 200);
        this.logger.context('update').info(`Updating persisting game state`);
    }

    exit(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        ecManager.removeTag(entity, 200);
        this.logger.context('exit').info(`Exiting persisting game state`);
    }
}