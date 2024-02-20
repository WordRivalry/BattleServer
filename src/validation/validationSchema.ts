// src/validation/validationSchema.ts
import Joi from 'joi';
import {
    ActionType,
    JoinGameSessionAction,
    PlayerAction, PlayerAction_PublishWord, PlayerAction_SendChatMessage,
    PlayerActionType,
    PublishWordAction, PublishWordData, SendChatMessageAction, SendChatMessageData,
    WebSocketAction
} from "./messageType";

// Generic WebSocket action
export const actionFormatSchema = Joi.object<WebSocketAction>({
    type: Joi.string().valid(...Object.values(ActionType)).required(),
    payload: Joi.object(),
});

// Action schema for JoinGameSessionAction
export const joinGameSessionActionSchema = Joi.object<JoinGameSessionAction>({
    type: Joi.string().valid(ActionType.JOIN_GAME_SESSION).required()
});

// Action schema for LeaveGameSessionAction
export const leaveGameSessionActionSchema = Joi.object({
    type: Joi.string().valid(ActionType.LEAVE_GAME_SESSION).required()
});

// Player Action - Format
export const playerActionSchema = Joi.object<PlayerAction>({
    type: Joi.string().valid(ActionType.PLAYER_ACTION).required(),
    payload: Joi.object()
});

// Player Action - Publish Word

const pathSchema = Joi.array().items(
    Joi.array().ordered(
        Joi.number().required(), // Row
        Joi.number().required()  // Col
    ).length(2) // Ensure each tuple has exactly 2 numbers
).required();

const publishWordDataSchema = Joi.object<PublishWordData>({
    wordPath: pathSchema.required()
});
const publishWordSchema = Joi.object<PublishWordAction>({
    playerAction: Joi.string().valid(PlayerActionType.PUBLISH_WORD).required(),
    data: publishWordDataSchema.required()
});
export const playerAction_PublishWord = Joi.object<PlayerAction_PublishWord>({
    type: Joi.string().valid(ActionType.PLAYER_ACTION).required(),
    payload: publishWordSchema.required()
});

// Player Action - Send Chat Message
const sendChatMessageDataSchema = Joi.object<SendChatMessageData>({
    message: Joi.string().required()
});
const sendChatMessageActionSchema = Joi.object<SendChatMessageAction>({
    playerAction: Joi.string().valid(PlayerActionType.SEND_CHAT_MESSAGE).required(),
    data: sendChatMessageDataSchema.required()
});

export const playerAction_SendChatMessage = Joi.object<PlayerAction_SendChatMessage>({
    type: Joi.string().valid(ActionType.PLAYER_ACTION).required(),
    payload: sendChatMessageActionSchema.required()
});




