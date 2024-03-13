// import {ScoreComponent} from "../components/ScoreComponent";
// import {TypedEventEmitter} from "../../ecs/systems/TypedEventEmitter";
// import {GridComponent} from "../components/game/GridComponent";
// import {ISystem} from "../../ecs/systems/System";
// import {EntityManager} from "../../ecs/entities/EntityManager";
// import {ComponentManager} from "../../ecs/components/ComponentManager";
// import {Entity} from "../../ecs/entities/entity";
// import {GameEvent} from "../../../GameSession/GameEventsEmitter";
// import {PlayerActionPayload} from "../../../server_networking/WebSocketMessageHandler";
// import {PlayerIdentityComponent} from "../../ecs/components/player/PlayerIdentityComponent";
// import {PlayerActionType, PublishWordData} from "../../../server_networking/validation/messageType";
// import {Path} from "../../OldGameEngine";
// import {LetterGrid, LetterTile} from "../../LetterGrid";
// import {PlayerConnectionComponent} from "../../ecs/components/player/PlayerConnectionComponent";
// import {PlayerCommunication} from "../../ecs/systems/PlayerCommunicationSystem";
// import {createScopedLogger} from "../../../logger/logger";
//
// export class ScoreSystem implements ISystem {
//
//     private logger = createScopedLogger('ScoreSystem');
//     requiredComponents = [];
//
//
//     init(entityManager: EntityManager, componentManager: ComponentManager, eventSystem: TypedEventEmitter): void {
//         eventSystem.subscribeGeneric(GameEvent.PLAYER_ACTION, (payload: PlayerActionPayload) => {
//             this.handlePlayerAction(entityManager, componentManager, payload, eventSystem)
//         })
//     }
//
//     update(deltaTime: number, entities: Entity[], componentManager: ComponentManager, eventSystem: TypedEventEmitter): void {
//         throw new Error("Method not implemented.");
//     }
//
//     private handlePlayerAction(entityManager: EntityManager, componentManager: ComponentManager, payload: PlayerActionPayload, eventSystem: TypedEventEmitter): void {
//         const gameSessionUUID = payload.gameSessionUUID;
//         const playerUUID = payload.playerUUID;
//
//         const gameEntity = entityManager
//             .getAllEntities()
//             .find(entity => entity.uuid === gameSessionUUID);
//         if (gameEntity === undefined) throw new Error("Game entity not found");
//
//         const gridComponent = componentManager.getComponent(gameEntity, GridComponent);
//         if (gridComponent === undefined) throw new Error("Grid component not found");
//
//         const playerEntity = entityManager
//             .getChildrenWithComponent(gameEntity, PlayerIdentityComponent)
//             .find(entity => entity.uuid === playerUUID);
//         if (playerEntity === undefined) throw new Error("Player entity not found");
//
//         const scoreComponent = componentManager.getComponent(playerEntity, ScoreComponent);
//
//         if (payload.action.payload.playerAction === PlayerActionType.PUBLISH_WORD) {
//             const wordPath = (payload.action.payload.data as PublishWordData).wordPath;
//             const word = this.getPathLetterTiles(wordPath, gridComponent.grid);
//             const baseScore = this.defaultWordScoreCalculator(word);
//             scoreComponent.score += baseScore;
//
//             // Send the score update to the other player
//             const otherPlayerEntity = entityManager
//                 .getChildrenWithComponent(gameEntity, PlayerIdentityComponent)
//                 .find(entity => entity.uuid !== playerUUID);
//             if (otherPlayerEntity === undefined) throw new Error("Other player entity not found");
//
//             const otherPlayerConnectionComponent = componentManager.getComponent(otherPlayerEntity, PlayerConnectionComponent);
//             if (otherPlayerConnectionComponent === undefined) throw new Error("Other player connection component not found");
//
//             eventSystem.emitGeneric<PlayerCommunication>('sendMessageToPlayer', {
//                 type: 'opponentScoreUpdate',
//                 gameSessionUUID: gameSessionUUID,
//                 playerUUID: playerUUID,
//                 payload: {
//                     newScore: scoreComponent.score
//                 }
//             });
//         }
//     }
//
//     private getPathLetterTiles(path: Path, grid: LetterGrid): LetterTile[] {
//         const letterTiles: LetterTile[] = [];
//         if (!Array.isArray(path) || path.some(part => !Array.isArray(part) || part.length !== 2)) {
//             this.logger.context('getPathLetterTiles').error('Invalid path format');
//             console.error('Invalid path format');
//             return [];
//         }
//         for (const [row, col] of path) {
//             // Ensure the row and col are within the bounds of the grid
//             if (row >= 0 && row < grid.length && col >= 0 && col < grid[row].length) {
//                 const tile = grid[row][col];
//                 letterTiles.push(tile);
//             } else {
//                 this.logger.context('getPathLetterTiles').error('Invalid path coordinates', {row, col});
//             }
//         }
//         return letterTiles;
//     }
//
//     private defaultWordScoreCalculator(word: LetterTile[]): number {
//         let score = 0;
//         let wordMultipliers = [];
//         // Calculate base score for the word
//         for (let letter of word) {
//             score += letter.value * letter.multiplierLetter;
//             if (letter.multiplierWord > 1) {
//                 wordMultipliers.push(letter.multiplierWord);
//             }
//         }
//         // Apply word multipliers if any
//         for (let wordMultiplier of wordMultipliers) {
//             score *= wordMultiplier;
//         }
//         return score;
//     }
// }
