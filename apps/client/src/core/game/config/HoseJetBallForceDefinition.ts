export interface HoseJetBallForceDefinition {
    readonly jetLength: number;
    readonly startRadius: number;
    readonly endRadius: number;

    readonly referenceFlowRate: number;
    readonly referenceLaunchSpeed: number;

    readonly baseAcceleration: number;
    readonly maximumAcceleration: number;

    /** Reference mass used to turn jet acceleration into a fixed external impulse.
     * Real target inverse mass then determines how strongly each object moves. */
    readonly dynamicTargetReferenceMass: number;

    readonly minimumDistanceInfluence: number;
    readonly distanceFalloffExponent: number;
    readonly edgeFalloffExponent: number;

    readonly maximumDeltaTime: number;
    /** Small longitudinal allowance for Ball radius/contact sampling. */
    readonly authoritativeReachPadding: number;

    /** Robot-Hose only. Radius around the live ground-impact point that captures the Ball. */
    readonly impactCaptureRadius: number;
    /** Robot-Hose only. Distance over which transport speed is reduced before capture. */
    readonly impactBrakingRadius: number;
    /** Robot-Hose only. Maximum desired transport speed toward the live impact point. */
    readonly impactTransportSpeed: number;
}

export const DEFAULT_HOSE_JET_BALL_FORCE_DEFINITION:
    HoseJetBallForceDefinition = {
        /*
         * Hose launchSpeed = 900 px/s at 25 degrees. The visual airborne
         * stream reaches roughly 600 px before ground impact, so this gameplay
         * region intentionally tracks that same useful reach.
         */
        jetLength: 620,

        /*
         * Slightly widening stream approximation. Ball radius is added during
         * overlap testing, so the player does not need pixel-perfect contact.
         */
        startRadius: 12,
        endRadius: 26,

        /*
         * Current Hose tuning. Keeping these as references means later Hose
         * variants can become stronger/weaker without changing this system.
         */
        referenceFlowRate: 2.4,
        referenceLaunchSpeed: 900,

        /*
         * Grass rolling resistance is substantial, so the Hose must exceed it
         * enough to become a real hazard/tool while remaining controllable.
         */
        baseAcceleration: 1450,
        maximumAcceleration: 2200,
        dynamicTargetReferenceMass: 1,

        /*
         * The stream remains useful near its far end but is strongest close to
         * the nozzle and near the centreline.
         */
        minimumDistanceInfluence: 0.38,
        distanceFalloffExponent: 1.15,
        edgeFalloffExponent: 1.6,

        /*
         * Match the Ball's defensive frame-delta policy. Large browser hitches
         * cannot turn into a single huge jet impulse.
         */
        maximumDeltaTime: 0.05,

        authoritativeReachPadding: 2,

        // Ignored by the normal Hydrant Hose because it does not request
        // transport-to-impact behaviour.
        impactCaptureRadius: 34,
        impactBrakingRadius: 120,
        impactTransportSpeed: 520,
    };

/** Robot Water attacks use the same jet geometry but enable terminal capture. */
export const ROBOT_HOSE_JET_BALL_FORCE_DEFINITION: HoseJetBallForceDefinition = {
    ...DEFAULT_HOSE_JET_BALL_FORCE_DEFINITION,
    // A wider capture/braking envelope prevents residual Ball momentum from
    // carrying it through the live deposition point on high-speed approaches.
    impactCaptureRadius: 54,
    impactBrakingRadius: 190,
    impactTransportSpeed: 420,
};

export function validateHoseJetBallForceDefinition(
    definition:
        HoseJetBallForceDefinition,
): void {
    const positiveValues = [
        definition.jetLength,
        definition.startRadius,
        definition.endRadius,
        definition.referenceFlowRate,
        definition.referenceLaunchSpeed,
        definition.baseAcceleration,
        definition.maximumAcceleration,
        definition.dynamicTargetReferenceMass,
        definition.distanceFalloffExponent,
        definition.edgeFalloffExponent,
        definition.maximumDeltaTime,
        definition.authoritativeReachPadding,
        definition.impactCaptureRadius,
        definition.impactBrakingRadius,
        definition.impactTransportSpeed,
    ];

    if (
        positiveValues.some(
            (value): boolean =>
                !Number.isFinite(value) ||
                value <= 0,
        )
    ) {
        throw new Error(
            "HoseJetBallForceDefinition requires finite positive tuning values.",
        );
    }

    if (
        definition.endRadius <
        definition.startRadius
    ) {
        throw new Error(
            "Hose jet endRadius cannot be smaller than startRadius.",
        );
    }

    if (
        definition.maximumAcceleration <
        definition.baseAcceleration
    ) {
        throw new Error(
            "Hose jet maximumAcceleration cannot be lower than baseAcceleration.",
        );
    }

    if (
        !Number.isFinite(
            definition.minimumDistanceInfluence,
        ) ||
        definition.minimumDistanceInfluence < 0 ||
        definition.minimumDistanceInfluence > 1
    ) {
        throw new Error(
            "Hose jet minimumDistanceInfluence must be between 0 and 1.",
        );
    }
}
