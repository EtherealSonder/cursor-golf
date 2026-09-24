import { Graphics } from "pixi.js";

export interface RadialBumperImpactVfxDefinition {
    readonly startRadius: number;
    readonly endRadius: number;
    readonly durationSeconds: number;
    readonly lineWidth: number;
    readonly color: number;
    readonly startAlpha: number;
}

/** Presentation-only crisp shock ring emitted by a Radial Bumper impact. */
export class RadialBumperImpactVfx {
    private readonly graphics = new Graphics();
    private elapsedSeconds = 0;
    private active = false;

    public constructor(private readonly definition: RadialBumperImpactVfxDefinition) {
        this.graphics.visible = false;
    }

    public getGraphics(): Graphics {
        return this.graphics;
    }

    public trigger(): void {
        this.elapsedSeconds = 0;
        this.active = true;
        this.redraw();
    }

    public update(deltaTime: number): void {
        if (!this.active) return;
        this.elapsedSeconds += Math.max(0, deltaTime);
        if (this.elapsedSeconds >= this.definition.durationSeconds) {
            this.active = false;
            this.graphics.clear();
            this.graphics.visible = false;
            return;
        }
        this.redraw();
    }

    public destroy(): void {
        this.graphics.destroy();
    }

    private redraw(): void {
        const duration = Math.max(0.0001, this.definition.durationSeconds);
        const t = Math.min(1, this.elapsedSeconds / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const radius = this.definition.startRadius
            + (this.definition.endRadius - this.definition.startRadius) * eased;
        const alpha = this.definition.startAlpha * (1 - t);

        this.graphics.clear();
        this.graphics.visible = true;
        this.graphics
            .circle(0, 0, radius)
            .stroke({
                color: this.definition.color,
                width: this.definition.lineWidth,
                alpha,
            });
    }
}
