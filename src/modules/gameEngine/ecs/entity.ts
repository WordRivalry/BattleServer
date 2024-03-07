// src/ecs/Entity.ts

export type Entity = number;

let nextEntityId: Entity = 0;

export function createEntity(): Entity {
    return nextEntityId++;
}
