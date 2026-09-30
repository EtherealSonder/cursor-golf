import {
    DEFAULT_BALL_DROWNING_DEFINITION,
} from "../config/BallDrowningDefinition";
import type {
    BallDrowningDefinition,
} from "../config/BallDrowningDefinition";
import type {
    BallWaterContactProfile,
} from "../physics/water/BallWaterContactProfile";

export interface BallDrowningDiagnostics {
    readonly isInWater: boolean;
    readonly coverage: number;
    readonly physicalDepth: number;
    readonly gameplaySeverity: number;
    readonly contactTimer: number;
    readonly stationary: boolean;
    readonly environmentalBaseline: number;
    readonly deepWater: boolean;
    readonly accumulatedDanger: number;
    readonly displayProgress: number;
    readonly drowningActive: boolean;
    readonly showHud: boolean;
}

export interface BallDrowningUpdate {
    /** Single authoritative meter used by HUD, sinking and death. */
    readonly displayProgress: number;
    readonly environmentalBaseline: number;
    readonly accumulatedDanger: number;
    readonly gameplaySeverity: number;
    readonly isInWater: boolean;
    readonly deepWater: boolean;
    readonly drowningActive: boolean;
    readonly shouldShowDebuff: boolean;
    readonly reachedDeathThreshold: boolean;
}

/**
 * D-4 authoritative drowning gameplay interpreter.
 *
 * WaterField remains authoritative for physical Water. This controller maps
 * physical depth + coverage into a stable, player-readable hazard meter.
 */
export class BallDrowningController {
    private accumulatedDanger = 0;
    private displayProgress = 0;

    /** Current authoritative physical standing-Water contact state. */
    private isInWater = false;

    private stationary = false;
    private deepWater = false;
    private thresholdReported = false;

    private continuousWaterContactSeconds = 0;
    private debuffLatchedForContact = false;

    private diagnostics: BallDrowningDiagnostics = {
        isInWater: false,
        coverage: 0,
        physicalDepth: 0,
        gameplaySeverity: 0,
        contactTimer: 0,
        stationary: false,
        environmentalBaseline: 0,
        deepWater: false,
        accumulatedDanger: 0,
        displayProgress: 0,
        drowningActive: false,
        showHud: false,
    };

    constructor(
        private readonly definition:
            BallDrowningDefinition =
            DEFAULT_BALL_DROWNING_DEFINITION,
    ) {}

    public update(
        deltaTimeSeconds: number,
        profile: BallWaterContactProfile | null,
        ballSpeed: number,
    ): BallDrowningUpdate {
        const dt = Math.max(0, deltaTimeSeconds);
        const coverage = this.clamp01(profile?.coverage ?? 0);
        const physicalDepth = Math.max(
            0,
            profile?.representativeDepth ?? 0,
        );

        const isInWater =
            coverage >= this.definition.minimumWaterCoverage &&
            physicalDepth >=
                this.definition.minimumRepresentativeDepth;

        /*
         * Publish physical contact every update. This is intentionally
         * independent of HUD latching and accumulated danger so presentation
         * can immediately know whether the Ball is physically submerged.
         */
        this.isInWater = isInWater;

        if (isInWater) {
            this.continuousWaterContactSeconds += dt;

            if (
                this.continuousWaterContactSeconds >=
                this.definition.uiActivationDelaySeconds
            ) {
                this.debuffLatchedForContact = true;
            }
        } else {
            this.continuousWaterContactSeconds = 0;
            this.debuffLatchedForContact = false;
        }

        if (this.stationary) {
            if (ballSpeed > this.definition.stationaryExitSpeed) {
                this.stationary = false;
            }
        } else if (ballSpeed <= this.definition.stationaryEnterSpeed) {
            this.stationary = true;
        }

        /*
         * Deep-Water hysteresis. Once qualified, drying must cross the lower
         * exit threshold before the deep state is released.
         */
        const qualifiesToEnterDeepWater =
            isInWater &&
            coverage >=
                this.definition.deepWaterMinimumCoverage &&
            physicalDepth >=
                this.definition.deepWaterEnterDepth;

        const qualifiesToRemainDeepWater =
            isInWater &&
            coverage >=
                this.definition.deepWaterMinimumCoverage &&
            physicalDepth >=
                this.definition.deepWaterExitDepth;

        /*
         * Re-evaluate from the live Water sample every frame. A Ball that
         * entered a puddle while it was shallow can therefore transition into
         * deep Water in-place as the puddle grows around it. No exit/re-entry
         * is required.
         */
        this.deepWater =
            this.deepWater
                ? qualifiesToRemainDeepWater
                : qualifiesToEnterDeepWater;

        const gameplaySeverity =
            isInWater
                ? this.calculateGameplaySeverity(physicalDepth)
                : 0;

        const environmentalBaseline =
            isInWater
                ? this.calculateEnvironmentalBaseline(
                    physicalDepth,
                    coverage,
                    gameplaySeverity,
                )
                : 0;

        const drowningActive =
            this.deepWater &&
            this.stationary;

        if (drowningActive) {
            /*
             * Use the same player-facing severity interpretation for danger
             * rate as for the baseline. Once Water visually qualifies as deep,
             * threat ramps decisively instead of waiting for extreme raw depth.
             */
            const deepT =
                this.clamp01(
                    (gameplaySeverity - 0.68) /
                    Math.max(0.0001, 1 - 0.68),
                );

            const rateMultiplier =
                1 +
                deepT *
                    (
                        this.definition.deepestWaterRateMultiplier -
                        1
                    );

            this.accumulatedDanger =
                this.clamp01(
                    this.accumulatedDanger +
                        this.definition.dangerAccumulationPerSecond *
                        rateMultiplier *
                        dt,
                );
        } else {
            /*
             * Danger has its own slow recovery. A drying puddle may lower the
             * baseline, but it cannot instantly erase accumulated drowning.
             */
            this.accumulatedDanger =
                Math.max(
                    0,
                    this.accumulatedDanger -
                        this.definition.dangerRecoveryPerSecond *
                        dt,
                );
        }

        /*
         * ONE authoritative meter. Baseline communicates current environment;
         * accumulatedDanger fills only the remaining capacity above it.
         */
        this.displayProgress =
            this.clamp01(
                environmentalBaseline +
                    this.accumulatedDanger *
                        (1 - environmentalBaseline),
            );

        const shouldShowDebuff =
            this.debuffLatchedForContact ||
            this.displayProgress > 0.0001 ||
            this.accumulatedDanger > 0.0001;

        const reachedDeathThreshold =
            !this.thresholdReported &&
            this.displayProgress >= this.definition.deathThreshold;

        if (reachedDeathThreshold) {
            this.thresholdReported = true;
        }

        this.diagnostics = {
            isInWater,
            coverage,
            physicalDepth,
            gameplaySeverity,
            contactTimer: this.continuousWaterContactSeconds,
            stationary: this.stationary,
            environmentalBaseline,
            deepWater: this.deepWater,
            accumulatedDanger: this.accumulatedDanger,
            displayProgress: this.displayProgress,
            drowningActive,
            showHud: shouldShowDebuff,
        };

        return {
            displayProgress: this.displayProgress,
            environmentalBaseline,
            accumulatedDanger: this.accumulatedDanger,
            gameplaySeverity,
            isInWater,
            deepWater: this.deepWater,
            drowningActive,
            shouldShowDebuff,
            reachedDeathThreshold,
        };
    }

