export type PlayerUUID = string;
export type Timestamp = number;
export type LastSeen = Timestamp | undefined;
export type Player = {
    uuid: PlayerUUID;
    username: string;
    lastSeen: LastSeen;
    isConnected: boolean;
};