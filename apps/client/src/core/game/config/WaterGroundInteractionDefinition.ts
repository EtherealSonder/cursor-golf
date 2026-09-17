import {
    SurfaceType,
} from "../surface/SurfaceType";

export interface SurfaceInfiltrationDefinition {
    readonly surfaceType: SurfaceType;

    /**
     * Material-specific multiplier applied to the shared base infiltration
     * rate. This keeps material behavior data-driven rather than scattering
     * SurfaceType checks through the interaction loop.
     */
    readonly infiltrationRateMultiplier: number;

    /**
     * Lowest rate multiplier approached as the ground becomes saturated.
     * Fully saturated ground still absorbs zero because storage capacity is
     * zero at maximum moisture.
     */
    readonly minimumSaturatedAbsorption: number;

    /**
     * Shapes how quickly absorption falls as saturation increases.
     * Values above 1 make the resistance to further absorption stronger.
     */
    readonly saturationExponent: number;

    /**
     * Fraction of excess ground moisture removed per second while drying.
     * Drying is multiplicative, so moisture approaches the terrain baseline
     * smoothly instead of falling at a constant absolute rate.
     */
    readonly dryingRate: number;
}

/**
 * Phase 8C configuration for interaction between authoritative standing
 * Water and the continuous environmental substrate.
 *
 * 8C-2 introduced deterministic Water -> moisture transfer plus shallow-Water
 * attenuation. 8C-3 adds saturation-dependent absorption and material-specific
 * infiltration profiles.
 */
export interface WaterGroundInteractionDefinition {
    readonly enabled: boolean;

    /**
     * Standing Water at or above this depth counts as meaningful ground
     * contact for the Phase 8C-6A wet-footprint rule.
     */
    readonly minimumContactWettingDepth: number;

    /**
     * Minimum normalized ground moisture established beneath meaningful
     * standing Water. This is a fast surface-contact response, separate from
     * the slower conservative infiltration/saturation process.
     */
    readonly contactWetMoistureFloor: number;

    /**
     * Shared standing-Water depth units absorbed per second before applying
     * material, standing-depth, and saturation multipliers.
     */
    readonly baseInfiltrationRate: number;

    /**
     * Explicit unit conversion between the two authoritative domains.
     *
     * moistureAdded =
     *     waterDepthRemoved * waterDepthToMoisture
     */
    readonly waterDepthToMoisture: number;

    /**
     * Standing-Water depth below which infiltration uses the minimum depth
     * multiplier. This lets newly deposited thin films accumulate instead of
     * being consumed immediately.
     */
    readonly minimumInfiltrationDepth: number;

    /**
     * Standing-Water depth at which the full standing-depth multiplier is
     * reached.
     */
    readonly fullInfiltrationDepth: number;

    /**
     * Fraction of the depth component retained for very shallow Water.
     */
    readonly minimumDepthInfiltrationMultiplier: number;

    /**
     * Per-material infiltration behavior.
     */
    readonly surfaceProfiles:
    readonly SurfaceInfiltrationDefinition[];

    /**
     * Fraction of a moisture difference exchanged with a four-neighbour cell
     * per second. Kept deliberately small so moisture movement feels much
     * slower than visible standing-Water flow.
     */
    readonly moistureDiffusionRate: number;

    /** Ignore tiny gradients so nearly equilibrated cells can leave the active set later. */
    readonly minimumDiffusionDifference: number;

    /**
     * Moisture diffusion and drying are slow substrate processes and do not
     * require a 60 Hz update. They accumulate elapsed fixed-step time and run
     * at this cadence while preserving the same per-second rates.
     */
    readonly moistureMaintenanceInterval: number;

    /**
     * Thin-film cleanup cadence. This remains faster than substrate moisture
     * maintenance but does not need to execute on every 60 Hz interaction
     * substep.
     */
    readonly shallowWaterMaintenanceInterval: number;

    /**
     * Standing-Water films at or below this depth can use the cleanup
     * dissipation sink. Visible puddles above this threshold are unaffected.
     */
    readonly shallowWaterDissipationDepth: number;

    /**
     * Water-depth units removed per second from qualifying microscopic films.
     * Infiltration remains the primary puddle-removal mechanism.
     */
    readonly shallowWaterDissipationRate: number;

    /**
     * Interaction simulation uses a fixed internal step so equivalent elapsed
     * time produces the same result at different render frame rates.
     */
    readonly fixedTimeStep: number;

    /**
     * Guard against excessive catch-up work after a long frame.
     */
    readonly maximumSubsteps: number;

    /**
     * Maximum render-frame delta accepted by the interaction accumulator.
     */
    readonly maximumFrameDelta: number;
}

