// InfoDispatchState.ts
import {State} from "../../ecs/components/StateMachine/State";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {GridComponent} from "../components/grid/GridComponent";
import {createScopedLogger} from "../../logger/logger";
import {NormalRankGameEvent} from "../normalRankGame/NormalRankGameSession";

export class InfoDispatchState extends State {

    private readonly logger = createScopedLogger('InfoDispatchState')

    constructor(
        private readonly broadcastMessage: (type: string, payload: any) => void
    ) {
        super();
    }

    enter(entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        this.logger.context('enter').info(`Entering info dispatch state`);
        const gridComponent = ecManager.getComponent(entity, GridComponent);

        this.broadcastMessage(NormalRankGameEvent.GAME_INFORMATION, {
            duration: 15,
            grid: gridComponent.grid,
            valid_words: gridComponent.valid_words,
            stats: gridComponent.stats
        });
    }

    update(_deltaTime: number, entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        ecManager.addTag(entity, 200);
        this.logger.context('update').info(`Updating info dispatch state`);
    }

    exit(entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        ecManager.removeTag(entity, 200);
        this.logger.context('exit').info(`Exiting info dispatch state`);
    }
}