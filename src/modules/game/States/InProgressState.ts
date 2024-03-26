// InProgressState.ts
import {State} from "../../ecs/components/StateMachine/State";
import {ECManager} from "../../ecs/ECManager";
import {TimerComponent} from "../../ecs/components/TimerComponent";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {createScopedLogger} from "../../logger/logger";
import {NormalRankGameEvent, PlayerScoreUpdateEvent, PublishWordEvent} from "../normalRankGame/NormalRankGameSession";
import {IdentityComponent} from "../../ecs/components/player/IdentityComponent";
import {Path} from "../../server_networking/validation/messageType";
import {GridComponent} from "../components/grid/GridComponent";
import {ScoreComponent} from "../components/ScoreComponent";
import LetterComponent from "../components/grid/LetterComponent";
import {WordHistoricComponent} from "../components/WordHistoricComponent";

export class InProgressState extends State {
    private readonly logger = createScopedLogger('InProgressState')
    private listenerCancel: (() => void) | undefined;

    constructor(
        private readonly broadcastMessage: (type: string, payload: any) => void
    ) {
        super();
    }

    enter(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        this.logger.context('enter').info('Entering in progress state');

        // Set timer
        const timerComponent = ecManager.getComponent(entity, TimerComponent);
        timerComponent.duration = 15000;
        timerComponent.isActive = true;

        // Player Entities
        const playerEntities = ecManager.queryEntities()
            .withComponents([IdentityComponent, ScoreComponent])
            .withParent(entity)
            .execute();

        // Listen for PUBLISH_WORD
        const gameIdentityComponent = ecManager.getComponent(entity, IdentityComponent);
        this.listenerCancel = eventSystem.subscribeTargeted<PublishWordEvent>(NormalRankGameEvent.PUBLISH_WORD, gameIdentityComponent.identity, (event) => {
            this.handleWordPublished(event, entity, playerEntities, ecManager, eventSystem);
        });
    }

    update(_deltaTime: number, entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        const timerComponent = ecManager.getComponent(entity, TimerComponent);
        if (timerComponent.isActive) {
            this.broadcastMessage(NormalRankGameEvent.COUNTDOWN, {
                countdown: Math.round((timerComponent.duration - timerComponent.elapsedTime) / 1000)
            });
        } else {
            ecManager.addTag(entity, 200);
        }
        this.logger.context('update').debug('Updating in progress state');
    }

    exit(entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        ecManager.removeComponent(entity, TimerComponent);
        ecManager.removeTag(entity, 200);
        this.listenerCancel?.()
        this.logger.context('exit').info('Exiting in progress state');
    }

    private handleWordPublished(event: PublishWordEvent, gameEntity: number, playerEntities: number[], ecManager: ECManager, eventSystem: TypedEventEmitter) {
        const gridComponent = ecManager.getComponent(gameEntity, GridComponent);
        const gameIdentityComponent = ecManager.getComponent(gameEntity, IdentityComponent);
        const pathLetterTiles = this.getPathLetterTiles(event.wordPath, gridComponent.grid);
        const score = this.defaultWordScoreCalculator(pathLetterTiles);

        // Find the player entity
        const playerEntity = playerEntities
            .filter(playerEntity => ecManager.getComponent(playerEntity, IdentityComponent).identity === event.playerName)
            .pop();
        if (playerEntity === undefined) throw new Error('Player not found');

        // Store the word in the player's word history
        const timerComponent = ecManager.getComponent(gameEntity, TimerComponent);
        const wordHistoryComponent = ecManager.getComponent(playerEntity, WordHistoricComponent);
        const wordEntry = {
            word: pathLetterTiles.map(letter => letter.letter).join(''),
            path: event.wordPath,
            score: score,
            time: timerComponent.elapsedTime / 1000
        };
        wordHistoryComponent.historic.push(wordEntry);

        // Update the player's score
        const playerScoreComponent = ecManager.getComponent(playerEntity, ScoreComponent);
        playerScoreComponent.score += score;

        // Emit the player's score update
        const playerIdentityComponent = ecManager.getComponent(playerEntity, IdentityComponent);
        this.logger.context('update').debug('Emitting player score update', {playerEntity, score, gameIdentity: gameIdentityComponent.identity});
        eventSystem.emitTargeted<PlayerScoreUpdateEvent>(NormalRankGameEvent.PLAYER_SCORE_UPDATED, gameIdentityComponent.identity, {
            playerName: playerIdentityComponent.identity,
            score: playerScoreComponent.score
        })
    }

    private getPathLetterTiles(path: Path, grid: LetterComponent[][]): LetterComponent[] {
        const letterTiles: LetterComponent[] = [];
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

    private defaultWordScoreCalculator(word: LetterComponent[]): number {
        let score = 0;
        let wordMultipliers = [];
        // Calculate base score for the word
        for (let letter of word) {
            score += letter.value * letter.letterMultiplier;
            if (letter.wordMultiplier > 1) {
                wordMultipliers.push(letter.wordMultiplier);
            }
        }
        // Apply word multipliers if any
        for (let wordMultiplier of wordMultipliers) {
            score *= wordMultiplier;
        }
        return score;
    }
}