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
    /** Void removal is visual-only: do not request the normal smoke destruction effect. */
    public beginVoidRemoval(): boolean {
        if (this.stateValue !== "active") return false;
        this.stateValue = "destroying";
        return true;
    }
    public finish(): void { this.stateValue = "removed"; }
}
