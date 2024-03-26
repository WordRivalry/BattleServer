// PerformingEndGameState.ts
import {State} from "../../ecs/components/StateMachine/State";
import {ECManager} from "../../ecs/ECManager";
import {TypedEventEmitter} from "../../ecs/TypedEventEmitter";
import {GridComponent} from "../components/grid/GridComponent";
import {IdentityComponent} from "../../ecs/components/player/IdentityComponent";
import {GameSessionNetworking} from "../../framework/GameSessionNetworking";
import {createScopedLogger} from "../../logger/logger";
import {ScoreComponent} from "../components/ScoreComponent";
import {NormalRankGameEvent} from "../normalRankGame/NormalRankGameSession";
import {WordHistoricComponent} from "../components/WordHistoricComponent";
import {EloRatingComponent} from "../components/EloRatingComponent";

export class ShowGameResultState extends State {
    private readonly logger = createScopedLogger('ShowGameResultState')

    constructor(
        private readonly broadcastMessage: (type: string, payload: any) => void
    ) {
        super();
    }

    enter(entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        this.logger.context('enter').info('Entering show game result state');
        const playerEntities = ecManager
            .queryEntities()
            .withParent(entity)
            .withComponent(IdentityComponent)
            .execute();

        // Tuple of playerIdentity and their score
        const playerScores: [IdentityComponent, EloRatingComponent, ScoreComponent, WordHistoricComponent][] = [];
        playerEntities.forEach((playerEntity) => {
            const playerIdentity = ecManager.getComponent(playerEntity, IdentityComponent);
            const playerEloRating = ecManager.getComponent(playerEntity, EloRatingComponent);
            const scoreComponent = ecManager.getComponent(playerEntity, ScoreComponent);
            const wordHistoryComponent = ecManager.getComponent(playerEntity, WordHistoricComponent);
            playerScores.push([playerIdentity, playerEloRating, scoreComponent, wordHistoryComponent]);
        });

        // Sort by score
        playerScores.sort((a, b) => {
            return b[2].score - a[2].score; // 2 for ScoreComponent
        });

        // Update Elo rating
        playerScores[0][1].eloRating += 20;
        playerScores[1][1].eloRating -= 20;

        // Broadcast end game
        this.broadcastMessage(NormalRankGameEvent.GAME_RESULT, {
            winner: playerScores[0][0].identity,
            playerResults: playerScores.map(([playerIdentity, playerEloRating, scoreComponent, wordHistoricComponent]) => {
                return {
                    playerName: playerIdentity.identity,
                    playerEloRating: playerEloRating.eloRating,
                    score: scoreComponent.score,
                    historic: wordHistoricComponent.historic
                }
            })
        });
    }

    update(_deltaTime: number, entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        this.logger.context('update').info('Updating show game result state');
        ecManager.addTag(entity, 200);
    }

    exit(entity: number, ecManager: ECManager, _eventSystem: TypedEventEmitter) {
        this.logger.context('exit').info('Exiting show game result state');
        ecManager.removeTag(entity, 200);
    }
}