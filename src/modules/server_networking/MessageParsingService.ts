// MessageParsingService.ts
import { RawData } from 'ws';
import {
    InvalidActionFormatError,
    InvalidJoinGameSessionActionError,
    InvalidJsonError,
    InvalidLeaveGameSessionActionError,
    InvalidPlayerAction_PublishWordError, InvalidPlayerAction_SendChatMessageError,
    InvalidPlayerActionError,
    ValidationFailedError
} from "../error/Error";
import { JoinGameSessionAction, LeaveGameSessionAction, PlayerAction, WebSocketAction, ActionType, PlayerAction_PublishWord, PlayerAction_SendChatMessage, PlayerActionType } from './validation/messageType';
import { actionFormatSchema, joinGameSessionActionSchema, leaveGameSessionActionSchema, playerActionSchema, playerAction_PublishWord, playerAction_SendChatMessage } from './validation/validationSchema';

export class MessageParsingService {
    public static parseAndValidateMessage(message: RawData): JoinGameSessionAction | LeaveGameSessionAction | PlayerAction {
        const json = this.messageToJSON(message);

        const actionFormatValidation = actionFormatSchema.validate(json, { allowUnknown: false });
        if (actionFormatValidation.error) {
            throw new InvalidActionFormatError(actionFormatValidation.error);
        }

        const action: WebSocketAction = actionFormatValidation.value;
        return this.validateAction(action);
    }

    private static messageToJSON(message: RawData): any {
        try {
            return JSON.parse(message.toString());
        } catch (error) {
            throw new InvalidJsonError(error);
        }
    }

    private static validateAction(action: WebSocketAction): JoinGameSessionAction | LeaveGameSessionAction | PlayerAction  {
        switch (action.type) {
            case ActionType.JOIN_GAME_SESSION:
                return this.validateJoinGameSessionAction(action);
            case ActionType.PLAYER_LEFT_SESSION:
                return this.validateLeaveGameSessionAction(action);
            case ActionType.PLAYER_ACTION:
                return this.validatePlayerAction(action);
            default:
                throw new ValidationFailedError()
        }
    }

    private static validateJoinGameSessionAction(action: WebSocketAction): JoinGameSessionAction {
        const validation = joinGameSessionActionSchema.validate(action, { allowUnknown: false });
        if (validation.error) {
            throw new InvalidJoinGameSessionActionError(validation.error);
        }
        return validation.value;
    }

    private static validateLeaveGameSessionAction(action: WebSocketAction): LeaveGameSessionAction {
        const validation = leaveGameSessionActionSchema.validate(action, { allowUnknown: false });
        if (validation.error) {
            throw new InvalidLeaveGameSessionActionError(validation.error);
        }
        return validation.value;
    }

    private static validatePlayerAction(action: WebSocketAction): PlayerAction_PublishWord | PlayerAction_SendChatMessage {

        const playerAction = playerActionSchema.validate(action, { allowUnknown: false });
        if (playerAction.error) {
            throw new InvalidPlayerActionError(playerAction.error);
        }

        return this.validatePlayerActionHelper(playerAction.value);
    }

    private static validatePlayerActionHelper(action: PlayerAction): PlayerAction_PublishWord | PlayerAction_SendChatMessage {
        switch (action.payload.playerAction) {
            case PlayerActionType.PUBLISH_WORD:
                return this.validatePlayerActionPayload_PublishWord(action);
            case PlayerActionType.SEND_CHAT_MESSAGE:
                return this.validatePlayerActionPayload_SendChatMessage(action);
            default:
                throw new ValidationFailedError();
        }
    }

    private static validatePlayerActionPayload_PublishWord(action: WebSocketAction): PlayerAction_PublishWord {
        const validation = playerAction_PublishWord.validate(action);
        if (validation.error) {
            throw new InvalidPlayerAction_PublishWordError(validation.error);
        }
        return validation.value;
    }

    private static validatePlayerActionPayload_SendChatMessage(action: WebSocketAction): PlayerAction_SendChatMessage {
        const validation = playerAction_SendChatMessage.validate(action);
        if (validation.error) {
            throw new InvalidPlayerAction_SendChatMessageError(validation.error);
        }
        return validation.value;
    }
}
