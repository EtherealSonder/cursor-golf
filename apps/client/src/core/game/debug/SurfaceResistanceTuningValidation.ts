import {
    DEFAULT_BALL_PHYSICS_DEFINITION,
} from "../config/BallPhysicsDefinition";

import {
    DRY_SAND_STATE_DEFINITION,
    NORMAL_GRASS_STATE_DEFINITION,
    SCORCHED_GRASS_STATE_DEFINITION,
    WET_GRASS_STATE_DEFINITION,
    WET_SAND_STATE_DEFINITION,
} from "../surface/SurfaceStateDefinition";

import type {
    SurfaceStateDefinition,
} from "../surface/SurfaceStateDefinition";

interface SurfaceTuningSample {
    readonly label: string;
    readonly definition: SurfaceStateDefinition;
}

export class SurfaceResistanceTuningValidation {

    private readonly referenceSpeed =
        300;

    public run():
        void {

        const baseDeceleration =
            DEFAULT_BALL_PHYSICS_DEFINITION
                .rollingDeceleration;

        const samples:
            readonly SurfaceTuningSample[] = [
                {
                    label: "Scorched Grass",
                    definition:
                        SCORCHED_GRASS_STATE_DEFINITION,
                },
                {
                    label: "Normal Grass",
                    definition:
                        NORMAL_GRASS_STATE_DEFINITION,
                },
                {
                    label: "Wet Grass",
                    definition:
                        WET_GRASS_STATE_DEFINITION,
                },
                {
                    label: "Wet Sand",
                    definition:
                        WET_SAND_STATE_DEFINITION,
                },
                {
                    label: "Dry Sand",
                    definition:
                        DRY_SAND_STATE_DEFINITION,
                },
            ];

        const distances =
            new Map<string, number>();

        for (const sample of samples) {
            const multiplier =
                sample.definition
                    .rollingResistanceMultiplier;

            const deceleration =
                baseDeceleration *
                multiplier;

            const stopDistance =
                this.calculateIdealStopDistance(
                    this.referenceSpeed,
                    deceleration,
                );

            distances.set(
                sample.label,
                stopDistance,
            );

            this.assert(
                Number.isFinite(multiplier) &&
                multiplier > 0,
                `${sample.label} multiplier is finite and positive`,
            );

            this.assert(
                Number.isFinite(deceleration) &&
                deceleration > 0 &&
                Number.isFinite(stopDistance) &&
                stopDistance >= 0,
                `${sample.label} controlled stopping result is finite`,
            );
        }

        const scorched =
            this.requireDistance(
                distances,
                "Scorched Grass",
            );

        const normal =
            this.requireDistance(
                distances,
                "Normal Grass",
            );

        const wetGrass =
            this.requireDistance(
                distances,
                "Wet Grass",
            );

        const wetSand =
            this.requireDistance(
                distances,
                "Wet Sand",
            );

        const drySand =
            this.requireDistance(
                distances,
                "Dry Sand",
            );

        this.assert(
            scorched > normal,
            "Scorched Grass travels farther than Normal Grass",
        );

        this.assert(
            normal > wetGrass,
            "Wet Grass travels less than Normal Grass",
        );

        this.assert(
            wetGrass > wetSand,
            "Wet Sand travels less than Wet Grass",
        );

        this.assert(
            wetSand > drySand,
            "Dry Sand travels less than Wet Sand",
        );

        console.group(
            "[SURFACE-TUNING] Controlled Stop-Distance Report",
        );

        console.log(
            `Reference Speed: ${this.referenceSpeed.toFixed(2)} px/s`,
        );

        console.log(
            `Base Rolling Deceleration: ${baseDeceleration.toFixed(2)} px/s²`,
        );

        for (const sample of samples) {
            const multiplier =
                sample.definition
                    .rollingResistanceMultiplier;

            const deceleration =
                baseDeceleration *
                multiplier;

            const distance =
                this.requireDistance(
                    distances,
                    sample.label,
                );

            const differenceFromNormal =
                (
                    (
                        distance -
                        normal
                    ) /
                    normal
                ) *
                100;

            console.log(
                `[SURFACE-TUNING] ${sample.label}`,
                {
                    multiplier:
                        multiplier.toFixed(2),
                    deceleration:
                        `${deceleration.toFixed(2)} px/s²`,
                    expectedStopDistance:
                        `${distance.toFixed(2)} px`,
                    distanceVsNormal:
                        `${differenceFromNormal >= 0 ? "+" : ""}${differenceFromNormal.toFixed(1)}%`,
                },
            );
        }

        console.groupEnd();

        console.log(
            "[SURFACE-TUNING] Surface Resistance Tuning: PASS",
        );
    }

    private calculateIdealStopDistance(
        speed:
            number,

        deceleration:
            number,
    ): number {

        if (
            !Number.isFinite(speed) ||
            speed < 0 ||
            !Number.isFinite(deceleration) ||
            deceleration <= 0
        ) {
            return Number.NaN;
        }

        return (
            speed *
            speed
        ) / (
            2 *
            deceleration
        );
    }

    private requireDistance(
        distances:
            ReadonlyMap<string, number>,

        label:
            string,
    ): number {

        const value =
            distances.get(
                label,
            );

        if (value === undefined) {
            throw new Error(
                `[SURFACE-TUNING] Missing controlled distance for ${label}.`,
            );
        }

        return value;
    }

    private assert(
        condition:
            boolean,

        label:
            string,
    ): void {

        if (!condition) {
            throw new Error(
                `[SURFACE-TUNING] ${label} FAIL`,
            );
        }

        console.log(
            `[SURFACE-TUNING] ${label} PASS`,
        );
    }
}
