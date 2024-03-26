// PlayerControllerComponent.ts
import {Component} from "../Component";
import {CommandType} from "../../commands/Command";

export class PlayerControllerComponent extends Component {
    public inputToCommandMapping: Map<string, CommandType> = new Map();
}