export const DEFAULT_WATER_GROUND_INTERACTION_DEFINITION:
    WaterGroundInteractionDefinition = {
    enabled: true,

    /*
     * Meaningful standing Water immediately establishes a Wet ground
     * footprint beneath itself. This floor sits just above the categorical
     * Wet threshold used by MoistureSurfaceBridge.
     *
     * Phase 8F-7 calibration:
     * 0.105 was enough to classify terrain as visually Wet, but it left the
     * coarse Fire ignition footprint at only about 0.10 moisture in the
     * real Water lifecycle. 0.65 gives meaningful standing Water a genuinely
     * soaked retained-moisture state. The existing drying lifecycle then
     * restores Fire susceptibility continuously without a cooldown timer.
     */
    minimumContactWettingDepth: 0.003,
    contactWetMoistureFloor: 0.65,

    /*
     * Retain the tuned 8C-2 baseline. Saturation now reduces this rate over
     * repeated watering rather than requiring another global reduction.
     */
    baseInfiltrationRate: 0.002,

    waterDepthToMoisture: 0.5,

    minimumInfiltrationDepth: 0.01,
    fullInfiltrationDepth: 0.10,
    minimumDepthInfiltrationMultiplier: 0.10,

    surfaceProfiles: [
        {
            surfaceType:
                SurfaceType.Grass,

            infiltrationRateMultiplier:
                1.0,

            minimumSaturatedAbsorption:
                0.08,

            saturationExponent:
                1.5,

            dryingRate:
                0.015,
        },
        {
            surfaceType:
                SurfaceType.Sand,

            /*
             * Sand currently absorbs somewhat faster than Grass. These values
             * are intentionally data-driven and can be tuned later without
             * changing WaterGroundInteractionSystem.
             */
            infiltrationRateMultiplier:
                1.25,

            minimumSaturatedAbsorption:
                0.12,

            saturationExponent:
                1.25,

            dryingRate:
                0.025,
        },
    ],

    moistureDiffusionRate: 0.16,
    minimumDiffusionDifference: 0.001,

    /*
     * Slow environmental state is intentionally decoupled from the 60 Hz
     * standing-Water interaction loop.
     */
    moistureMaintenanceInterval: 0.1,
    shallowWaterMaintenanceInterval: 1 / 30,

    /*
     * This is deliberately far below the depth of a visible puddle. It only
     * removes residual films that would otherwise linger around solver
     * thresholds.
     */
    shallowWaterDissipationDepth: 0.002,
    shallowWaterDissipationRate: 0.0004,

    fixedTimeStep: 1 / 60,
    maximumSubsteps: 6,
    maximumFrameDelta: 0.1,
};

