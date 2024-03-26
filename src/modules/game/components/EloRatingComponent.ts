import {Component} from "../../ecs/components/Component";


export class EloRatingComponent extends Component {
public eloRating: number;

    constructor(eloRating: number) {
        super();
        this.eloRating = eloRating;
    }
}