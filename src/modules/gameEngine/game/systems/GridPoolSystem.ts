// GridPoolSystem.ts

import axios from "axios";
import config from "../../../../../config";
import { ISystem } from "../../ecs/systems/System";
import { GridPoolComponent } from "../components/game/GridPoolComponent";
import { ComponentManager } from "../../ecs/ComponentManager";
import { TypedEventEmitter } from "../../ecs/systems/TypedEventEmitter";
import { GridComponent } from "../components/game/GridComponent";
import { EntityManager } from "../../ecs/EntityManager";
import LetterComponent from "../components/game/LetterComponent";
import {Entity} from "../../ecs/entities/entity";

export class GridPoolSystem implements ISystem {
    requiredComponents = [GridPoolComponent];

    public init(entityManager: EntityManager, componentManager: ComponentManager, eventSystem: TypedEventEmitter): void {

        // Get the global entity
        const globalEntity = entityManager.getGlobalEntity();

        // Add Grid pool component to the global entity
        const gridPoolComponent = new GridPoolComponent();
        componentManager.addComponent(globalEntity, GridPoolComponent, gridPoolComponent);

        // Preload the pool
        this.loadPool(gridPoolComponent, 50)
            .then(() => {
                eventSystem.emitGeneric('gridPoolRefilled', undefined)
            })
            .catch((error) => {
                console.error("Failed to fill grid pool:", error);
            });
    }

    public update(deltaTime: number, entities: Entity[], componentManager: ComponentManager, eventSystem: TypedEventEmitter): void {

        // Get the grid pool component
        const gridPoolComponent = componentManager.getComponent(entities[0], GridPoolComponent);
        if (!gridPoolComponent) {
            throw new Error("Grid pool component not found");
        }

        // If the pool is running low, refill it
        if (gridPoolComponent.gridPool.length < 25) {
            this.loadPool(gridPoolComponent, 25)
                .then(() => {
                    eventSystem.emitGeneric('gridPoolRefilled', undefined)
                })
                .catch((error) => {
                    console.error("Failed to refill grid pool:", error);
                });
        }
    }

    private async loadPool(gridPoolComponent: GridPoolComponent, size: number): Promise<void> {
        const promises = [];
        for (let i = 0; i < size; i++) {
            promises.push(this.generateGrid());
        }

        try {
            const grids = await Promise.all(promises);
            grids.forEach(grid => gridPoolComponent.gridPool.push(
                new GridComponent(
                    grid.map((row: string[]) =>
                        row.map((letter: string): LetterComponent => ({
                            letter: letter.toUpperCase(),
                            value: this.getLetterScore(letter.toUpperCase()), // You need to implement this method based on your scoring system
                            multiplierLetter: this.determineMultiplier(true),
                            multiplierWord: this.determineMultiplier(false),
                        }))
                    )
            )));

        } catch (error) {
            console.error("Failed to preload grids:", error);
            throw new Error("Failed to preload grids");
        }
    }

    private generateGrid(): Promise<string[][]> {
        const minDiversity: number = 0
        const maxDiversity: number = 1
        const minDifficulty: number = 0
        const maxDifficulty: number = 1000

        try {
            const api_url = config.gridApiUrl;
            // Fetch the grid from the API
            return axios.get(api_url + '/get_grid', {
                    params: {
                        min_diversity: minDiversity,
                        max_diversity: maxDiversity,
                        min_difficulty: minDifficulty,
                        max_difficulty: maxDifficulty,
                    }
                })
        } catch (error) {
            console.error("Failed to fetch grid:", error);
            throw new Error("Failed to fetch grid from the API");
        }
    }

    private determineMultiplier(isLetter: boolean): number {
        const chance = Math.random();
        const threshold = 0.85;
        if (chance > threshold) {
            return isLetter ? (chance > 0.75 ? 2 : 3) : (chance > 0.85 ? 2 : 1);
        }
        return 1;
    }

    private getLetterScore(letter: string): number {
        const letterData = this.frenchLetterDistribution.find((data) => data.letter === letter);
        return letterData ? letterData.score : 0;
    }

    private frenchLetterDistribution = [
        { letter: 'E', frequency: 14.715, score: 1 },
        { letter: 'A', frequency: 7.636, score: 1 },
        { letter: 'I', frequency: 7.529, score: 1 },
        { letter: 'S', frequency: 7.948, score: 2 },
        { letter: 'N', frequency: 7.095, score: 1 },
        { letter: 'R', frequency: 6.553, score: 1 },
        { letter: 'T', frequency: 7.244, score: 1 },
        { letter: 'U', frequency: 6.311, score: 1 },
        { letter: 'L', frequency: 5.456, score: 1 },
        { letter: 'O', frequency: 5.378, score: 1 },
        { letter: 'D', frequency: 3.669, score: 2 },
        { letter: 'C', frequency: 3.260, score: 2 },
        { letter: 'P', frequency: 3.021, score: 2 },
        { letter: 'M', frequency: 2.968, score: 2 },
        { letter: 'V', frequency: 1.838, score: 3 },
        { letter: 'Q', frequency: 1.362, score: 4 },
        { letter: 'F', frequency: 1.066, score: 3 },
        { letter: 'B', frequency: 0.901, score: 3 },
        { letter: 'G', frequency: 0.866, score: 3 },
        { letter: 'H', frequency: 0.737, score: 4 },
        { letter: 'J', frequency: 0.545, score: 5 },
        { letter: 'X', frequency: 0.387, score: 6 },
        { letter: 'Y', frequency: 0.308, score: 6 },
        { letter: 'Z', frequency: 0.136, score: 7 },
        { letter: 'K', frequency: 0.049, score: 8 },
        { letter: 'W', frequency: 0.114, score: 9 }
    ];
}
