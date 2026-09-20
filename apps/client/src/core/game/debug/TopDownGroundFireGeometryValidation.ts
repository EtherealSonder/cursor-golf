import {
    TOP_DOWN_FIRE_VFX_DEFINITION,
} from "../config/TopDownFireVfxDefinition";

/**
 * F-6D static validation for the hierarchical top-down Ground Fire geometry.
 *
 * Presentation contract only. This validator never changes authoritative
 * Fire simulation, spread, heat, scorch, Wind, or Water-Fire behaviour.
 */
export class TopDownGroundFireGeometryValidation {

    public static run(): void {

        const definition =
            TOP_DOWN_FIRE_VFX_DEFINITION;

        const geometry =
            definition.groundGeometry;

        const checks: Array<
            readonly [string, boolean]
        > = [
                [
                    "Top-down combustion-field identity",
                    definition.ground.model ===
                    "combustion-field" &&
                    definition.ground.footprintOriented &&
                    !definition.ground.dominantGlobalDirection,
                ],
                [
                    "Orientation-neutral local shapes",
                    definition.ground
                        .orientationNeutralLocalShapes &&
                    !definition.perspective
                        .screenUpIsFlameDirection &&
                    !definition.perspective
                        .verticalBaseToTipGrammar,
                ],
                [
                    "Hierarchical primary/secondary/fragment geometry",
                    geometry.primaryScaleMinimum > 0 &&
                    geometry.secondaryScaleMinimum > 0 &&
                    geometry.fragmentScaleMinimum > 0 &&
                    geometry.secondaryPerBoundaryCell >= 1,
                ],
                [
                    "Primary > secondary > fragment scale hierarchy",
                    geometry.primaryScaleMinimum >
                    geometry.secondaryScaleMinimum &&
                    geometry.primaryScaleMaximum >
                    geometry.secondaryScaleMaximum &&
                    geometry.secondaryScaleMinimum >
                    geometry.fragmentScaleMinimum &&
                    geometry.secondaryScaleMaximum >
                    geometry.fragmentScaleMaximum,
                ],
                [
                    "Large overlapping primary coverage",
                    geometry.primaryScaleMaximum >= 0.12 &&
                    geometry.primaryJitterCellRadius > 0 &&
                    definition.ground.denseOverlappingClusters,
                ],
                [
                    "Boundary-driven secondary structure",
                    geometry.boundaryNeighbourThreshold >= 0 &&
                    geometry.boundaryNeighbourThreshold <= 8 &&
                    geometry.secondaryPerBoundaryCell >= 1 &&
                    geometry.secondaryJitterCellRadius >=
                    geometry.primaryJitterCellRadius,
                ],
                [
                    "Boundary-driven fragment breakup",
                    geometry.fragmentChancePerBoundaryCell > 0 &&
                    geometry.fragmentChancePerBoundaryCell <= 1 &&
                    geometry.fragmentJitterCellRadius >=
                    geometry.secondaryJitterCellRadius,
                ],
                [
                    "Persistent primary ownership",
                    geometry.primarySettleSeconds > 0 &&
                    geometry.primarySpawnScaleFraction > 0 &&
                    geometry.primarySpawnScaleFraction < 1,
                ],
                [
                    "Restrained primary breathing",
                    geometry.primaryBreathingAmplitude > 0 &&
                    geometry.primaryBreathingAmplitude <= 0.10 &&
                    geometry.primaryBreathingFrequencyMinimum > 0 &&
                    geometry.primaryBreathingFrequencyMaximum >=
                    geometry.primaryBreathingFrequencyMinimum,
                ],
                [
                    "Finite secondary and fragment lifecycle",
                    geometry.secondaryLifetimeMinimum > 0 &&
                    geometry.secondaryLifetimeMaximum >=
                    geometry.secondaryLifetimeMinimum &&
                    geometry.fragmentLifetimeMinimum > 0 &&
                    geometry.fragmentLifetimeMaximum >=
                    geometry.fragmentLifetimeMinimum,
                ],
                [
                    "Full random initial rotation",
                    geometry.rotationMinimum === 0 &&
                    Math.abs(
                        geometry.rotationMaximum -
                        Math.PI * 2,
                    ) < 0.000001,
                ],
                [
                    "No upward translation",
                    geometry
                        .upwardTranslationPixelsPerSecond ===
                    0,
                ],
                [
                    "No footprint drift",
                    geometry
                        .footprintDriftPixelsPerSecond ===
                    0,
                ],
                [
                    "Presentation-only boundary",
                    definition.shared.presentationOnly,
                ],
                [
                    "Vertical grammar superseded",
                    definition.legacy
                        .windTongueGroundModelSuperseded &&
                    definition.legacy
                        .rootedVerticalFlameGrammarSuperseded,
                ],
            ];

        console.log(
            "[F-6D] HIERARCHICAL TOP-DOWN GROUND FIRE GEOMETRY",
        );

        let passed = true;

        for (const [name, result] of checks) {
            console.log(
                `[F-6D] ${name}: ${result ? "PASS" : "FAIL"}`,
            );

            if (!result) {
                passed = false;
            }
        }

        console.log(
            `[F-6D] STATIC RESULT: ${passed ? "PASS" : "FAIL"}`,
        );

        if (!passed) {
            throw new Error(
                "[F-6D] Hierarchical top-down Ground Fire geometry validation failed.",
            );
        }
    }
}
