// __tests__/unit/QueueService.test.ts
import { QueueService } from "../../src/modules/matchmaking/QueueService"; // Adjust the import path as necessary
import { createScopedLogger } from "../../src/logger/Logger";
import { Player } from "../../src/modules/player/Player"; // Adjust import path

jest.mock("../../src/logger/Logger"); // Adjust the import path as necessary

describe('QueueService', () => {
    let queueService: QueueService;
    const player1: Player = { uuid: "player1", username: "Player 1", elo: 1200 }; // Mock player objects
    const player2: Player = { uuid: "player2", username: "Player 2", elo: 1250 };
    const gameType = "Ranked";

    beforeEach(() => {
        queueService = new QueueService();
    });

    test('addPlayer adds a player to the queue', () => {
        queueService.addPlayer(player1, gameType, player1.elo);
        expect(queueService.getQueue(gameType)).toContainEqual({ player: player1, gameType, elo: player1.elo });
    });

    test('addPlayer does not add a duplicate player to the same queue', () => {
        queueService.addPlayer(player1, gameType, player1.elo);
        queueService.addPlayer(player1, gameType, player1.elo); // Attempt to add again
        expect(queueService.getQueue(gameType).length).toBe(1); // Still only one instance
    });

    test('removePlayer removes a player from the queue', () => {
        queueService.addPlayer(player1, gameType, player1.elo);
        queueService.removePlayer(gameType, player1.uuid);
        expect(queueService.getQueue(gameType)).not.toContainEqual({ player: player1, gameType, elo: player1.elo });
    });

    test('isPlayerInQueue correctly reports player presence in queue', () => {
        queueService.addPlayer(player1, gameType, player1.elo);
        expect(queueService.isPlayerInQueue(gameType, player1.uuid)).toBeTruthy();
        expect(queueService.isPlayerInQueue(gameType, player2.uuid)).toBeFalsy();
    });

    test('getQueue returns the correct queue items for a game type', () => {
        queueService.addPlayer(player1, gameType, player1.elo);
        queueService.addPlayer(player2, gameType, player2.elo);
        const queue = queueService.getQueue(gameType);
        expect(queue.length).toBe(2);
        expect(queue).toEqual(expect.arrayContaining([
            { player: player1, gameType, elo: player1.elo },
            { player: player2, gameType, elo: player2.elo }
        ]));
    });
});
