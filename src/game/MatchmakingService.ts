import QueueService from './QueueService';
import {GameSessionManager} from "./gameSession/GameSessionManager";
class MatchmakingService {
    private queueService: QueueService;
    private gameSessionManager: GameSessionManager;

    constructor(queueService: QueueService, gameSessionManager: GameSessionManager) {
        this.queueService = queueService;
        this.gameSessionManager = gameSessionManager;
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
            this.gameSessionManager.startNewGame(player1, player2, player1.uuid, player2.uuid);
        }
    }
}

export default MatchmakingService
