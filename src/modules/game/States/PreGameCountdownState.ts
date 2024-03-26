// CountdownState.ts
import {State} from "../../ecs/components/StateMachine/State";
import {ECManager} from "../../ecs/ECManager";
import {TimerComponent} from "../../ecs/components/TimerComponent";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {GameSessionNetworking} from "../../framework/GameSessionNetworking";
import {createScopedLogger} from "../../logger/logger";
import {NormalRankGameEvent} from "../normalRankGame/NormalRankGameSession";

export class PreGameCountdownState extends State {

    private readonly logger = createScopedLogger('CountdownState')

    constructor(
        private readonly broadcastMessage: (type: string, payload: any) => void
    ) {
        super();
    }

    enter(entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        this.logger.context('enter').info(`Entering countdown state`);
        const timerComponent = new TimerComponent(3000, false);
        ecManager.addComponent(entity, TimerComponent, timerComponent);
    }

    update(_deltaTime: number, entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        const timerComponent = ecManager.getComponent(entity, TimerComponent);
        if (timerComponent.isActive) {
            this.broadcastMessage(NormalRankGameEvent.PRE_GAME_COUNTDOWN, {
                countdown: Math.round((timerComponent.duration - timerComponent.elapsedTime) / 1000)
            });
        } else {
            ecManager.addTag(entity, 200);
        }
        this.logger.context('update').info('Updating countdown state');
    }

    exit(entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        ecManager.removeTag(entity, 200)
        this.logger.context('exit').info('Exiting countdown state');
    }
}