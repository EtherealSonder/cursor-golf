import { LEVEL_COMPLETION_TRANSITION as C } from "../config/LevelCompletionTransitionDefinition";

export type LevelCompletionTransitionPhase = "idle" | "waiting-for-sound" | "entering-hole" | "black" | "loading-next-level" | "next-level-ready" | "revealing-new-hole" | "awaiting-flyover" | "flying-to-ball";
export interface LevelCompletionTransitionSnapshot {
    readonly phase: LevelCompletionTransitionPhase;
    readonly progress: number;
    readonly hudScale: number;
    readonly blackOpacity: number;
}
/** Owns the LCT-1 sequence. No level replacement occurs until LCT-2. */
export class LevelCompletionTransitionController {
    private phase: LevelCompletionTransitionPhase = "idle";
    private elapsed = 0;
    private soundRemaining = 0;
    private flyoverDuration: number = C.flyoverSeconds;
    public get isActive(): boolean { return this.phase !== "idle"; }
    public begin(soundRemainingSeconds: number): void {
        if (this.isActive) return;
        this.phase = "waiting-for-sound";
        this.elapsed = 0;
        this.soundRemaining = Math.max(0, Math.min(C.maximumHoleSoundWaitSeconds, soundRemainingSeconds));
    }
    /** LCT-2A handoff: claim the fully opaque frame exactly once. */
    public claimBlackHandoff(): boolean {
        if (this.phase !== "black") return false;
        this.phase = "loading-next-level";
        return true;
    }
    /** Keep the screen opaque until LCT-2B implements the reveal. */
    public markNextLevelReady(): void {
        if (this.phase === "loading-next-level") { this.phase = "revealing-new-hole"; this.elapsed = 0; }
    }
    public beginFlyover(durationSeconds: number = C.flyoverSeconds): void {
        if (this.phase !== "awaiting-flyover") return;
        this.flyoverDuration = Math.max(0.001, durationSeconds);
        this.phase = "flying-to-ball";
        this.elapsed = 0;
    }
    /** Returns true exactly once, when the cinematic is ready to release gameplay. */
    public completeFlyover(): boolean {
        if (this.phase !== "flying-to-ball" || this.elapsed < this.flyoverDuration) return false;
        this.phase = "idle";
        this.elapsed = 0;
        return true;
    }
    public finishFlyover(): void {
        if (this.phase !== "flying-to-ball" || this.elapsed < this.flyoverDuration) return;
        this.phase = "idle";
        this.elapsed = 0;
    }
    public update(dt: number): LevelCompletionTransitionSnapshot {
        const delta = Math.max(0, Math.min(0.1, dt));
        if (this.phase === "waiting-for-sound") {
            this.elapsed += delta;
            if (this.elapsed >= this.soundRemaining) { this.phase = "entering-hole"; this.elapsed = 0; }
        } else if (this.phase === "entering-hole") {
            this.elapsed += delta;
            if (this.elapsed >= C.holeEntrySeconds) { this.phase = "black"; this.elapsed = C.holeEntrySeconds; }
        }
        if (this.phase === "revealing-new-hole") {
            this.elapsed += delta;
            if (this.elapsed >= C.newHoleRevealSeconds) { this.elapsed = C.newHoleRevealSeconds; this.phase = "awaiting-flyover"; }
        }
        if (this.phase === "flying-to-ball") this.elapsed = Math.min(this.flyoverDuration, this.elapsed + delta);
        const flyoverProgress = this.phase === "flying-to-ball" ? this.elapsed / this.flyoverDuration : 0;
        const revealProgress = this.phase === "revealing-new-hole" ? Math.min(1, this.elapsed / C.newHoleRevealSeconds) : this.phase === "awaiting-flyover" ? 1 : 0;
        const progress = (this.phase === "black" || this.phase === "loading-next-level" || this.phase === "next-level-ready") ? 1 : this.phase === "entering-hole" ? Math.min(1, this.elapsed / C.holeEntrySeconds) : 0;
        const hudScale = this.phase === "waiting-for-sound" ? 1 : Math.max(0, 1 - this.elapsed / C.hudShrinkSeconds);
        return { phase: this.phase, progress: this.phase === "flying-to-ball" ? flyoverProgress : (this.phase === "revealing-new-hole" || this.phase === "awaiting-flyover") ? revealProgress : progress, hudScale: (this.phase === "revealing-new-hole" || this.phase === "awaiting-flyover" || this.phase === "flying-to-ball") ? 0 : hudScale,
            blackOpacity: this.phase === "flying-to-ball" ? 0 : (this.phase === "revealing-new-hole" || this.phase === "awaiting-flyover") ? Math.max(0, 1 - revealProgress / C.revealBlackFadeFraction) : (this.phase === "black" || this.phase === "loading-next-level" || this.phase === "next-level-ready") ? 1 : Math.max(0, Math.min(1, (progress - C.blackFadeStart) / (1 - C.blackFadeStart))) };
    }
}
