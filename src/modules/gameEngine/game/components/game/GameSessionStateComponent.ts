// GameSessionComponent

import {Component} from "../../../ecs/components/Component";
import {SessionState} from "../../../../GameSession/GameSession";
import {GameMode, ModeType} from "../../../../server_networking/validation/messageType";

export class GameSessionStateComponent extends Component {
    public state: SessionState;
    public readonly gameMode: GameMode;
    public readonly modeType: ModeType;

    constructor(state: SessionState, gameMode: GameMode, modeType: ModeType) {
        super();
        this.state = state;
        this.gameMode = gameMode;
        this.modeType = modeType;
    }
}
