import { WORLD_MODIFIER_BACKGROUND_LIGHTNING } from "../game/config/WorldModifierBackgroundDefinition";

/** Presentation-only color cycling. The tint target is constructed once by World. */
export interface BackgroundTintTarget { tint: number; }

function blendColor(a: number, b: number, amount: number): number {
    const t = Math.max(0, Math.min(1, amount));
    const channel = (shift: number) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

export class CourseBackgroundAnimator {
    private elapsedSeconds = 0;
    private paused = false;
    private palette: readonly number[];
    private transitionSeconds: number;
    private paletteBlendElapsed = 0;
    private paletteBlendStart: number | null = null;
    private readonly paletteBlendSeconds = 1.2;
    private lightningStrength = 0;

    public setPaused(paused: boolean): void { this.paused = paused; }

    public constructor(
        private readonly target: BackgroundTintTarget,
        palette: readonly number[],
        transitionSeconds: number,
    ) {
        this.validate(palette, transitionSeconds);
        this.palette = [...palette];
        this.transitionSeconds = transitionSeconds;
        this.target.tint = this.palette[0];
    }

    public setPalette(palette: readonly number[], transitionSeconds: number): void {
        this.validate(palette, transitionSeconds);
        if (this.transitionSeconds === transitionSeconds &&
            this.palette.length === palette.length && this.palette.every((c, i) => c === palette[i])) return;
        this.paletteBlendStart = this.currentBaseColor();
        this.paletteBlendElapsed = 0;
        this.palette = [...palette];
        this.transitionSeconds = transitionSeconds;
        this.elapsedSeconds = 0;
        this.render();
    }

    public setLightningStrength(strength: number): void {
        this.lightningStrength = Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 0;
        this.render();
    }

    public update(deltaTimeSeconds: number): void {
        if (this.paused || !Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
        const dt = Math.min(deltaTimeSeconds, 0.25);
        const total = this.palette.length * this.transitionSeconds;
        this.elapsedSeconds = (this.elapsedSeconds + dt) % total;
        if (this.paletteBlendStart !== null) {
            this.paletteBlendElapsed += dt;
            if (this.paletteBlendElapsed >= this.paletteBlendSeconds) this.paletteBlendStart = null;
        }
        this.render();
    }

    private currentBaseColor(): number {
        const position = this.elapsedSeconds / this.transitionSeconds;
        const index = Math.floor(position) % this.palette.length;
        const next = (index + 1) % this.palette.length;
        const fraction = position - Math.floor(position);
        const eased = (1 - Math.cos(Math.PI * fraction)) / 2;
        const cycleColor = blendColor(this.palette[index], this.palette[next], eased);
        if (this.paletteBlendStart === null) return cycleColor;
        const t = Math.min(1, this.paletteBlendElapsed / this.paletteBlendSeconds);
        return blendColor(this.paletteBlendStart, cycleColor, (1 - Math.cos(Math.PI * t)) / 2);
    }

    private render(): void {
        this.target.tint = blendColor(this.currentBaseColor(), WORLD_MODIFIER_BACKGROUND_LIGHTNING.flashColor, this.lightningStrength);
    }

    private validate(palette: readonly number[], transitionSeconds: number): void {
        if (palette.length < 2 || !palette.every(c => Number.isInteger(c) && c >= 0 && c <= 0xffffff)) {
            throw new Error("Course background requires at least two valid RGB colors.");
        }
        if (!Number.isFinite(transitionSeconds) || transitionSeconds <= 0) {
            throw new Error("Course background transition duration must be positive.");
        }
    }
}
