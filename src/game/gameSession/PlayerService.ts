import {Player} from "../QueueService";
import {PlayerUUID} from "./GameEngine";

export class PlayerService {
    private players: Map<PlayerUUID, Player> = new Map();

    public addPlayer(player: Player): void {
        this.players.set(player.uuid, player);
    }

    public forEachPlayer(callback: (player: Player) => void): void {
        for (const player of this.players.values()) {
            callback(player);
        }
    }

    public getPlayerCount(): number {
        return this.players.size;
    }

    public clearPlayers(): void {
        this.players.clear();
    }

    public hasPlayer(playerUuid: PlayerUUID): boolean {
        return this.players.has(playerUuid);
    }

    public getAllPlayerUUIDs(): PlayerUUID[] {
        return Array.from(this.players.keys());
    }

    public getAllUsernames(): string[] {
        return Array.from(this.players.values()).map(player => player.username);
    }

    public removePlayer(playerUuid: PlayerUUID): boolean {
        return this.players.delete(playerUuid);
    }

    public getPlayer(playerUuid: PlayerUUID): Player | undefined {
        return this.players.get(playerUuid);
    }

    public getAllPlayers(): Iterable<Player> {
        return this.players.values();
    }
}
