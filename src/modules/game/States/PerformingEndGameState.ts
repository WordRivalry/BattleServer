// PerformingEndGameState.ts
import {State} from "../../ecs/components/StateMachine/State";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {GridComponent} from "../components/game/GridComponent";
import {IdentityComponent} from "../../ecs/components/player/IdentityComponent";
import {GameSessionNetworking} from "../../oldButNew/GameSessionNetworking";
import {createScopedLogger} from "../../logger/logger";
import {ScoreComponent} from "../components/ScoreComponent";

export class PerformingEndGameState extends State {

    private readonly logger = createScopedLogger('PerformingEndGameState')

    constructor(private readonly sessionNetworking: GameSessionNetworking) {
        super();
    }

    enter(entity: number, ecManager: ECManager, eventSystem: TypedEventEmitter) {
        const gridComponent = ecManager.getComponent(entity, GridComponent);
        const identityComponent = ecManager.getComponent(entity, IdentityComponent);
        const playerEntities = ecManager
            .queryEntities()
            .withParent(entity)
            .withComponent(IdentityComponent)
            .execute();

        // Tuple of playerIdentity and their score
        const playerScores: [IdentityComponent, ScoreComponent][] = [];
        playerEntities.forEach((playerEntity) => {
            const scoreComponent = ecManager.getComponent(playerEntity, ScoreComponent);
            const playerIdentity = ecManager.getComponent(playerEntity, IdentityComponent);
            playerScores.push([playerIdentity, scoreComponent]);
        });

        // Sort by score
        playerScores.sort((a, b) => {
            return b[1].score - a[1].score;
        });

        // Broadcast end game
        this.sessionNetworking.broadcastMessage('EndGameResult', {
            winner: playerScores[0][0].identity,
            grid: gridComponent.grid,
            scores: playerScores.map(([playerIdentity, scoreComponent]) => {
                return {
                    playerId: playerIdentity.identity,
                    score: scoreComponent.score
                }
            })
        });

        eventSystem.emitTargeted('endGame', identityComponent.identity, {});
    }

    update(_deltaTime: number, entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        ecManager.addTag(entity, 202);
    }

    exit(entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        ecManager.removeTag(entity, 202);
    }
}