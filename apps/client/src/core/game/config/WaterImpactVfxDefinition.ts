/**
 * Phase 8I-7B presentation-only tuning for shared Water impact intensity.
 *
 * These values interpret an already-authoritative impact for VFX. They must
 * never feed back into Water transport, collision, deposition, Ball physics,
 * Fire logic, or any other gameplay system.
 */
export interface WaterImpactVfxDefinition {
    /** Temporary 8I-7C.1 visual inspection gallery. Disable after art approval. */
    readonly debugShowPrimitiveGallery: boolean;

    /** Speed (px/s) that contributes a full speed signal. */
    readonly speedForFullIntensity: number;

    /** Water amount that contributes a full amount signal. */
    readonly waterAmountForFullIntensity: number;

    /** Relative contribution of impact speed to presentation intensity. */
    readonly speedWeight: number;

    /** Relative contribution of packet Water amount to presentation intensity. */
    readonly waterAmountWeight: number;

    /** Small presentation emphasis for authoritative static-obstacle impacts. */
    readonly staticCollisionMultiplier: number;

    /** Locked illustrated Water palette used by impact primitives. */
    readonly primaryColor: number;
    readonly lightColor: number;
    readonly highlightColor: number;

    /** Generated primitive dimensions in pixels. */
    readonly splashTextureSize: number;
    readonly dropletTextureSize: number;
    readonly elongatedDropletWidth: number;
    readonly elongatedDropletHeight: number;
    readonly surfaceDisturbanceWidth: number;
    readonly surfaceDisturbanceHeight: number;
    readonly rippleWidth: number;
    readonly rippleHeight: number;

    /** 8I-7D hard-bounded runtime pool capacities. */
    readonly impactGroundInitialCapacity: number;
    readonly impactGroundMaximumCapacity: number;
    readonly impactAirborneInitialCapacity: number;
    readonly impactAirborneMaximumCapacity: number;

    /** Shared ballistic presentation tuning. */
    readonly impactGravityY: number;
    readonly impactDragPerSecond: number;

    /** 8I-7I deterministic, bounded organic variation. */
    readonly fineLobeCountMin: number;
    readonly fineLobeCountMax: number;
    readonly fineDropletCountMin: number;
    readonly fineDropletCountMax: number;
    readonly mediumLobeCountMin: number;
    readonly mediumLobeCountMax: number;
    readonly mediumDropletCountMin: number;
    readonly mediumDropletCountMax: number;
    readonly heavyLobeCountMin: number;
    readonly heavyLobeCountMax: number;
    readonly heavyDropletCountMin: number;
    readonly heavyDropletCountMax: number;
    readonly lobeSpeedMin: number;
    readonly lobeSpeedMax: number;
    readonly dropletSpeedMin: number;
    readonly dropletSpeedMax: number;
    readonly lobeLifetimeMin: number;
    readonly lobeLifetimeMax: number;
    readonly dropletLifetimeMin: number;
    readonly dropletLifetimeMax: number;
    readonly impactPositionJitterX: number;
    readonly impactPositionJitterY: number;
    readonly rippleScaleVariation: number;
    readonly disturbanceScaleVariation: number;

    /** 8I-7J shared presentation-only emission safety budget. */
    readonly impactMaximumCompositionsPerSecond: number;
    readonly impactMaximumRipplesPerSecond: number;
    readonly impactMinimumPresentationIntensity: number;
    readonly impactEmissionBudgetWindowSeconds: number;

    /** Temporary isolated Fine/Medium/Heavy motion demo. */
    readonly debugShowImpactRuntimeDemo: boolean;

    /** 8I-7E Sprinkler presentation throttling and directional response. */
    readonly sprinklerGroundEmissionCooldownSeconds: number;
    readonly sprinklerObstacleEmissionCooldownSeconds: number;
    readonly sprinklerGroundMinimumIntensity: number;
    readonly sprinklerGroundMaximumIntensity: number;
    readonly sprinklerObstacleMinimumIntensity: number;
    readonly sprinklerObstacleMaximumIntensity: number;
    readonly sprinklerGroundDirectionalBias: number;
    readonly sprinklerObstacleDirectionalBias: number;

    /** 8I-7G continuous Hose ground-contact presentation. */
    readonly hoseGroundContactTimeoutSeconds: number;
    readonly hoseGroundEmissionCooldownSeconds: number;
    readonly hoseGroundMinimumIntensity: number;
    readonly hoseGroundMaximumIntensity: number;
    readonly hoseGroundDirectionalBias: number;
    readonly hoseGroundPositionSmoothing: number;
    readonly hoseGroundMinimumAccumulatedAmount: number;

