import { CRATE_FIRE } from "./CrateFireDefinition";
export type CrateFireState = "healthy" | "burning" | "burned";
/** One-shot ignition and deterministic burn independent of the smoke lifecycle. */
export class CrateFireController {
    private stateValue: CrateFireState = "healthy";
    private elapsed = 0;
    private presentationClaimed = false;
    public get status(): CrateFireState { return this.stateValue; }
    public get progress(): number { return this.stateValue === "healthy" ? 0 : Math.min(1, this.elapsed / (CRATE_FIRE.burnSeconds * 0.5)); }
    public get charProgress(): number { return Math.pow(Math.min(1, this.progress / CRATE_FIRE.charCompleteAt), 0.85); }
    public get opacity(): number { return 1; }
    public ignite(): boolean {
        if (this.stateValue !== "healthy") return false;
        this.stateValue = "burning";
        return true;
    }
    public claimPresentation(): boolean {
        if (this.stateValue !== "burning" || this.presentationClaimed) return false;
        this.presentationClaimed = true;
        return true;
    }
    public update(dt: number): boolean {
        if (this.stateValue !== "burning" || !Number.isFinite(dt) || dt <= 0) return false;
        this.elapsed += dt;
        if (this.elapsed < CRATE_FIRE.burnSeconds * 0.5) return false;
        this.stateValue = "burned";
        return true;
    }
}
