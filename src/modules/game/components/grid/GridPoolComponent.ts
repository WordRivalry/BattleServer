// GridPoolComponent.ts
import {Component} from "../../../ecs/components/Component";
import {GridComponent} from "./GridComponent";

export class GridPoolComponent extends Component {
    public gridPool: GridComponent[] = [];
}