    /** 8I-7H continuous Hose static-obstacle impact presentation. */
    readonly hoseObstacleContactTimeoutSeconds: number;
    readonly hoseObstacleEmissionCooldownSeconds: number;
    readonly hoseObstacleMinimumIntensity: number;
    readonly hoseObstacleMaximumIntensity: number;
    readonly hoseObstacleDirectionalBias: number;
    readonly hoseObstaclePositionSmoothing: number;
    readonly hoseObstacleMinimumAccumulatedAmount: number;

    /** Intensities below this are classified as Fine. */
    readonly mediumTierThreshold: number;

    /** Intensities at/above this are classified as Heavy. */
    readonly heavyTierThreshold: number;
}

export const DEFAULT_WATER_IMPACT_VFX_DEFINITION:
    WaterImpactVfxDefinition = {
    debugShowPrimitiveGallery: false,
    speedForFullIntensity: 520,
    waterAmountForFullIntensity: 0.85,
    speedWeight: 0.68,
    waterAmountWeight: 0.32,
    staticCollisionMultiplier: 1.08,
    primaryColor: 0x49c9ee,
    lightColor: 0x8fe7fa,
    highlightColor: 0xeafbff,
    splashTextureSize: 48,
    dropletTextureSize: 20,
    elongatedDropletWidth: 38,
    elongatedDropletHeight: 22,
    surfaceDisturbanceWidth: 58,
    surfaceDisturbanceHeight: 28,
    rippleWidth: 72,
    rippleHeight: 38,
    impactGroundInitialCapacity: 12,
    impactGroundMaximumCapacity: 32,
    impactAirborneInitialCapacity: 32,
    impactAirborneMaximumCapacity: 96,
    impactGravityY: 310,
    impactDragPerSecond: 1.4,

    /*
     * 8I-7I: variation is deliberately narrow. It removes visible repetition
     * without changing the authored identity of Fine, Medium, or Heavy impacts.
     */
    fineLobeCountMin: 1,
    fineLobeCountMax: 1,
    fineDropletCountMin: 0,
    fineDropletCountMax: 1,
    mediumLobeCountMin: 2,
    mediumLobeCountMax: 3,
    mediumDropletCountMin: 2,
    mediumDropletCountMax: 3,
    heavyLobeCountMin: 4,
    heavyLobeCountMax: 6,
    heavyDropletCountMin: 3,
    heavyDropletCountMax: 6,
    lobeSpeedMin: 55,
    lobeSpeedMax: 125,
    dropletSpeedMin: 80,
    dropletSpeedMax: 185,
    lobeLifetimeMin: 0.28,
    lobeLifetimeMax: 0.48,
    dropletLifetimeMin: 0.22,
    dropletLifetimeMax: 0.42,
    impactPositionJitterX: 4,
    impactPositionJitterY: 3,
    rippleScaleVariation: 0.08,
    disturbanceScaleVariation: 0.06,

    /*
     * Final presentation-only safety net after source-specific aggregation.
     * These limits never alter authoritative impacts, deposition, or packets.
     */
    impactMaximumCompositionsPerSecond: 24,
    impactMaximumRipplesPerSecond: 18,
    impactMinimumPresentationIntensity: 0.04,
    impactEmissionBudgetWindowSeconds: 1.0,

    debugShowImpactRuntimeDemo: false,
    sprinklerGroundEmissionCooldownSeconds: 0.12,
    sprinklerObstacleEmissionCooldownSeconds: 0.07,
    sprinklerGroundMinimumIntensity: 0.05,
    sprinklerGroundMaximumIntensity: 0.42,
    sprinklerObstacleMinimumIntensity: 0.05,
    sprinklerObstacleMaximumIntensity: 0.58,
    sprinklerGroundDirectionalBias: 0.28,
    sprinklerObstacleDirectionalBias: 0.82,

    /*
     * Hose ground impact is deliberately heavier and broader than the
     * Sprinkler response. Contact persists across packet impacts while large
     * splash compositions are emitted at a bounded cadence.
     */
    hoseGroundContactTimeoutSeconds: 0.24,
    hoseGroundEmissionCooldownSeconds: 0.14,
    hoseGroundMinimumIntensity: 0.68,
    hoseGroundMaximumIntensity: 0.92,
    hoseGroundDirectionalBias: 0.34,
    hoseGroundPositionSmoothing: 0.42,
    hoseGroundMinimumAccumulatedAmount: 0.10,

    /*
     * Static-obstacle Hose contact uses the same Heavy illustrated vocabulary
     * as ground contact, but emits slightly more frequently and strongly biases
     * fragments away from the incoming jet direction.
     */
    hoseObstacleContactTimeoutSeconds: 0.22,
    hoseObstacleEmissionCooldownSeconds: 0.11,
    hoseObstacleMinimumIntensity: 0.68,
    hoseObstacleMaximumIntensity: 0.96,
    hoseObstacleDirectionalBias: 0.86,
    hoseObstaclePositionSmoothing: 0.48,
    hoseObstacleMinimumAccumulatedAmount: 0.08,

    mediumTierThreshold: 0.34,
    heavyTierThreshold: 0.68,
};

