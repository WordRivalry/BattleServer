// TimerSystem.ts
import {System} from "./System";
import {TimerComponent} from "../components/TimerComponent";
import {createScopedLogger} from "../../../logger/logger";
import {ECManager} from "../ECManager";

export class TimerSystem extends System {

    requiredComponents = [TimerComponent];
    private logger = createScopedLogger('TimerSystem');

    update(deltaTime: number, entities: number[], ecsManager: ECManager): void {
        entities.forEach(entity => {
            const timeComponent = ecsManager.getComponent(entity, TimerComponent);
            if (timeComponent.isActive) {
                timeComponent.elapsedTime += deltaTime;

                this.logger.debug(`Timer for entity ${entity} has elapsed time of ${timeComponent.elapsedTime} and duration of ${timeComponent.duration}`);

                if (timeComponent.duration > 0 && timeComponent.elapsedTime >= timeComponent.duration) {
                    if (timeComponent.callback) {
                        try {
                            timeComponent.callback();
                            this.logger.debug(`Timer callback executed for entity ${entity}`);
                        } catch (error) {
                            this.logger.error(`Error in timer callback: ${error}`);
                            throw error;
                        }
                    }

                    if (timeComponent.repeat) {
                        timeComponent.elapsedTime -= timeComponent.duration; // Allows for precise timing over multiple repeats
                    } else {
                        ecsManager.removeComponent(entity, TimerComponent);
                    }
                }
            }
        });
    }
}
