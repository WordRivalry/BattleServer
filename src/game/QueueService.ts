import {PlayerInfo} from "./ExperimentalPlayerService";

class QueueService {
    private queue: PlayerInfo[] = [];

    public addPlayer( player: PlayerInfo) {
        // Guard clause to prevent duplicate players in the queue
        if (this.queue.some(p => p.uuid === player.uuid)) {
            console.log(`Player ${player.uuid} is already in the queue.`);
            return;
        }

        this.queue.push(player);
        console.log(`Player ${player.uuid} added to queue.`);
    }

    public removePlayer(uuid: string) {
        this.queue = this.queue.filter(player => player.uuid !== uuid);
        console.log(`Player ${uuid} removed from queue.`);
    }

    public getQueue(): PlayerInfo[] {
        return this.queue;
    }

    public clearQueue() {
        this.queue = [];
        console.log('Queue cleared.');
    }

    public queueLength(): number {
        return this.queue.length;
    }

    public getPlayers(): PlayerInfo[] {
        return this.queue;
    }

    public isPlayerInQueue(uuid: string): boolean {
        return this.queue.some(player => player.uuid === uuid);
    }
}

export default QueueService;
