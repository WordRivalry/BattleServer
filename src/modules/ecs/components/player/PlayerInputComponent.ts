// PlayerInputComponent.ts
import {ICommand} from "../../commands/ICommand";
import {Component} from "../Component";

export class PlayerInputComponent extends Component {
    public commands: ICommand[] = [];

    addCommand(command: ICommand) {
        this.commands.push(command);
    }

    clearCommands() {
        this.commands = [];
    }
}
