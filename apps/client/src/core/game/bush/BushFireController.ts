import { BUSH_FIRE } from "./BushFireDefinition";

export type BushFireState = "healthy" | "burning" | "destroyed";

/** Idempotent ignition and deterministic elapsed-time lifecycle. */
export class BushFireController {
    private state: BushFireState = "healthy";
    private age = 0;
    private pointFireIssued = false;

    public get status(): BushFireState { return this.state; }
    public get progress(): number {
        return this.state === "healthy" ? 0 : Math.min(1, this.age / BUSH_FIRE.burnSeconds);
    }
    /** Separate presentation curves prevent foliage fading before it chars. */
    public get charProgress(): number {
        const t = Math.min(1, this.progress / BUSH_FIRE.charCompleteAt);
        return Math.pow(t, BUSH_FIRE.charRampExponent);
    }
    public get opacity(): number {
        const t = this.progress;
        if (t <= BUSH_FIRE.fadeStartAt) return 1;
        const fade = Math.min(1, (t - BUSH_FIRE.fadeStartAt) / (1 - BUSH_FIRE.fadeStartAt));
        return 1 - Math.pow(fade, BUSH_FIRE.fadeRampExponent);
    }
    public ignite(): boolean {
        if (this.state !== "healthy") return false;
        this.state = "burning";
        this.age = 0;
        this.pointFireIssued = false;
        return true;
    }
    /** A bush may request only one Point Fire ignition during its burn lifecycle. */
    public claimPointFireIgnition(): boolean {
        if (this.state !== "burning" || this.pointFireIssued) return false;
        this.pointFireIssued = true;
        return true;
    }
    public update(dt: number): boolean {
        if (this.state !== "burning" || !Number.isFinite(dt) || dt <= 0) return false;
        this.age += dt;
        if (this.age < BUSH_FIRE.burnSeconds) return false;
        this.state = "destroyed";
        return true;
    }
}
