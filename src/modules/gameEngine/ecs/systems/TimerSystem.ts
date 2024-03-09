import { ISystem } from "./System";
import { TimerComponent } from "../components/TimerComponent";
import { Entity } from "../entities/entity";
import { ComponentManager } from "../ComponentManager";

export class TimerSystem implements ISystem {
    requiredComponents = [TimerComponent];

    update(deltaTime: number, entities: Entity[], componentManager: ComponentManager): void {
        entities.forEach(entity => {
            const timeComponent = componentManager.getComponent<TimerComponent>(entity, TimerComponent);

            if (timeComponent && timeComponent.isActive) {
                timeComponent.elapsedTime += deltaTime;

                if (timeComponent.duration > 0 && timeComponent.elapsedTime >= timeComponent.duration) {
                    if (timeComponent.callback) {
                        try {
                            timeComponent.callback();
                        } catch (error) {
                            console.error('Error executing timer callback:', error);
                        }
                    }

                    if (timeComponent.repeat) {
                        timeComponent.elapsedTime -= timeComponent.duration; // Allows for precise timing over multiple repeats
                    } else {
                        componentManager.removeComponent(entity, TimerComponent);
                    }
                }
            }
        });
    }
}
