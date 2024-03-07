// src/ecs/systems/RenderSystem.ts

import { PositionComponent } from "../components/PositionComponent";
import { ComponentManager } from "../ComponentManager";

export class RenderSystem {
    update(componentManager: ComponentManager) {
        const entities = componentManager.getEntitiesWithComponent(PositionComponent);

        for (let entity of entities) {
            const position = componentManager.getComponent<PositionComponent>(entity, PositionComponent);
            if (position) {
                console.log(`Rendering entity ${entity} at position (${position.x}, ${position.y})`);
            }
        }
    }
}

