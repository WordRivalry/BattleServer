// InputEvent.ts

export class Input {
    constructor(public playerUUID: string, public type: string, public parameters: any = {}) {
    }
}
