// SubmitWordCommandComponent.ts
import {Component} from "../../ecs/components/Component";
import {Path} from "../../../server_networking/validation/messageType";

export class SubmitWordCommandComponent extends Component {
    public wordPath: Path;

    constructor(wordPath: Path) {
        super();
        this.wordPath = wordPath;
    }
}