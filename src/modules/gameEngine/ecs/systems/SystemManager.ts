// SystemManager.ts
import {System} from "./System";
import {TypedEventEmitter} from "./TypedEventEmitter";
import {ECManager} from "../ECManager";
import {PipelineManager} from "./PipelineManager";

export class SystemManager {
    private readonly pipelineManager: PipelineManager;
    private readonly noDependencySystems: System[] = [];
    private readonly ecManager: ECManager;
    private readonly eventSystem: TypedEventEmitter;

    constructor(ecsManager: ECManager, eventSystem: TypedEventEmitter) {
        this.ecManager = ecsManager;
        this.eventSystem = eventSystem;
        this.pipelineManager = new PipelineManager();
    }

    registerOutOfPipeSystem(system: System) {
        this.noDependencySystems.push(system);
    }

    registerSystem(system: System) {
        if (system.init) system.init(this.ecManager, this.eventSystem);
        this.pipelineManager.addSystem(system);
    }

    startSubPipeline() {
        this.pipelineManager.beginSubPipeline();
    }

    endSubPipeline() {
        this.pipelineManager.endSubPipeline();
    }

    update(deltaTime: number) {
        this.pipelineManager.update(deltaTime, this.ecManager, this.eventSystem);
    }
}
