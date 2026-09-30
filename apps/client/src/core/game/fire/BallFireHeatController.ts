import {
    DEFAULT_BALL_FIRE_HEAT_DEFINITION,
} from "../config/BallFireHeatDefinition";
import type { BallFireHeatDefinition } from "../config/BallFireHeatDefinition";

export interface BallFireHeatUpdate {
    readonly heat: number;
    readonly exposure: number;
    readonly reachedDeathThreshold: boolean;
}

/** Owns the authoritative normalized burn progress for the current Ball life. */
export class BallFireHeatController {
    private heat = 0;
    private exposure = 0;
    private deathRequestedForCurrentHeatCycle = false;

    constructor(
        private readonly definition: BallFireHeatDefinition =
            DEFAULT_BALL_FIRE_HEAT_DEFINITION,
    ) {}

    public update(deltaTimeSeconds: number, sampledExposure: number): BallFireHeatUpdate {
        const dt = Math.max(0, Number.isFinite(deltaTimeSeconds) ? deltaTimeSeconds : 0);
        this.exposure = Math.min(1, Math.max(0, sampledExposure));
        const effectiveExposure =
            this.exposure >= this.definition.minimumExposure ? this.exposure : 0;

        if (effectiveExposure > 0) {
            this.heat = Math.min(
                this.definition.deathThreshold,
                this.heat + effectiveExposure * this.definition.fullExposureHeatPerSecond * dt,
            );
        } else {
            this.heat = Math.max(0, this.heat - this.definition.coolingPerSecond * dt);
        }

        const reachedDeathThreshold =
            this.heat >= this.definition.deathThreshold &&
            !this.deathRequestedForCurrentHeatCycle;

        if (reachedDeathThreshold) {
            this.deathRequestedForCurrentHeatCycle = true;
        }

        return Object.freeze({
            heat: this.getNormalizedHeat(),
            exposure: this.exposure,
            reachedDeathThreshold,
        });
    }

    public getNormalizedHeat(): number {
        return Math.min(1, Math.max(0, this.heat / this.definition.deathThreshold));
    }

    public reset(): void {
        this.heat = 0;
        this.exposure = 0;
        this.deathRequestedForCurrentHeatCycle = false;
    }
}
