// SubmitWordCommandSystem.ts
import {SubmitWordCommandComponent} from "../components/SubmitWordCommandComponent";
import {ComponentType} from "../../ecs/components/ComponentManager";
import {System} from "../../ecs/systems/System";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {GameIdentityComponent} from "../components/game/GameIdentityComponent";
import {GridComponent} from "../components/game/GridComponent";
import {LetterGrid, LetterTile} from "../LetterGrid";
import {createScopedLogger} from "../../logger/logger";
import {Path} from "../../server_networking/validation/messageType";
import {ScoreComponent} from "../components/ScoreComponent";
import {NormalRankComponent} from "../components/NormalRankComponent";
import {IdentityComponent} from "../../ecs/components/player/IdentityComponent";

export interface PlayerScoreUpdateEvent {
    playerName: string;
    score: number;
}

export class SubmitWordCommandSystem extends System {
    private logger = createScopedLogger('SubmitWordCommandSystem');

    requiredComponents: ComponentType[] = [NormalRankComponent, SubmitWordCommandComponent];

    update(_deltaTime: number, playerEntities: number[], ecManager: ECManager, eventSystem: TypedEventEmitter): void {
        this.logger.context('update').info('Processing submit word commands', {playerEntities});
        playerEntities.forEach(playerEntity => {
            const gameEntity = ecManager.queryEntities()
                .withChild(playerEntity)
                .withComponent(IdentityComponent)
                .getOne();
            const gridComponent = ecManager.getComponent(gameEntity, GridComponent);
            const submitWordCommand = ecManager.getComponent(playerEntity, SubmitWordCommandComponent);
            const pathLetterTiles = this.getPathLetterTiles(submitWordCommand.wordPath, gridComponent.grid);
            const score = this.defaultWordScoreCalculator(pathLetterTiles);

            // Update the player's score
            const playerScoreComponent = ecManager.getComponent(playerEntity, ScoreComponent);
            playerScoreComponent.score += score;
            ecManager.removeComponent(playerEntity, SubmitWordCommandComponent);

            // Emit the player's score update
            const gameIdentityComponent = ecManager.getComponent(gameEntity, IdentityComponent);
            const playerIdentityComponent = ecManager.getComponent(playerEntity, IdentityComponent);
            this.logger.context('update').debug('Emitting player score update', {playerEntity, score, gameIdentity: gameIdentityComponent.identity});
            eventSystem.emitTargeted<PlayerScoreUpdateEvent>('playerScoreUpdate', gameIdentityComponent.identity, {
                playerName: playerIdentityComponent.identity,
                score: playerScoreComponent.score
            })

            this.logger.context('update').info('Player score updated', {playerEntity, score});
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
