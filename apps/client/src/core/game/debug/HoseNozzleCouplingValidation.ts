import type {
    HydrantHose,
} from "../entities/mechanisms/HydrantHose";

import type {
    WaterSource,
} from "../environment/WaterSource";

export interface HoseNozzleCouplingValidationState {
    readonly sourceAvailablePassed: boolean;
    readonly initialPositionMatchPassed: boolean;
    readonly initialDirectionMatchPassed: boolean;
    readonly sourceIdentityStablePassed: boolean;
    readonly movedPositionMatchPassed: boolean;
    readonly movedDirectionMatchPassed: boolean;
    readonly finiteTransformPassed: boolean;
    readonly passed: boolean;
}

/**
 * Phase 8B-10B.3 validation for the live physical Hose -> WaterSource bridge.
 *
 * The test temporarily perturbs the final two non-anchor rope points, asks
 * HydrantHose to synchronize the registered source, verifies the resulting
 * position/direction, then restores the Hose through reset().
 *
 * Source activation is intentionally outside this validation.
 * Phase 8B-10B.4 owns stream activation. This class validates only the
 * physical nozzle -> runtime WaterSource transform invariant.
 */
export class HoseNozzleCouplingValidation {
    private state:
        HoseNozzleCouplingValidationState | null =
        null;

    public constructor(
        private readonly hydrantHose:
            HydrantHose,
    ) { }

    public run():
        HoseNozzleCouplingValidationState {

        const source =
            this.hydrantHose
                .getWaterSource();

        const sourceAvailablePassed =
            source !==
            null;

        if (
            !source
        ) {
            this.state = {
                sourceAvailablePassed:
                    false,
                initialPositionMatchPassed:
                    false,
                initialDirectionMatchPassed:
                    false,
                sourceIdentityStablePassed:
                    false,
                movedPositionMatchPassed:
                    false,
                movedDirectionMatchPassed:
                    false,
                finiteTransformPassed:
                    false,
                passed:
                    false,
            };

            console.group(
                "Phase 8B-10B.3 Hose Dynamic Nozzle Coupling Validation",
            );
            console.log(
                "RESULT",
                "FAIL",
            );
            console.error(
                "HydrantHose has no registered WaterSource.",
            );
            console.groupEnd();

            return this.state;
        }

        this.hydrantHose
            .synchronizeWaterSourceTransform();

        const initialNozzle =
            this.hydrantHose
                .getNozzlePosition();

        const initialDirection =
            this.hydrantHose
                .getNozzleDirectionRadians();

        const initialPositionMatchPassed =
            this.positionsMatch(
                source,
                initialNozzle.x,
                initialNozzle.y,
            );

        const initialDirectionMatchPassed =
            this.directionsMatch(
                source,
                initialDirection,
            );

        const originalSource =
            source;

        const points =
            this.hydrantHose
                .getRopePoints();

        const nozzle =
            points[
            points.length -
            1
            ];

        const previous =
            points[
            points.length -
            2
            ];

        if (
            !nozzle ||
            !previous
        ) {
            throw new Error(
                "HoseNozzleCouplingValidation requires at least two Hose rope points.",
            );
        }

        /*
         * Deterministic temporary perturbation.
         * We move both final points so the nozzle changes position and the
         * final segment changes direction without touching the fixed anchor.
         */
        previous.x +=
            17;

        previous.y -=
            11;

        nozzle.x +=
            43;

        nozzle.y +=
            29;

        this.hydrantHose
            .synchronizeWaterSourceTransform();

        const movedNozzle =
            this.hydrantHose
                .getNozzlePosition();

        const movedDirection =
            this.hydrantHose
                .getNozzleDirectionRadians();

        const movedPositionMatchPassed =
            this.positionsMatch(
                source,
                movedNozzle.x,
                movedNozzle.y,
            );

        const movedDirectionMatchPassed =
            this.directionsMatch(
                source,
                movedDirection,
            );

        const sourceIdentityStablePassed =
            this.hydrantHose
                .getWaterSource() ===
            originalSource;

        const finiteTransformPassed =
            Number.isFinite(
                source.getPositionX(),
            ) &&
            Number.isFinite(
                source.getPositionY(),
            ) &&
            Number.isFinite(
                source.getDirectionRadians(),
            );

        /*
         * Restore the physical Hose and source together. HydrantHose.reset()
         * itself is part of the 8B-10B.3 coupling contract.
         */
        this.hydrantHose
            .reset();

        const passed =
            sourceAvailablePassed &&
            initialPositionMatchPassed &&
            initialDirectionMatchPassed &&
            sourceIdentityStablePassed &&
            movedPositionMatchPassed &&
            movedDirectionMatchPassed &&
            finiteTransformPassed;

        this.state = {
            sourceAvailablePassed,
            initialPositionMatchPassed,
            initialDirectionMatchPassed,
            sourceIdentityStablePassed,
            movedPositionMatchPassed,
            movedDirectionMatchPassed,
            finiteTransformPassed,
            passed,
        };

        console.group(
            "Phase 8B-10B.3 Hose Dynamic Nozzle Coupling Validation",
        );

        console.log(
            "Source Available",
            {
                sourceAvailablePassed,
            },
        );

        console.log(
            "Initial Coupling",
            {
                sourceX:
                    source.getPositionX(),
                sourceY:
                    source.getPositionY(),
                initialPositionMatchPassed,
                initialDirectionMatchPassed,
            },
        );

        console.log(
            "Moved Coupling",
            {
                movedNozzle,
                movedDirection,
                movedPositionMatchPassed,
                movedDirectionMatchPassed,
            },
        );

        console.log(
            "Source Identity",
            {
                sourceIdentityStablePassed,
            },
        );

        console.log(
            "Finite Transform",
            {
                finiteTransformPassed,
            },
        );

        console.log(
            "RESULT",
            passed
                ? "PASS"
                : "FAIL",
        );

        console.groupEnd();

        return this.state;
    }

    public getState():
        HoseNozzleCouplingValidationState | null {

        return this.state;
    }

    private positionsMatch(
        source:
            WaterSource,

        expectedX:
            number,

        expectedY:
            number,
    ): boolean {

        const epsilon =
            1e-9;

        return (
            Math.abs(
                source.getPositionX() -
                expectedX,
            ) <=
            epsilon &&
            Math.abs(
                source.getPositionY() -
                expectedY,
            ) <=
            epsilon
        );
    }

    private directionsMatch(
        source:
            WaterSource,

        expectedDirection:
            number,
    ): boolean {

        const difference =
            Math.atan2(
                Math.sin(
                    source
                        .getDirectionRadians() -
                    expectedDirection,
                ),
                Math.cos(
                    source
                        .getDirectionRadians() -
                    expectedDirection,
                ),
            );

        return (
            Math.abs(
                difference,
            ) <=
            1e-9
        );
    }
}
