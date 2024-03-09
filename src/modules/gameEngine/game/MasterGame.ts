import {PlayerMetadata} from "../../GameSession/GameSessionManager";
import {GameSessionStateComponent} from "./components/game/GameSessionStateComponent";
import {SessionState} from "../../GameSession/GameSession";
import {PlayerIdentityComponent} from "./components/player/PlayerIdentityComponent";
import {PlayerConnectionComponent} from "./components/player/PlayerConnectionComponent";
import {GridPoolSystem} from "./systems/GridPoolSystem";
import {GameMode, ModeType} from "../../server_networking/validation/messageType";
import {ScoreComponent} from "./components/ScoreComponent";
import {GameMessageComponent} from "./components/game/GameMessageComponent";
import {NetworkSystem} from "./systems/NetworkSystem";
import {GameEngine} from "../ecs/GameEngine";
import {TimerSystem} from "../ecs/systems/TimerSystem";

export class MasterGame {

    private readonly gameEngine: GameEngine;

    constructor() {
        this.gameEngine = new GameEngine();
        this.initializeGameSystems();
    }

    private initializeGameSystems(): void {

        const networkSystem = new NetworkSystem(
            this.gameEngine.eventSystem,
            this.gameEngine.entityManager,
            this.gameEngine.componentManager
        );

        this.gameEngine.systemManager.registerSystem(networkSystem, 0);
        this.gameEngine.systemManager.registerSystem(new GridPoolSystem(), 1);
    }

    public start(): void {
        this.gameEngine.start();
    }

    public stop(): void {
        this.gameEngine.stop();
    }

    // API to create a new game
    public createGame(playersMetadata: PlayerMetadata[], gameMode: GameMode, modeType: ModeType): string {
        const gameEntity = this.createGameEntity(gameMode, modeType);
        const playersEntity = this.createPlayerEntities(playersMetadata);

        // Link players to game
        playersEntity.forEach(playerEntity => this.gameEngine.linkChildToParent(gameEntity, playerEntity));

        return gameEntity.uuid;
    }

    private createGameEntity(gameMode: GameMode, modeType: ModeType) {
        const gameEntity = this.gameEngine.createEntity();

        // Game session component
        const gameSessionComponent = new GameSessionStateComponent(SessionState.WAITING, gameMode, modeType);
        this.gameEngine.attachComponent(gameEntity, GameSessionStateComponent, gameSessionComponent);

        // Game Message component
        const gameMessageComponent = new GameMessageComponent();
        this.gameEngine.attachComponent(gameEntity, GameMessageComponent, gameMessageComponent);

        return gameEntity;
    }

    private createPlayerEntities(playersMetadata: PlayerMetadata[]) {
        return playersMetadata.map(playerMetadata => {
            const playerEntity = this.gameEngine.createEntity();

            // Player identity component
            this.gameEngine.attachComponent(
                playerEntity,
                PlayerIdentityComponent,
                new PlayerIdentityComponent(playerMetadata.uuid, playerMetadata.username)
            );

            // Player connection component
            this.gameEngine.attachComponent(
                playerEntity,
                PlayerConnectionComponent,
                new PlayerConnectionComponent()
            );

            // Add score component
            this.gameEngine.attachComponent(playerEntity, ScoreComponent, new ScoreComponent());

            return playerEntity;
        });
    }
}
