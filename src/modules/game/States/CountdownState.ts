// CountdownState.ts
import {State} from "../../ecs/components/StateMachine/State";
import {ECManager} from "../../ecs/ECManager";
import {TimerComponent} from "../../ecs/components/TimerComponent";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {GameSessionNetworking} from "../../oldButNew/GameSessionNetworking";
import {createScopedLogger} from "../../logger/logger";

export class CountdownState extends State {

    private readonly logger = createScopedLogger('CountdownState')

    constructor(private readonly sessionNetworking: GameSessionNetworking) {
        super();
    }

    enter(entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        this.logger.context('enter').info(`Entering countdown state`);

        // Set timer
        const timerComponent = new TimerComponent(3000, false);
        ecManager.addComponent(entity, TimerComponent, timerComponent);

        // Broadcast countdown
        this.sessionNetworking.broadcastMessage('PreGameCountdown', {
            countdown: timerComponent.duration - timerComponent.elapsedTime
        });
    }

    update(_deltaTime: number, entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        // Fetch timer component and check if it's done
        const timerComponent = ecManager.getComponent(entity, TimerComponent);

        // Broadcast countdown
        this.sessionNetworking.broadcastMessage('countdown', {
            countdown: timerComponent.duration - timerComponent.elapsedTime
        });

        this.logger.context('update').info('Updating countdown state');
    }

    exit(gameEntity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        ecManager.removeComponent(gameEntity, TimerComponent);
        this.logger.context('exit').info('Exiting countdown state');
    }
}