import QueueService from './QueueService';
import {GameSessionManager} from "./GameSessionManager";
import {
    ExperimentalPlayerLifecycleService,
    PlayerInfo,
    PlayerLifecycleEvents,
    PlayerState
} from "./ExperimentalPlayerService";
class MatchmakingService {
    private queueService: QueueService;
    private gameSessionManager: GameSessionManager; // Ref
    private playerService: ExperimentalPlayerLifecycleService; // Ref

    constructor(
        gameSessionManager: GameSessionManager,
        playerLifecycleService: ExperimentalPlayerLifecycleService
    ) {
        this.queueService = new QueueService();
        this.gameSessionManager = gameSessionManager;
        this.playerService = playerLifecycleService;

        this.setupEventListeners();
    }

    private setupEventListeners() {
        this.playerService.events.on(PlayerLifecycleEvents.PLAYER_STATE_CHANGED(PlayerState.InQueue), (player: PlayerInfo) => {
            this.queueService.addPlayer(player);
            this.findMatches();
        });

        this.playerService.events.on(PlayerLifecycleEvents.PLAYER_DISCONNECTED, (playerUUID: string) => {
            this.handlePlayerDisconnection(playerUUID);
        });
    }

    private handlePlayerDisconnection(playerUUID: string) {
        if (this.queueService.isPlayerInQueue(playerUUID)) {
            this.queueService.removePlayer(playerUUID);
            console.log(`Removed disconnected player ${playerUUID} from queue.`);
        }
    }

    public findMatches() {
        // Example matchmaking logic
        const queue = this.queueService.getQueue();
        if (queue.length >= 2) {
            const player1 = queue[0];
            const player2 = queue[1];

            // Remove matched players from queue
            this.queueService.removePlayer(player1.uuid);
            this.queueService.removePlayer(player2.uuid);

            // Pass matched players to RankGameService
            this.gameSessionManager.startNewGame([player1, player2]);
        }
    }
}

export default MatchmakingService
