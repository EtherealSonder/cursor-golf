export interface HoseJetBallForceDefinition {
    readonly jetLength: number;
    readonly startRadius: number;
    readonly endRadius: number;

    readonly referenceFlowRate: number;
    readonly referenceLaunchSpeed: number;

    readonly baseAcceleration: number;
    readonly maximumAcceleration: number;

    readonly minimumDistanceInfluence: number;
    readonly distanceFalloffExponent: number;
    readonly edgeFalloffExponent: number;

    readonly maximumDeltaTime: number;
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
        baseAcceleration: 1150,
        maximumAcceleration: 1650,

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
        definition.distanceFalloffExponent,
        definition.edgeFalloffExponent,
        definition.maximumDeltaTime,
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
