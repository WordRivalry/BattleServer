// WaitingState.ts
import {State} from "../../ecs/components/StateMachine/State";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {createScopedLogger} from "../../logger/logger";
import {GlobalComponent} from "../../ecs/components/GlobalComponent";
import {GridPoolComponent} from "../components/game/GridPoolComponent";
import {GridComponent} from "../components/game/GridComponent";

export class WaitingState  extends State {

    private readonly logger = createScopedLogger('WaitingState')

    enter(_gameEntity: number, _ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        this.logger.context('enter').info(`Entering waiting state`);
    }

    update(_deltaTime: number, _entity: number, _ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        this.logger.context('update').info(`Updating waiting state`);
    }

    exit(gameEntity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        const globalEntity = ecManager.queryEntities()
            .withComponent(GlobalComponent)
            .getOne();

        const gridPoolComponent = ecManager.getComponent(globalEntity, GridPoolComponent);
        const gridComponent = gridPoolComponent.gridPool.pop();
        if (!gridComponent) {
            throw new Error("Grid pool is empty");
        }
        ecManager.addComponent(gameEntity, GridComponent, gridComponent);
        this.logger.context('enter').info(`Grid component added to game entity`);

        this.logger.context('exit').info(`Exiting waiting state`);
    }
}