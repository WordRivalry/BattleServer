// src/ecs/systems/SomeSystem.ts
import { ComponentManager } from "../ComponentManager";
import { PositionComponent } from "../components/PositionComponent";

import { IQuery } from "../queries/IQuery";

export class SomeSystem {
    constructor(private componentManager: ComponentManager) {}

    update() {
        const query = {
            all: [PositionComponent],
            conditions: [{
                componentType: PositionComponent,
                predicate: (position: PositionComponent) => position.x > 100
            }]
        };

        const entities = this.componentManager.getEntitiesByQuery(query);

        for (const entity of entities) {
            // Process each entity
        }
    }
}
