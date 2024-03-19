import {System} from "../../ecs/systems/System";
import {ComponentType} from "../../ecs/components/ComponentManager";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {GameEvent} from "../../ecs/systems/network/NetworkSystem";
import {Path, PublishWordData} from "../../server_networking/validation/messageType";
import {LetterGrid, LetterTile} from "../LetterGrid";
import {createScopedLogger} from "../../logger/logger";
import {GameIdentityComponent} from "../components/game/GameIdentityComponent";
import {GridComponent} from "../components/game/GridComponent";
import {ScoreComponent} from "../components/ScoreComponent";
import {IdentityComponent} from "../../ecs/components/player/IdentityComponent";
import {PlayerActionPayload} from "../../server_networking/WebSocketMessageHandler";
import {PlayerConnectionComponent} from "../../ecs/components/player/PlayerConnectionComponent";
import {PlayerCommunication} from "../../ecs/systems/network/PlayerCommunicationSystem";

export class ActionEventSystem extends System {

    private readonly logger = createScopedLogger('ActionEventSystem');


    requiredComponents: ComponentType[] = [];

    init(ecManager: ECManager, eventSystem: TypedEventEmitter): void {
        eventSystem.subscribeGeneric<PlayerActionPayload>(GameEvent.PLAYER_ACTION, (payload: PlayerActionPayload) => {
            const data = payload.action.payload.data as PublishWordData;
            const wordPath = data.wordPath;

            const playerEntity = ecManager.queryEntities()
                .withComponentCondition(
                    IdentityComponent,
                    (component) => component.playerUUID === payload.playerName
                )
                .getOne();

            const gameEntity = ecManager.queryEntities()
                .withComponent(GameIdentityComponent)
                .withChild(playerEntity)
                .getOne();

            const gridComponent = ecManager.getComponent(gameEntity, GridComponent);
            const pathLetterTiles = this.getPathLetterTiles(wordPath, gridComponent.grid);
            const score = this.defaultWordScoreCalculator(pathLetterTiles);

            // Update the player's score
            const playerScoreComponent = ecManager.getComponent(playerEntity, ScoreComponent);
            playerScoreComponent.score += score;

            // Send score to the opponent player
            const opponentPlayerEntity = ecManager.queryEntities()
                .withComponentCondition(
                    IdentityComponent,
                    (component) => component.playerUUID !== payload.playerName
                )
                .getOne();
            const opponentUUID = ecManager.getComponent(opponentPlayerEntity, IdentityComponent).playerUUID;

            const opponentConnection = ecManager.getComponent(opponentPlayerEntity, PlayerConnectionComponent);
            eventSystem.emitGeneric<PlayerCommunication>('sendMessageToPlayer', {
                type: 'scoreUpdate',
                socket: opponentConnection.socket,
                playerUUID: opponentUUID,
                payload: { score: playerScoreComponent.score }
            });
        });
    }

    update(deltaTime: number, entities: number[], ecsManager: ECManager, eventSystem: TypedEventEmitter): void {
        throw new Error("Event system should not be calling update on ActionEvent");
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