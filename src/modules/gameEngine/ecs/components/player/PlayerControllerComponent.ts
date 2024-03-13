// PlayerControllerComponent.ts
import {Component} from "../Component";
import {ComponentType} from "../ComponentManager";

export class PlayerControllerComponent extends Component {
    inputMappings: Map<string, ComponentType>;
    constructor(inputMappings: Map<string, ComponentType>) {
        super();
        this.inputMappings = inputMappings;
    }
}