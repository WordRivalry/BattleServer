import {ECManager} from "../ECManager";
import {TypedEventEmitter} from "../TypedEventEmitter";
import {System} from "./System";

type PipelineElement = System | "CONCURRENT_START" | "CONCURRENT_END" | "SUB_PIPELINE_START" | "SUB_PIPELINE_END";

export class PipelineManager {
    private pipeline: PipelineElement[] = [];
    private inSubPipeline: boolean = false;

    constructor() {}

    addSystem(system: System): void {
        this.pipeline.push(system);
    }

    beginSubPipeline(): void {
        if (this.inSubPipeline) {
            throw new Error("Cannot nest sub-pipelines");
        }
        this.pipeline.push("SUB_PIPELINE_START");
        this.inSubPipeline = true;
    }

    endSubPipeline(): void {
        if (!this.inSubPipeline) {
            throw new Error("No sub-pipeline to end");
        }
        this.pipeline.push("SUB_PIPELINE_END");
        this.inSubPipeline = false;
    }
    update(deltaTime: number, ecManager: ECManager, eventSystem: TypedEventEmitter): void {
        let inSubPipeline = false;
        let skipSubPipeline = false;
        let lastMainSystemHadEntities = false;

        for (let index = 0; index < this.pipeline.length; index++) {
            const element = this.pipeline[index];

            // Handle control elements and sub-pipeline logic
            if (typeof element === 'string') {
                if (element === "SUB_PIPELINE_START") {
                    inSubPipeline = true;
                    skipSubPipeline = false; // Reset at the start of each sub-pipeline
                } else if (element === "SUB_PIPELINE_END") {
                    inSubPipeline = false;
                }
                continue;
            }

            // If we're skipping a sub-pipeline, continue until we're out
            if (skipSubPipeline) continue;

            if (inSubPipeline) {
                // If the last main system had entities, process the sub-system
                if (lastMainSystemHadEntities) {
                    const entities = ecManager.queryEntities().withComponents(element.requiredComponents).execute();
                    if (entities.length > 0) {
                        element.update(deltaTime, entities, ecManager, eventSystem);
                    }
                } else {
                    // If the last main system didn't have entities, skip the sub-system
                    skipSubPipeline = true;
                }
            } else {
                // If we're not in a sub-pipeline, process the main system
                const entities = ecManager.queryEntities().withComponents(element.requiredComponents).execute();
                if (entities.length > 0) {
                    element.update(deltaTime, entities, ecManager, eventSystem);
                    lastMainSystemHadEntities = true;
                } else {
                    lastMainSystemHadEntities = false;
                }
            }
        }
    }
}
