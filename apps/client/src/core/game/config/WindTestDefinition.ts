/**
 * Stable machine-readable identifier for one
 * deterministic wind-validation preset.
 */
export type WindTestPresetId =
    | "zero-wind"
    | "weak-tailwind"
    | "strong-tailwind"
    | "weak-headwind"
    | "strong-headwind"
    | "weak-crosswind"
    | "strong-crosswind"
    | "weak-diagonal-wind"
    | "strong-diagonal-wind";

/**
 * Broad directional relationship between the wind
 * and the reference validation shot.
 *
 * C7 validation assumes the reference shot travels
 * horizontally toward the right.
 */
export type WindTestRelationship =
    | "none"
    | "tailwind"
    | "headwind"
    | "crosswind"
    | "diagonal";

/**
 * Immutable deterministic wind condition used during
 * Milestone C7 tuning and validation.
 */
export interface WindTestPreset {

    /**
     * Stable machine-readable identifier.
     */
    readonly id: WindTestPresetId;

    /**
     * Human-readable name shown in the temporary
     * development controls.
     */
    readonly name: string;

    /**
     * Short explanation of the test condition.
     */
    readonly description: string;

    /**
     * Relationship to the reference rightward shot.
     */
    readonly relationship:
    WindTestRelationship;

    /**
     * Screen-space wind direction.
     *
     * 0 degrees   = right
     * 90 degrees  = down
     * 180 degrees = left
     * 270 degrees = up
     */
    readonly directionDegrees: number;

    /**
     * Player-facing wind speed in km/h.
     *
     * This uses the same value displayed by the Wind
     * HUD. It is converted internally by WindManager.
     */
    readonly speedKph: number;
}

/**
 * Deterministic wind presets for C7 validation.
 *
 * Reference shot convention:
 *
 * The Ball is struck horizontally toward the right.
 *
 * Therefore:
 *
 * 0 degrees   = tailwind
 * 180 degrees = headwind
 * 90 degrees  = perpendicular downward crosswind
 * 45 degrees  = down-right diagonal tail-crosswind
 *
 * These values do not modify the normal randomized
 * wind bands or any physics tuning values.
 */
export const WIND_TEST_PRESETS:
    readonly WindTestPreset[] = [

        {
            id: "zero-wind",

            name: "Zero Wind",

            description:
                "No environmental wind. Establishes the baseline Ball trajectory and travel distance.",

            relationship: "none",

            directionDegrees: 0,

            speedKph: 0,
        },

        {
            id: "weak-tailwind",

            name: "Weak Tailwind",

            description:
                "A weak wind travels in the same direction as the reference rightward shot.",

            relationship: "tailwind",

            directionDegrees: 0,

            speedKph: 20,
        },

        {
            id: "strong-tailwind",

            name: "Strong Tailwind",

            description:
                "A strong wind travels in the same direction as the reference rightward shot.",

            relationship: "tailwind",

            directionDegrees: 0,

            speedKph: 80,
        },

        {
            id: "weak-headwind",

            name: "Weak Headwind",

            description:
                "A weak wind travels directly against the reference rightward shot.",

            relationship: "headwind",

            directionDegrees: 180,

            speedKph: 20,
        },

        {
            id: "strong-headwind",

            name: "Strong Headwind",

            description:
                "A strong wind travels directly against the reference rightward shot.",

            relationship: "headwind",

            directionDegrees: 180,

            speedKph: 80,
        },

        {
            id: "weak-crosswind",

            name: "Weak Crosswind",

            description:
                "A weak downward wind acts perpendicular to the reference rightward shot.",

            relationship: "crosswind",

            directionDegrees: 90,

            speedKph: 20,
        },

        {
            id: "strong-crosswind",

            name: "Strong Crosswind",

            description:
                "A strong downward wind acts perpendicular to the reference rightward shot.",

            relationship: "crosswind",

            directionDegrees: 90,

            speedKph: 80,
        },

        {
            id: "weak-diagonal-wind",

            name: "Weak Diagonal Wind",

            description:
                "A weak down-right wind combines a tailwind component with lateral drift.",

            relationship: "diagonal",

            directionDegrees: 45,

            speedKph: 20,
        },

        {
            id: "strong-diagonal-wind",

            name: "Strong Diagonal Wind",

            description:
                "A strong down-right wind combines a tailwind component with lateral drift.",

            relationship: "diagonal",

            directionDegrees: 45,

            speedKph: 80,
        },
    ];

/**
 * Returns the first deterministic preset.
 *
 * The explicit check prevents a malformed empty
 * preset collection from silently propagating.
 */
export function getFirstWindTestPreset():
    WindTestPreset {

    const firstPreset =
        WIND_TEST_PRESETS[0];

    if (!firstPreset) {
        throw new Error(
            "Wind test presets require at least one preset.",
        );
    }

    return firstPreset;
}