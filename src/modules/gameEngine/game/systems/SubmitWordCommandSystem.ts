// SubmitWordCommandSystem.ts
import {SubmitWordCommandComponent} from "../components/SubmitWordCommandComponent";
import {ComponentType} from "../../ecs/components/ComponentManager";
import {ISystem} from "../../ecs/systems/System";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/systems/TypedEventEmitter";
import {GameIdentityComponent} from "../components/game/GameIdentityComponent";
import {GridComponent} from "../components/game/GridComponent";
import {LetterGrid, LetterTile} from "../../LetterGrid";
import {createScopedLogger} from "../../../logger/logger";
import {Path} from "../../../server_networking/validation/messageType";
import {ScoreComponent} from "../components/ScoreComponent";

export class SubmitWordCommandSystem implements ISystem {
    private logger = createScopedLogger('SubmitWordCommandSystem');
    requiredComponents: ComponentType[] = [SubmitWordCommandComponent];

    update(deltaTime: number, entities: number[], ecManager: ECManager, eventSystem: TypedEventEmitter): void {
        entities.forEach(entityId => {
            const gameEntity = ecManager.queryEntities()
                .withComponent(GameIdentityComponent)
                .withChild(entityId)
                .execute()[0];
            const gridComponent = ecManager.getComponent(gameEntity, GridComponent);
            const submitWordCommand = ecManager.getComponent(entityId, SubmitWordCommandComponent);
            const pathLetterTiles = this.getPathLetterTiles(submitWordCommand.wordPath, gridComponent.grid);
            const score = this.defaultWordScoreCalculator(pathLetterTiles);

            // Update the player's score
            const playerScoreComponent = ecManager.getComponent(entityId, ScoreComponent);
            playerScoreComponent.score += score;

            ecManager.removeComponent(entityId, SubmitWordCommandComponent); // Cleanup
        });
    }

    private getPathLetterTiles(path: Path, grid: LetterGrid): LetterTile[] {
        const letterTiles: LetterTile[] = [];
        if (!Array.isArray(path) || path.some(part => !Array.isArray(part) || part.length !== 2)) {
            this.logger.context('getPathLetterTiles').error('Invalid path format');
            console.error('Invalid path format');
            return [];
        }
        for (const [row, col] of path) {
            // Ensure the row and col are within the bounds of the grid
            if (row >= 0 && row < grid.length && col >= 0 && col < grid[row].length) {
                const tile = grid[row][col];
                letterTiles.push(tile);
            } else {
                this.logger.context('getPathLetterTiles').error('Invalid path coordinates', {row, col});
            }
        }
        return letterTiles;
    }

    private defaultWordScoreCalculator(word: LetterTile[]): number {
        let score = 0;
        let wordMultipliers = [];
        // Calculate base score for the word
        for (let letter of word) {
            score += letter.value * letter.multiplierLetter;
            if (letter.multiplierWord > 1) {
                wordMultipliers.push(letter.multiplierWord);
            }
        }
        // Apply word multipliers if any
        for (let wordMultiplier of wordMultipliers) {
            score *= wordMultiplier;
        }
        return score;
    }
}
