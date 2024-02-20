// __tests__/unit/MessageParsingService.test.ts
import { MessageParsingService } from '../../src/experimental/MessageParsingService';
import {
    InvalidActionFormatError,
    InvalidJoinGameSessionActionError,
    InvalidJsonError,
    InvalidLeaveGameSessionActionError,
    InvalidPlayerActionError,
    InvalidPlayerAction_PublishWordError,
    InvalidPlayerAction_SendChatMessageError,
    ValidationFailedError
} from '../../src/error/Error';
import { ActionType, PlayerActionType } from '../../src/validation/messageType';

describe('MessageParsingService', () => {

    describe('parseAndValidateMessage', () => {
        it('should throw InvalidJsonError for invalid JSON', () => {
            const invalidJson = '{invalid JSON';
            expect(() => MessageParsingService.parseAndValidateMessage(invalidJson as any)).toThrow(InvalidJsonError);
        });

        it('should throw InvalidActionFormatError for invalid action format', () => {
            const invalidActionFormat = JSON.stringify({ wrongField: 'test' });
            expect(() => MessageParsingService.parseAndValidateMessage(invalidActionFormat as any)).toThrow(InvalidActionFormatError);
        });

        it('should throw InvalidActionFormatError for unexpected action type', () => {
            const unexpectedActionType = JSON.stringify({ type: 'unexpectedType', payload: {} });
            expect(() => MessageParsingService.parseAndValidateMessage(unexpectedActionType as any)).toThrow(InvalidActionFormatError);
        });

        it('should throw InvalidJoinGameSessionActionError for invalid join game session action', () => {
            const invalidJoinGameSessionAction = JSON.stringify({ type: ActionType.JOIN_GAME_SESSION, payload: { invalidField: 'test' } });
            expect(() => MessageParsingService.parseAndValidateMessage(invalidJoinGameSessionAction as any)).toThrow(InvalidJoinGameSessionActionError);
        });

        it('should throw InvalidLeaveGameSessionActionError for invalid leave game session action', () => {
            const invalidLeaveGameSessionAction = JSON.stringify({ type: ActionType.LEAVE_GAME_SESSION, payload: {} });
            expect(() => MessageParsingService.parseAndValidateMessage(invalidLeaveGameSessionAction as any)).toThrow(InvalidLeaveGameSessionActionError);
        });

        describe('Player Actions', () => {
            it('should throw ValidationFailedError for invalid player action', () => {
                const invalidPlayerAction = JSON.stringify({ type: ActionType.PLAYER_ACTION, payload: { invalidField: 'test' } });
                expect(() => MessageParsingService.parseAndValidateMessage(invalidPlayerAction as any)).toThrow(ValidationFailedError);
            });

            it('should throw InvalidPlayerAction_PublishWordError for invalid publish word player action', () => {
                const invalidPublishWordAction = JSON.stringify({
                    type: ActionType.PLAYER_ACTION,
                    payload: {
                        playerAction: PlayerActionType.PUBLISH_WORD,
                        data: { wordPath: 'not an array' } // Assuming validation expects an array
                    }
                });
                expect(() => MessageParsingService.parseAndValidateMessage(invalidPublishWordAction as any)).toThrow(InvalidPlayerAction_PublishWordError);
            });

            it('should throw InvalidPlayerAction_SendChatMessageError for invalid send chat message player action', () => {
                const invalidSendChatMessageAction = JSON.stringify({
                    type: ActionType.PLAYER_ACTION,
                    payload: {
                        playerAction: PlayerActionType.SEND_CHAT_MESSAGE,
                        data: { message: 123 } // Assuming validation expects a string
                    }
                });
                expect(() => MessageParsingService.parseAndValidateMessage(invalidSendChatMessageAction as any)).toThrow(InvalidPlayerAction_SendChatMessageError);
            });

            it('should successfully parse and validate a valid publish word player action', () => {
                const validPublishWordAction = JSON.stringify({
                    type: ActionType.PLAYER_ACTION,
                    payload: {
                        playerAction: PlayerActionType.PUBLISH_WORD,
                        data: { wordPath: ['valid', 'array'] }
                    }
                });
                expect(() => MessageParsingService.parseAndValidateMessage(validPublishWordAction as any)).not.toThrow();
            });

            it('should successfully parse and validate a valid send chat message player action', () => {
                const validSendChatMessageAction = JSON.stringify({
                    type: ActionType.PLAYER_ACTION,
                    payload: {
                        playerAction: PlayerActionType.SEND_CHAT_MESSAGE,
                        data: { message: 'Valid message' }
                    }
                });
                expect(() => MessageParsingService.parseAndValidateMessage(validSendChatMessageAction as any)).not.toThrow();
            });
        });
    });
});
