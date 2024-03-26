// FinishedState.ts
import {State} from "../../ecs/components/StateMachine/State";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {IdentityComponent} from "../../ecs/components/player/IdentityComponent";
import {createScopedLogger} from "../../logger/logger";
import {EngineGameEventEnum} from "../../framework/EngineGameEventEnum";

export class FinishedState extends State {

    private readonly logger = createScopedLogger('FinishedState')

    enter(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        this.logger.context('enter').info('Entering finished state');
        const identityComponent = ecManager.getComponent(entity, IdentityComponent);
        eventSystem.emitTargeted(EngineGameEventEnum.GAME_END, identityComponent.identity, {})
    }

    update(deltaTime: number, entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        this.logger.context('update').info('Updating finished state');
    }

    exit(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        this.logger.context('exit').info('Exiting finished state');
    }
}