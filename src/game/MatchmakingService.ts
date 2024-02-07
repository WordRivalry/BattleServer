import {GameSessionManager} from "./GameSessionManager";
import {Player} from "./gameSession/GameSessionPlayerService";
import {createScopedLogger} from "../logger/Logger";


class MatchmakingService {
    private queueService: QueueService;
    private gameSessionManager: GameSessionManager; // Ref
    private logger = createScopedLogger('MatchmakingService');

    constructor(
        gameSessionManager: GameSessionManager
    ) {
        this.queueService = new QueueService();
        this.gameSessionManager = gameSessionManager;
    }

    public addPlayerToQueue(player: Player) {
        this.queueService.addPlayer(player);
        this.findMatches();
    }

    public removePlayerFromQueue(playerUUID: string) {
        this.queueService.removePlayer(playerUUID);
    }

    public isPlayerInQueue(playerUUID: string): boolean {
        return this.queueService.isPlayerInQueue(playerUUID);
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

            this.logger.info(`Match found between ${player1.uuid} and ${player2.uuid}`);

            // Pass matched players to RankGameService
            this.gameSessionManager.startNewGame([player1, player2]);
        }
    }
}

class QueueService {
    private queue: Player[] = [];
    private logger = createScopedLogger('QueueService');

    public addPlayer( player: Player) {
        // Guard clause to prevent duplicate players in the queue
        if (this.queue.some(p => p.uuid === player.uuid)) {
            this.logger.warn(`Player ${player.uuid} is already in the queue.`);
            return;
        }

        this.queue.push(player);
        this.logger.info(`Player ${player.uuid} added to queue.`);
    }

    public removePlayer(uuid: string) {
        this.queue = this.queue.filter(player => player.uuid !== uuid);
        this.logger.info(`Player ${uuid} removed from queue.`);
    }

    public getQueue(): Player[] {
        return this.queue;
    }

    public clearQueue() {
        this.queue = [];
        this.logger.info('Queue cleared.');
    }

    public queueLength(): number {
        return this.queue.length;
    }

    public getPlayers(): Player[] {
        return this.queue;
    }

    public isPlayerInQueue(uuid: string): boolean {
        return this.queue.some(player => player.uuid === uuid);
    }
}


export default MatchmakingService
