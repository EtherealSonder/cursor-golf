import type { BallEffectSelection, BallEffectSnapshot } from "./BallEffectDefinition";
import { isBallEffectSelection } from "./BallEffectDefinition";
import { getBallGameplayProfile } from "./HighPowerBallProfile";

/** State-only controller. Does not own physics, rendering, or lives. */
export class BallEffectController {
    private active: BallEffectSelection = "none";
    private revision = 0;
    private readonly listeners = new Set<(snapshot: BallEffectSnapshot) => void>();

    public getSnapshot(): BallEffectSnapshot {
        return { active: this.active, revision: this.revision };
    }
    public getGameplayProfile() { return getBallGameplayProfile(this.active); }
    public has(effect: BallEffectSelection): boolean { return this.active === effect; }
    public apply(effect: BallEffectSelection): void {
        if (!isBallEffectSelection(effect)) throw new Error(`Unknown ball effect: ${String(effect)}`);
        if (this.active === effect) return;
        this.active = effect;
        this.revision++;
        this.notify();
    }
    public clear(): void { this.apply("none"); }
    public subscribe(listener: (snapshot: BallEffectSnapshot) => void): () => void {
        this.listeners.add(listener);
        listener(this.getSnapshot());
        return () => { this.listeners.delete(listener); };
    }
    public destroy(): void { this.listeners.clear(); this.active = "none"; }
    private notify(): void {
        const snapshot = this.getSnapshot();
        for (const listener of this.listeners) listener(snapshot);
    }
}
