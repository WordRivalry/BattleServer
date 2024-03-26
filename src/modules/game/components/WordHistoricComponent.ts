import {Component} from "../../ecs/components/Component";
import {Path} from "../../server_networking/validation/messageType";


export class WordHistoricComponent extends Component {
    public historic: {
        word: string;
        path: Path;
        time: number;
        score: number
    }[] = [];
}