export function validateWaterImpactVfxDefinition(
    definition: WaterImpactVfxDefinition,
): void {
    if (!(definition.speedForFullIntensity > 0)) {
        throw new Error("Water impact VFX speedForFullIntensity must be > 0.");
    }

    if (!(definition.waterAmountForFullIntensity > 0)) {
        throw new Error("Water impact VFX waterAmountForFullIntensity must be > 0.");
    }

    if (definition.speedWeight < 0 || definition.waterAmountWeight < 0) {
        throw new Error("Water impact VFX intensity weights must be >= 0.");
    }

    if (!(definition.speedWeight + definition.waterAmountWeight > 0)) {
        throw new Error("Water impact VFX intensity weights must have a positive total.");
    }

    if (!(definition.staticCollisionMultiplier > 0)) {
        throw new Error("Water impact VFX staticCollisionMultiplier must be > 0.");
    }

    const dimensions = [
        definition.splashTextureSize,
        definition.dropletTextureSize,
        definition.elongatedDropletWidth,
        definition.elongatedDropletHeight,
        definition.surfaceDisturbanceWidth,
        definition.surfaceDisturbanceHeight,
        definition.rippleWidth,
        definition.rippleHeight,
    ];
    if (dimensions.some((value) => !(value > 0))) {
        throw new Error("Water impact VFX primitive dimensions must be > 0.");
    }

    const capacities = [
        definition.impactGroundInitialCapacity,
        definition.impactGroundMaximumCapacity,
        definition.impactAirborneInitialCapacity,
        definition.impactAirborneMaximumCapacity,
    ];
    if (capacities.some((value) => !Number.isFinite(value) || value < 0)) {
        throw new Error("Water impact VFX pool capacities must be finite and >= 0.");
    }
    if (
        definition.impactGroundInitialCapacity > definition.impactGroundMaximumCapacity ||
        definition.impactAirborneInitialCapacity > definition.impactAirborneMaximumCapacity
    ) {
        throw new Error("Water impact VFX initial pool capacities cannot exceed maximum capacity.");
    }
    if (!Number.isFinite(definition.impactGravityY) || !Number.isFinite(definition.impactDragPerSecond) || definition.impactDragPerSecond < 0) {
        throw new Error("Water impact VFX motion tuning is invalid.");
    }

    const variationRanges = [
        [definition.fineLobeCountMin, definition.fineLobeCountMax],
        [definition.fineDropletCountMin, definition.fineDropletCountMax],
        [definition.mediumLobeCountMin, definition.mediumLobeCountMax],
        [definition.mediumDropletCountMin, definition.mediumDropletCountMax],
        [definition.heavyLobeCountMin, definition.heavyLobeCountMax],
        [definition.heavyDropletCountMin, definition.heavyDropletCountMax],
        [definition.lobeSpeedMin, definition.lobeSpeedMax],
        [definition.dropletSpeedMin, definition.dropletSpeedMax],
        [definition.lobeLifetimeMin, definition.lobeLifetimeMax],
        [definition.dropletLifetimeMin, definition.dropletLifetimeMax],
    ] as const;
    if (variationRanges.some(([minimum, maximum]) =>
        !Number.isFinite(minimum) ||
        !Number.isFinite(maximum) ||
        minimum < 0 ||
        maximum < minimum
    )) {
        throw new Error("Water impact VFX variation ranges are invalid.");
    }

    const countValues = [
        definition.fineLobeCountMin,
        definition.fineLobeCountMax,
        definition.fineDropletCountMin,
        definition.fineDropletCountMax,
        definition.mediumLobeCountMin,
        definition.mediumLobeCountMax,
        definition.mediumDropletCountMin,
        definition.mediumDropletCountMax,
        definition.heavyLobeCountMin,
        definition.heavyLobeCountMax,
        definition.heavyDropletCountMin,
        definition.heavyDropletCountMax,
    ];
    if (countValues.some((value) => !Number.isInteger(value))) {
        throw new Error("Water impact VFX particle-count variation must use integers.");
    }

    const variationScalars = [
        definition.impactPositionJitterX,
        definition.impactPositionJitterY,
        definition.rippleScaleVariation,
        definition.disturbanceScaleVariation,
    ];
    if (variationScalars.some((value) => !Number.isFinite(value) || value < 0)) {
        throw new Error("Water impact VFX variation scalars must be finite and >= 0.");
    }

    const budgetValues = [
        definition.impactMaximumCompositionsPerSecond,
        definition.impactMaximumRipplesPerSecond,
        definition.impactMinimumPresentationIntensity,
        definition.impactEmissionBudgetWindowSeconds,
    ];
    if (budgetValues.some((value) => !Number.isFinite(value) || value < 0)) {
        throw new Error("Water impact VFX emission-budget tuning must be finite and >= 0.");
    }
    if (
        !Number.isInteger(definition.impactMaximumCompositionsPerSecond) ||
        !Number.isInteger(definition.impactMaximumRipplesPerSecond) ||
        definition.impactMaximumCompositionsPerSecond <= 0 ||
        definition.impactMaximumRipplesPerSecond <= 0 ||
        definition.impactMinimumPresentationIntensity > 1 ||
        definition.impactEmissionBudgetWindowSeconds <= 0
    ) {
        throw new Error("Water impact VFX emission-budget tuning is invalid.");
    }

    const sprinklerValues = [definition.sprinklerGroundEmissionCooldownSeconds, definition.sprinklerObstacleEmissionCooldownSeconds, definition.sprinklerGroundMinimumIntensity, definition.sprinklerGroundMaximumIntensity, definition.sprinklerObstacleMinimumIntensity, definition.sprinklerObstacleMaximumIntensity, definition.sprinklerGroundDirectionalBias, definition.sprinklerObstacleDirectionalBias];
    if (sprinklerValues.some((value) => !Number.isFinite(value) || value < 0)) throw new Error("Water impact Sprinkler VFX tuning must be finite and >= 0.");
    if (definition.sprinklerGroundMaximumIntensity > 1 || definition.sprinklerObstacleMaximumIntensity > 1 || definition.sprinklerGroundDirectionalBias > 1 || definition.sprinklerObstacleDirectionalBias > 1) throw new Error("Water impact Sprinkler normalized tuning must be <= 1.");

    const hoseGroundValues = [
        definition.hoseGroundContactTimeoutSeconds,
        definition.hoseGroundEmissionCooldownSeconds,
        definition.hoseGroundMinimumIntensity,
        definition.hoseGroundMaximumIntensity,
        definition.hoseGroundDirectionalBias,
        definition.hoseGroundPositionSmoothing,
        definition.hoseGroundMinimumAccumulatedAmount,
    ];
    if (hoseGroundValues.some((value) => !Number.isFinite(value) || value < 0)) {
        throw new Error("Water impact Hose ground VFX tuning must be finite and >= 0.");
    }
    if (
        definition.hoseGroundContactTimeoutSeconds <= 0 ||
        definition.hoseGroundEmissionCooldownSeconds <= 0 ||
        definition.hoseGroundMinimumAccumulatedAmount <= 0
    ) {
        throw new Error("Water impact Hose ground timing/amount tuning must be > 0.");
    }
    if (
        definition.hoseGroundMinimumIntensity > definition.hoseGroundMaximumIntensity ||
        definition.hoseGroundMaximumIntensity > 1 ||
        definition.hoseGroundDirectionalBias > 1 ||
        definition.hoseGroundPositionSmoothing > 1
    ) {
        throw new Error("Water impact Hose ground normalized tuning is invalid.");
    }

    const hoseObstacleValues = [
        definition.hoseObstacleContactTimeoutSeconds,
        definition.hoseObstacleEmissionCooldownSeconds,
        definition.hoseObstacleMinimumIntensity,
        definition.hoseObstacleMaximumIntensity,
        definition.hoseObstacleDirectionalBias,
        definition.hoseObstaclePositionSmoothing,
        definition.hoseObstacleMinimumAccumulatedAmount,
    ];
    if (hoseObstacleValues.some((value) => !Number.isFinite(value) || value < 0)) {
        throw new Error("Water impact Hose obstacle VFX tuning must be finite and >= 0.");
    }
    if (
        definition.hoseObstacleContactTimeoutSeconds <= 0 ||
        definition.hoseObstacleEmissionCooldownSeconds <= 0 ||
        definition.hoseObstacleMinimumAccumulatedAmount <= 0
    ) {
        throw new Error("Water impact Hose obstacle timing/amount tuning must be > 0.");
    }
    if (
        definition.hoseObstacleMinimumIntensity > definition.hoseObstacleMaximumIntensity ||
        definition.hoseObstacleMaximumIntensity > 1 ||
        definition.hoseObstacleDirectionalBias > 1 ||
        definition.hoseObstaclePositionSmoothing > 1
    ) {
        throw new Error("Water impact Hose obstacle normalized tuning is invalid.");
    }

    if (
        definition.mediumTierThreshold < 0 ||
        definition.mediumTierThreshold > 1 ||
        definition.heavyTierThreshold < 0 ||
        definition.heavyTierThreshold > 1 ||
        definition.mediumTierThreshold > definition.heavyTierThreshold
    ) {
        throw new Error("Water impact VFX tier thresholds must be ordered within [0, 1].");
    }
}
