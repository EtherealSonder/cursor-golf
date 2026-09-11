import {
    WaterSourceType,
} from "./WaterSourceDefinition";

import type {
    WaterSourceDefinition,
} from "./WaterSourceDefinition";

/**
 * Phase 8B-10B.1
 *
 * Hose-specific Water-production tuning.
 *
 * This configuration deliberately remains separate from
 * HydrantHoseDefinition:
 *
 * HydrantHoseDefinition
 * -> rope physics / collision / presentation
 *
 * HoseWaterDefinition
 * -> Water volume / launch / Wind response / impact momentum
 *
 * The Hose mechanism will convert this immutable tuning into a normal
 * WaterSourceDefinition when 8B-10B.2 registers the DirectionalJet source.
 */
export interface HoseWaterDefinition {

    /** Authoritative Water quantity emitted per second while active. */
    readonly flowRate:
    number;

    /** Time between representative authoritative jet emissions. */
    readonly emissionInterval:
    number;

    /** Horizontal/airborne launch speed of the pressurized jet. */
    readonly launchSpeed:
    number;

    /**
     * Upward angle above the ground plane.
     *
     * The Hose deliberately launches at a shallower angle than the
     * Sprinkler so it reads as a forceful directional jet.
     */
    readonly launchElevationRadians:
    number;

    /**
     * Relative susceptibility to global/local Wind.
     *
     * A pressurized Hose stream should bend only slightly compared with the
     * Sprinkler's finer Water stream.
     */
    readonly windResponse:
    number;

    /**
     * Fraction of horizontal airborne velocity retained when the jet reaches
     * the WaterField.
     *
     * Hose Water intentionally retains most of its momentum so later ground
     * flow is strongly directional.
     */
    readonly impactMomentumRetention:
    number;
}

/**
 * Initial conservative Hose tuning.
 *
 * These values are intentionally strong enough to contrast with the
 * Sprinkler without immediately pushing the WaterField into an extreme
 * flooding stress case. They are expected to be gameplay-tuned after the
 * first visible jet test in 8B-10B.4/8B-10B.5.
 */
export const DEFAULT_HOSE_WATER_DEFINITION:
    HoseWaterDefinition = {

    flowRate:
        2.4,

    emissionInterval:
        0.04,

    launchSpeed:
        900,

    launchElevationRadians:
        25 *
        Math.PI /
        180,

    windResponse:
        0.10,

    impactMomentumRetention:
        0.90,
};

/**
 * Creates the generic WaterSourceDefinition consumed by WaterSourceSystem.
 *
 * Position and direction are supplied by the physical Hose mechanism.
 * During 8B-10B.3 those values will be synchronized every frame from the
 * final two authoritative rope points.
 */
export function createHoseWaterSourceDefinition(
    id:
        string,

    positionX:
        number,

    positionY:
        number,

    directionRadians:
        number,

    enabled =
        true,

    definition:
        HoseWaterDefinition =
        DEFAULT_HOSE_WATER_DEFINITION,
): WaterSourceDefinition {

    validateHoseWaterDefinition(
        definition,
    );

    if (
        id.trim().length ===
        0
    ) {
        throw new Error(
            "Hose Water source id must not be empty.",
        );
    }

    if (
        !Number.isFinite(
            positionX,
        ) ||
        !Number.isFinite(
            positionY,
        ) ||
        !Number.isFinite(
            directionRadians,
        )
    ) {
        throw new Error(
            "Hose Water source transform must contain finite values.",
        );
    }

    return {
        id,

        type:
            WaterSourceType
                .DirectionalJet,

        enabled,

        positionX,

        positionY,

        directionRadians,

        flowRate:
            definition.flowRate,

        emissionInterval:
            definition
                .emissionInterval,

        launchSpeed:
            definition.launchSpeed,

        launchElevationRadians:
            definition
                .launchElevationRadians,

        windResponse:
            definition.windResponse,

        impactMomentumRetention:
            definition
                .impactMomentumRetention,
    };
}

export function validateHoseWaterDefinition(
    definition:
        HoseWaterDefinition,
): void {

    const finiteValues = [
        definition.flowRate,
        definition.emissionInterval,
        definition.launchSpeed,
        definition.launchElevationRadians,
        definition.windResponse,
        definition.impactMomentumRetention,
    ];

    if (
        finiteValues.some(
            (
                value:
                    number,
            ): boolean =>
                !Number.isFinite(
                    value,
                ),
        )
    ) {
        throw new Error(
            "HoseWaterDefinition contains a non-finite numeric value.",
        );
    }

    if (
        definition.flowRate <
        0
    ) {
        throw new Error(
            "HoseWaterDefinition flowRate must be >= 0.",
        );
    }

    if (
        definition.emissionInterval <=
        0
    ) {
        throw new Error(
            "HoseWaterDefinition emissionInterval must be > 0.",
        );
    }

    if (
        definition.launchSpeed <
        0
    ) {
        throw new Error(
            "HoseWaterDefinition launchSpeed must be >= 0.",
        );
    }

    if (
        definition.launchElevationRadians <
        0 ||
        definition.launchElevationRadians >
        Math.PI /
        2
    ) {
        throw new Error(
            "HoseWaterDefinition launchElevationRadians must be between 0 and PI / 2.",
        );
    }

    if (
        definition.windResponse <
        0
    ) {
        throw new Error(
            "HoseWaterDefinition windResponse must be >= 0.",
        );
    }

    if (
        definition.impactMomentumRetention <
        0 ||
        definition.impactMomentumRetention >
        1
    ) {
        throw new Error(
            "HoseWaterDefinition impactMomentumRetention must be between 0 and 1.",
        );
    }
}
