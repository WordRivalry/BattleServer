// InProgressState.ts
import {State} from "../../ecs/components/StateMachine/State";
import {ECManager} from "../../ecs/ECManager";
import {TimerComponent} from "../../ecs/components/TimerComponent";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {GameSessionNetworking} from "../../oldButNew/GameSessionNetworking";
import {createScopedLogger} from "../../logger/logger";
import {NormalRankGameEvent, PublishWordEvent} from "../../oldButNew/NormalRankGameSession";
import {IdentityComponent} from "../../ecs/components/player/IdentityComponent";
import {Path} from "../../server_networking/validation/messageType";
import {LetterGrid, LetterTile} from "../LetterGrid";
import {GridComponent} from "../components/game/GridComponent";
import {ScoreComponent} from "../components/ScoreComponent";
import {PlayerScoreUpdateEvent} from "../systems/SubmitWordCommandSystem";

export class InProgressState extends State {
    private readonly logger = createScopedLogger('InProgressState')
    private listenerCancel: (() => void) | undefined;

    constructor(private readonly sessionNetworking: GameSessionNetworking) {super();}

    enter(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        this.logger.context('enter').info('Entering in progress state');

        // Set timer
        const timerComponent = new TimerComponent(15000, false);
        ecManager.addComponent(entity, TimerComponent, timerComponent);

        // Broadcast match duration
        this.sessionNetworking.broadcastMessage('MatchDuration', {
            countdown: timerComponent.duration
        });

        // Player Entities
        const playerEntities = ecManager.queryEntities()
            .withComponents([IdentityComponent, ScoreComponent])
            .withParent(entity)
            .execute();

        // Listen for player actions
        const gameIdentityComponent = ecManager.getComponent(entity, IdentityComponent);
        const gridComponent = ecManager.getComponent(entity, GridComponent);
        this.listenerCancel = eventSystem.subscribeTargeted<PublishWordEvent>(NormalRankGameEvent.PUBLISH_WORD, gameIdentityComponent.identity, (event) => {
            this.handleWordPublished(event, gridComponent, playerEntities, ecManager, gameIdentityComponent, eventSystem);
        });
    }

    update(_deltaTime: number, entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        const timerComponent = ecManager.getComponent(entity, TimerComponent);
        this.sessionNetworking.broadcastMessage('countdown', {
            countdown: timerComponent.duration - timerComponent.elapsedTime
        });

        this.logger.context('update').debug('Updating in progress state');
    }
    exit(entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        ecManager.removeComponent(entity, TimerComponent);
        this.listenerCancel?.()
        this.logger.context('exit').info('Exiting in progress state');
    }

    private handleWordPublished(event: PublishWordEvent, gridComponent: GridComponent, playerEntities: number[], ecManager: ECManager, gameIdentityComponent: IdentityComponent, eventSystem: TypedEventEmitter) {
        const pathLetterTiles = this.getPathLetterTiles(event.wordPath, gridComponent.grid);
        const score = this.defaultWordScoreCalculator(pathLetterTiles);

        // Update the player's score
        const playerEntity = playerEntities
            .filter(playerEntity => ecManager.getComponent(playerEntity, IdentityComponent).identity === event.playerName)
            .pop();
        if (playerEntity === undefined) throw new Error('Player not found');
        const playerScoreComponent = ecManager.getComponent(playerEntity, ScoreComponent);
        playerScoreComponent.score += score;

        // Emit the player's score update
        const playerIdentityComponent = ecManager.getComponent(playerEntity, IdentityComponent);
        this.logger.context('update').debug('Emitting player score update', {playerEntity, score, gameIdentity: gameIdentityComponent.identity});
        eventSystem.emitTargeted<PlayerScoreUpdateEvent>('playerScoreUpdate', gameIdentityComponent.identity, {
            playerName: playerIdentityComponent.identity,
            score: playerScoreComponent.score
        })
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