export function validateWaterGroundInteractionDefinition(
    definition: WaterGroundInteractionDefinition,
): void {
    if (typeof definition.enabled !== "boolean") {
        throw new Error(
            "Water ground interaction enabled must be a boolean.",
        );
    }

    if (
        !Number.isFinite(
            definition.minimumContactWettingDepth,
        ) ||
        definition.minimumContactWettingDepth < 0
    ) {
        throw new Error(
            "Water ground interaction minimumContactWettingDepth must be finite and non-negative.",
        );
    }

    if (
        !Number.isFinite(
            definition.contactWetMoistureFloor,
        ) ||
        definition.contactWetMoistureFloor < 0 ||
        definition.contactWetMoistureFloor > 1
    ) {
        throw new Error(
            "Water ground interaction contactWetMoistureFloor must be finite and between zero and one.",
        );
    }

    if (
        !Number.isFinite(definition.baseInfiltrationRate) ||
        definition.baseInfiltrationRate < 0
    ) {
        throw new Error(
            "Water ground interaction baseInfiltrationRate must be finite and greater than or equal to zero.",
        );
    }

    if (
        !Number.isFinite(definition.waterDepthToMoisture) ||
        definition.waterDepthToMoisture <= 0
    ) {
        throw new Error(
            "Water ground interaction waterDepthToMoisture must be finite and greater than zero.",
        );
    }

    if (
        !Number.isFinite(definition.minimumInfiltrationDepth) ||
        definition.minimumInfiltrationDepth < 0
    ) {
        throw new Error(
            "Water ground interaction minimumInfiltrationDepth must be finite and greater than or equal to zero.",
        );
    }

    if (
        !Number.isFinite(definition.fullInfiltrationDepth) ||
        definition.fullInfiltrationDepth <=
        definition.minimumInfiltrationDepth
    ) {
        throw new Error(
            "Water ground interaction fullInfiltrationDepth must be finite and greater than minimumInfiltrationDepth.",
        );
    }

    if (
        !Number.isFinite(
            definition.minimumDepthInfiltrationMultiplier,
        ) ||
        definition.minimumDepthInfiltrationMultiplier < 0 ||
        definition.minimumDepthInfiltrationMultiplier > 1
    ) {
        throw new Error(
            "Water ground interaction minimumDepthInfiltrationMultiplier must be finite and between zero and one.",
        );
    }

    if (definition.surfaceProfiles.length === 0) {
        throw new Error(
            "Water ground interaction requires at least one surface infiltration profile.",
        );
    }

    const seenSurfaceTypes =
        new Set<SurfaceType>();

    for (
        const profile
        of definition.surfaceProfiles
    ) {
        if (
            seenSurfaceTypes.has(
                profile.surfaceType,
            )
        ) {
            throw new Error(
                `Water ground interaction contains more than one infiltration profile for surface '${profile.surfaceType}'.`,
            );
        }

        seenSurfaceTypes.add(
            profile.surfaceType,
        );

        if (
            !Number.isFinite(
                profile.infiltrationRateMultiplier,
            ) ||
            profile.infiltrationRateMultiplier < 0
        ) {
            throw new Error(
                `Water ground interaction infiltrationRateMultiplier for '${profile.surfaceType}' must be finite and greater than or equal to zero.`,
            );
        }

        if (
            !Number.isFinite(
                profile.minimumSaturatedAbsorption,
            ) ||
            profile.minimumSaturatedAbsorption < 0 ||
            profile.minimumSaturatedAbsorption > 1
        ) {
            throw new Error(
                `Water ground interaction minimumSaturatedAbsorption for '${profile.surfaceType}' must be finite and between zero and one.`,
            );
        }

        if (
            !Number.isFinite(
                profile.saturationExponent,
            ) ||
            profile.saturationExponent <= 0
        ) {
            throw new Error(
                `Water ground interaction saturationExponent for '${profile.surfaceType}' must be finite and greater than zero.`,
            );
        }

        if (
            !Number.isFinite(
                profile.dryingRate,
            ) ||
            profile.dryingRate < 0
        ) {
            throw new Error(
                `Water ground interaction dryingRate for '${profile.surfaceType}' must be finite and greater than or equal to zero.`,
            );
        }
    }

    for (
        const surfaceType
        of Object.values(
            SurfaceType,
        )
    ) {
        if (
            !seenSurfaceTypes.has(
                surfaceType,
            )
        ) {
            throw new Error(
                `Water ground interaction is missing an infiltration profile for surface '${surfaceType}'.`,
            );
        }
    }

    if (
        !Number.isFinite(definition.moistureDiffusionRate) ||
        definition.moistureDiffusionRate < 0
    ) {
        throw new Error(
            "Water ground interaction moistureDiffusionRate must be finite and greater than or equal to zero.",
        );
    }

    if (
        !Number.isFinite(definition.minimumDiffusionDifference) ||
        definition.minimumDiffusionDifference < 0
    ) {
        throw new Error(
            "Water ground interaction minimumDiffusionDifference must be finite and greater than or equal to zero.",
        );
    }

    if (
        !Number.isFinite(
            definition.moistureMaintenanceInterval,
        ) ||
        definition.moistureMaintenanceInterval <= 0
    ) {
        throw new Error(
            "Water ground interaction moistureMaintenanceInterval must be finite and greater than zero.",
        );
    }

    if (
        !Number.isFinite(
            definition.shallowWaterMaintenanceInterval,
        ) ||
        definition.shallowWaterMaintenanceInterval <= 0
    ) {
        throw new Error(
            "Water ground interaction shallowWaterMaintenanceInterval must be finite and greater than zero.",
        );
    }

    if (
        !Number.isFinite(
            definition.shallowWaterDissipationDepth,
        ) ||
        definition.shallowWaterDissipationDepth < 0
    ) {
        throw new Error(
            "Water ground interaction shallowWaterDissipationDepth must be finite and greater than or equal to zero.",
        );
    }

    if (
        !Number.isFinite(
            definition.shallowWaterDissipationRate,
        ) ||
        definition.shallowWaterDissipationRate < 0
    ) {
        throw new Error(
            "Water ground interaction shallowWaterDissipationRate must be finite and greater than or equal to zero.",
        );
    }

    if (
        !Number.isFinite(definition.fixedTimeStep) ||
        definition.fixedTimeStep <= 0
    ) {
        throw new Error(
            "Water ground interaction fixedTimeStep must be finite and greater than zero.",
        );
    }

    if (
        !Number.isInteger(definition.maximumSubsteps) ||
        definition.maximumSubsteps <= 0
    ) {
        throw new Error(
            "Water ground interaction maximumSubsteps must be a positive integer.",
        );
    }

    if (
        !Number.isFinite(definition.maximumFrameDelta) ||
        definition.maximumFrameDelta <= 0
    ) {
        throw new Error(
            "Water ground interaction maximumFrameDelta must be finite and greater than zero.",
        );
    }

    if (
        definition.maximumFrameDelta <
        definition.fixedTimeStep
    ) {
        throw new Error(
            "Water ground interaction maximumFrameDelta must be greater than or equal to fixedTimeStep.",
        );
    }
}
