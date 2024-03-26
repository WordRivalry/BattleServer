// APIManager.ts
import express from "express";
import cors from "cors";
import {createScopedLogger} from "../logger/logger";
import {PlayerMetadata} from "../framework/GameSessionManager";

export interface IHttpRequestHandler {
    handleRequestAlloc(playersMetadata: PlayerMetadata[], gameMode: string, modeType: string): string;
}

export class HttpManager {
    private logger = createScopedLogger("HttpManager");

    constructor(private app: express.Application, private requestHandler: IHttpRequestHandler) {
        this.app.use(cors());
        this.app.use(express.json());
        this.setupRoutes();
    }

    private setupRoutes(): void {
        this.app.get("/health", (req, res) => {
            res.status(200).send("OK");
        });

        this.app.get("/", (req, res) => {
            res.send("Word Rivalry Battle Server ");
        });

        this.app.post("/request-alloc", (req, res) => {
            try {

                this.logger.context("handleRequestAlloc").info("Received request:", req.body);
                if (!req.body.gameMode || !req.body.modeType || !req.body.playersMetadata) {
                    res.status(400).send("Bad Request");
                    return;
                }
                const playersMetadata = req.body.playersMetadata as PlayerMetadata[];
                const gameMode = req.body.gameMode;
                const modeType = req.body.modeType;

                const gameSessionId = this.requestHandler.handleRequestAlloc(
                    playersMetadata,
                    gameMode,
                    modeType
                );

                res.status(200).send({gameSessionId: gameSessionId});
            } catch (error) {
                this.logger
                    .context("handleRequestAlloc")
                    .error("An error occured:", error);
                res.status(500).send("Internal Server Error");
            }
        });
    }
}
