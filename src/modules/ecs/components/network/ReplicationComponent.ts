// ReplicationComponent.ts
import {Component} from "../Component";

export class ReplicationComponent extends Component {
    shouldReplicate: boolean = false;
    modified: boolean = false;
    lastReplicationTime: number = Date.now();
}
