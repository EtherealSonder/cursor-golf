import { WORLD_MODIFIER_BACKGROUND_LIGHTNING as CONFIG } from "../game/config/WorldModifierBackgroundDefinition";

/** Presentation-only storm flash scheduler. No gameplay RNG or physics state is touched. */
export class CourseBackgroundLightningController {
    private enabled = false;
    private timeUntilFlash = this.randomInterval();
    private flashElapsed = 0;
    private flashesRemaining = 0;
    private gapRemaining = 0;
    private activeFlash = false;

    public setEnabled(enabled: boolean): void {
        if (this.enabled === enabled) return;
        this.enabled = enabled;
        this.reset();
    }

    public reset(): void {
        this.timeUntilFlash = this.randomInterval();
        this.flashElapsed = 0;
        this.flashesRemaining = 0;
        this.gapRemaining = 0;
        this.activeFlash = false;
    }

    public update(deltaSeconds: number): number {
        if (!this.enabled || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
        // Clamp large tab-resume deltas so the animation cannot skip a flash sequence.
        const dt = Math.min(deltaSeconds, 0.1);
        if (this.activeFlash) {
            this.flashElapsed += dt;
            const progress = Math.min(1, this.flashElapsed / CONFIG.flashDurationSeconds);
            if (progress >= 1) {
                this.activeFlash = false;
                this.flashElapsed = 0;
                if (this.flashesRemaining > 0) this.gapRemaining = CONFIG.doubleFlashGapSeconds;
                else this.timeUntilFlash = this.randomInterval();
                return 0;
            }
            const edge = CONFIG.fadeFraction;
            const envelope = progress < edge ? progress / edge : progress > 1 - edge ? (1 - progress) / edge : 1;
            return CONFIG.maximumStrength * Math.max(0, Math.min(1, envelope));
        }
        if (this.gapRemaining > 0) {
            this.gapRemaining -= dt;
            if (this.gapRemaining <= 0 && this.flashesRemaining > 0) {
                this.flashesRemaining--;
                this.activeFlash = true;
                this.flashElapsed = 0;
            }
            return 0;
        }
        this.timeUntilFlash -= dt;
        if (this.timeUntilFlash <= 0) {
            this.activeFlash = true;
            this.flashElapsed = 0;
            this.flashesRemaining = Math.random() < CONFIG.doubleFlashProbability ? 1 : 0;
        }
        return 0;
    }

    private randomInterval(): number {
        return CONFIG.minimumIntervalSeconds + Math.random() * (CONFIG.maximumIntervalSeconds - CONFIG.minimumIntervalSeconds);
    }
}