    public getDisplayProgress(): number {
        return this.displayProgress;
    }

    public isInStandingWater(): boolean {
        return this.isInWater;
    }

    /** Compatibility alias. Always returns the same authoritative meter. */
    public getProgress(): number {
        return this.displayProgress;
    }

    public getDiagnostics(): BallDrowningDiagnostics {
        return this.diagnostics;
    }

    public shouldDisplayDebuff(): boolean {
        return (
            this.debuffLatchedForContact ||
            this.displayProgress > 0.0001 ||
            this.accumulatedDanger > 0.0001
        );
    }

    public reset(): void {
        this.accumulatedDanger = 0;
        this.displayProgress = 0;
        this.isInWater = false;
        this.stationary = false;
        this.deepWater = false;
        this.thresholdReported = false;
        this.continuousWaterContactSeconds = 0;
        this.debuffLatchedForContact = false;

        this.diagnostics = {
            isInWater: false,
            coverage: 0,
            physicalDepth: 0,
            gameplaySeverity: 0,
            contactTimer: 0,
            stationary: false,
            environmentalBaseline: 0,
            deepWater: false,
            accumulatedDanger: 0,
            displayProgress: 0,
            drowningActive: false,
            showHud: false,
        };
    }

    private calculateGameplaySeverity(
        physicalDepth: number,
    ): number {
        const d = this.definition;

        if (physicalDepth <= d.minimumRepresentativeDepth) {
            return 0;
        }

        if (physicalDepth < d.establishedPuddleDepth) {
            return this.remap(
                physicalDepth,
                d.minimumRepresentativeDepth,
                d.establishedPuddleDepth,
                0.05,
                0.25,
            );
        }

        if (physicalDepth < d.substantialPuddleDepth) {
            return this.remap(
                physicalDepth,
                d.establishedPuddleDepth,
                d.substantialPuddleDepth,
                0.25,
                0.50,
            );
        }

        if (physicalDepth < d.deepWaterEnterDepth) {
            return this.remap(
                physicalDepth,
                d.substantialPuddleDepth,
                d.deepWaterEnterDepth,
                0.50,
                0.68,
            );
        }

        return this.remap(
            physicalDepth,
            d.deepWaterEnterDepth,
            d.veryDeepWaterDepth,
            0.68,
            1,
        );
    }

    private calculateEnvironmentalBaseline(
        physicalDepth: number,
        coverage: number,
        gameplaySeverity: number,
    ): number {
        const d = this.definition;

        let depthBaseline: number;

        if (physicalDepth < d.establishedPuddleDepth) {
            depthBaseline =
                this.remap(
                    physicalDepth,
                    d.minimumRepresentativeDepth,
                    d.establishedPuddleDepth,
                    0.06,
                    d.minimumEstablishedPuddleBaseline,
                );
        } else if (physicalDepth < d.substantialPuddleDepth) {
            depthBaseline =
                this.remap(
                    physicalDepth,
                    d.establishedPuddleDepth,
                    d.substantialPuddleDepth,
                    d.minimumEstablishedPuddleBaseline,
                    d.substantialPuddleBaseline,
                );
        } else {
            depthBaseline =
                this.remap(
                    gameplaySeverity,
                    0.50,
                    1,
                    d.substantialPuddleBaseline,
                    d.maximumEnvironmentalBaseline,
                );
        }

        const coverageContribution =
            d.coverageBaselineWeight *
            this.clamp01(
                (coverage - d.minimumWaterCoverage) /
                Math.max(
                    0.0001,
                    1 - d.minimumWaterCoverage,
                ),
            );

        return this.clamp01(
            Math.min(
                d.maximumEnvironmentalBaseline,
                depthBaseline + coverageContribution,
            ),
        );
    }

    private remap(
        value: number,
        inMin: number,
        inMax: number,
        outMin: number,
        outMax: number,
    ): number {
        const t =
            this.clamp01(
                (value - inMin) /
                    Math.max(0.0001, inMax - inMin),
            );

        return outMin + (outMax - outMin) * t;
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(1, value));
    }
}
