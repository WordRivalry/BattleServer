// SystemManager.ts
import {ISystem} from "./System";
import {TypedEventEmitter} from "./TypedEventEmitter";
import {createScopedLogger} from "../../../logger/logger";
import {ECManager} from "../ECManager";

export class SystemManager {
    private readonly systems: Array<{ system: ISystem }> = [];
    private readonly noDependencySystems: ISystem[] = [];
    private readonly ecManager: ECManager;
    private readonly eventSystem: TypedEventEmitter;
    private readonly logger = createScopedLogger('SystemManager');

    constructor(ecsManager: ECManager, eventSystem: TypedEventEmitter) {
        this.ecManager = ecsManager;
        this.eventSystem = eventSystem;
    }

    registerSystem(system: ISystem) {
        if(system.init) {
            system.init(this.ecManager, this.eventSystem);
        }

        if (system.requiredComponents.length === 0) {
            this.noDependencySystems.push(system);
        } else {
            this.systems.push({system: system });
        }

        this.logger.info(`Registered system: ${system.constructor.name}`);
    }

    removeSystem(system: ISystem) {
        const index = this.noDependencySystems.indexOf(system);
        if (index > -1) {
            this.noDependencySystems.splice(index, 1);
        } else {
            // Check if the system is in the systems array
            const index = this.systems.findIndex((s) => s.system === system);
            if (index > -1) {
                this.systems.splice(index, 1);
            } else {
                this.logger.context('removeSystem').warn(`System ${system.constructor.name} not found`);
            }
        }
    }

    update(deltaTime: number) {
        this.systems.forEach(({ system }) => {
            const entities = this.ecManager
                .queryEntities()
                .withComponents(system.requiredComponents)
                .execute();
            system.update(deltaTime, entities, this.ecManager, this.eventSystem);
        });
    }
}
