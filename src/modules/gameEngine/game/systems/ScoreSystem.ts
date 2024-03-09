import {IEventDrivenSystem, ISystem} from "../../ecs/systems/System";
import {ScoreComponent} from "../components/ScoreComponent";
import {Entity} from "../../ecs/entities/entity";
import {ComponentManager} from "../../ecs/ComponentManager";
import {EntityManager} from "../../ecs/EntityManager";
import {TypedEventEmitter} from "../../ecs/systems/TypedEventEmitter";
import {Path} from "../../GameEngine";
import {GridComponent} from "../components/game/GridComponent";

export class ScoreSystem implements IEventDrivenSystem {
    requiredComponents = [GridComponent, ScoreComponent];

    constructor(eventSystem: TypedEventEmitter) {

    }
}
