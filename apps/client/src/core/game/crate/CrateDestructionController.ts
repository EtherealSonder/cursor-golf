import type { CrateDestructionCause, CrateDestructionState } from "./CrateDestructionDefinition";
export class CrateDestructionController {
    private stateValue: CrateDestructionState = "active";
    private causeValue: CrateDestructionCause | null = null;
    public get state(): CrateDestructionState { return this.stateValue; }
    public get cause(): CrateDestructionCause | null { return this.causeValue; }
    public begin(cause: CrateDestructionCause): boolean {
        if (this.stateValue !== "active") return false;
        this.stateValue = "destroying";
        this.causeValue = cause;
        return true;
    }
    public finish(): void { this.stateValue = "removed"; }
}
