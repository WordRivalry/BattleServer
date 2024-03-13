import {ISystem} from "../System";
import {ECManager} from "../../ECManager";
import {TypedEventEmitter} from "../TypedEventEmitter";
import {ComponentType} from "../../components/ComponentManager";
import {ReplicationComponent} from "../../components/network/ReplicationComponent";
import {Component} from "../../components/Component";

export class ReplicationSystem implements ISystem {
    requiredComponents: ComponentType[] = [ReplicationComponent];

    init(ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
    }

    update(_deltaTime: number, entities: number[], ecManager: ECManager, _eventSystem: TypedEventEmitter): void {
        for (const entityId of entities) {
            const replicationComponent = ecManager.getComponent(entityId, ReplicationComponent);
            if (replicationComponent.shouldReplicate && replicationComponent.modified) {
                this.replicateEntity(entityId, ecManager);
            }
        }
    }

    serializeComponents(components: Component[]): string {
        return JSON.stringify(components);
    }

    private replicateEntity(entityId: number, ecManager: ECManager): void {
        const components = ecManager.getComponents(entityId);
        const replicationComponent = ecManager.getComponent(entityId, ReplicationComponent);
        if (replicationComponent === undefined) throw new Error("Replication component not found");
        if (this.shouldReplicate(replicationComponent)) {
            const serializedComponents = this.serializeComponents(components);
            // Send the serialized components to the server
            console.log(serializedComponents);
            replicationComponent.modified = false;
        }
    }

    private shouldReplicate(replicationComponent: ReplicationComponent): boolean {
        if (replicationComponent.shouldReplicate && replicationComponent.modified) {
            const currentTime = Date.now();
            if (currentTime - replicationComponent.lastReplicationTime > 1000) {
                replicationComponent.lastReplicationTime = currentTime;
                return true;
            }
        }
        return false;
    }
}