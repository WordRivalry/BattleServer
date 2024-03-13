
class InputMapping {
    mapping: Map<string, (entityId: number, parameters: any) => void>;

    constructor() {
        this.mapping = new Map();
    }

    addAction(inputType: string, action: (entityId: number, parameters: any) => void) {
        this.mapping.set(inputType, action);
    }

    getAction(inputType: string) {
        return this.mapping.get(inputType);
    }
}
