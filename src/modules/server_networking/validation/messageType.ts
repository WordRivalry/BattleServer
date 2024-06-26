// messageTypes.ts

export type Row = number;
export type Col = number;
export type Path = [Row, Col][];

export enum GameMode {
    RANK = 'RANK',
    QUICK_DUEL = 'QUICK_DUEL',
}

export enum ModeType {
    NORMAL = 'NORMAL',
    BLITZ = 'BLITZ',
}

export enum ActionType {
    JOIN_GAME_SESSION = 'JOIN_GAME_SESSION',
    PLAYER_LEFT_SESSION = 'LEAVE_GAME_SESSION',
    PLAYER_ACTION = 'PLAYER_ACTION',
    LEAVE_GAME_SESSION = 'LEAVE_GAME_SESSION',
}

export enum PlayerActionType {
    PUBLISH_WORD = 'PUBLISH_WORD',
    SEND_CHAT_MESSAGE = 'sendChatMessage',
}

// Generic WebSocket action
export interface WebSocketAction {
    type: ActionType;
    payload?: PlayerActionPayload;
}

// Join game session action
export interface JoinGameSessionAction {
    type: ActionType.JOIN_GAME_SESSION;
}

// Leave game session action
export interface LeaveGameSessionAction {
    type: ActionType.PLAYER_LEFT_SESSION;
}

// Player action
export interface PlayerAction {
    type: ActionType.PLAYER_ACTION;
    payload: PlayerActionPayload;
}

export interface PlayerActionPayload {
    playerAction: PlayerActionType;
    data: PublishWordData | SendChatMessageData;
}

// Player Action - Publish word
export interface PublishWordData {
    wordPath: Path;
}

export interface PublishWordAction {
    playerAction: PlayerActionType.PUBLISH_WORD;
    data: PublishWordData;
}

export interface PlayerAction_PublishWord {
    type: ActionType.PLAYER_ACTION;
    payload: PublishWordAction;
}

// Player Action -  Send chat message
export interface SendChatMessageData {
    message: string;
}

export interface SendChatMessageAction {
    playerAction: PlayerActionType.SEND_CHAT_MESSAGE;
    data: SendChatMessageData;
}

export interface PlayerAction_SendChatMessage {
    type: ActionType.PLAYER_ACTION;
    payload: SendChatMessageAction;
}

export interface Grid_fetch_data {
    // grid : [ [Array], [Array], [Array], [Array], [Array] ]
    grid: string[][],
    stats: {
        difficulty_rating: number,
        diversity_rating: number,
        total_words: number
    },
    valid_words: string[]
}


