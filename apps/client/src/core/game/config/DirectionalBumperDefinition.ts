import type { PhysicsMaterial } from "../physics/PhysicsMaterial";

export type DirectionalBumperHeadOnFallback = "clockwise" | "counterClockwise";

export interface DirectionalBumperDefinition {
    readonly textureKey: string;
    readonly innerTextureKey: string;
    readonly textureDisplayWidth: number;
    readonly textureDisplayHeight: number;
    readonly texturePivotNormalizedX: number;
    readonly texturePivotNormalizedY: number;
    readonly armLength: number;
    readonly armThickness: number;
    readonly armCenterDistanceFromPivot: number;
    readonly forwardTriggerLength: number;
    readonly forwardTriggerWidth: number;
    readonly minimumApproachSpeed: number;
    readonly headOnSideEpsilon: number;
    readonly headOnFallback: DirectionalBumperHeadOnFallback;
    readonly upperStrikeAngleRadians: number;
    readonly lowerStrikeAngleRadians: number;
    readonly strikeDurationSeconds: number;
    readonly strikeHoldDurationSeconds: number;
    readonly returnDurationSeconds: number;
    readonly cooldownDurationSeconds: number;
    readonly minimumLaunchSpeed: number;
    readonly launchSpeedMultiplier: number;
    readonly maximumLaunchSpeed: number;
    readonly minimumTipStrength: number;
    readonly maximumTipStrength: number;
    readonly rotationalVelocityContribution: number;
    readonly genericReferenceMass: number;
    readonly genericMassResponseExponent: number;
    readonly genericMinimumMassFactor: number;
    readonly genericMaximumMassFactor: number;
    readonly genericLaunchSpeedMultiplier: number;
    readonly genericMinimumLaunchSpeed: number;
    readonly genericMaximumLaunchSpeed: number;
    readonly genericMinimumImpactSpeed: number;
    /** DB-6 authoritative airborne-Water reflection tuning. */
    readonly waterReflectionSpeedRetention: number;
    readonly waterReflectionSeparationDistance: number;
    readonly waterReflectionMinimumSpeed: number;
    readonly impactStretchX: number;
    readonly impactStretchY: number;
    readonly impactExpansionDurationSeconds: number;
    readonly impactPeakHoldDurationSeconds: number;
    readonly impactContractionScaleX: number;
    readonly impactContractionScaleY: number;
    readonly impactContractionDurationSeconds: number;
    readonly impactRecoveryDurationSeconds: number;
    readonly innerDisplayWidth: number;
    readonly innerDisplayHeight: number;
    readonly innerLocalOffsetX: number;
    readonly innerLocalOffsetY: number;
    readonly innerFlashPeakAlpha: number;
    readonly innerFlashScaleX: number;
    readonly innerFlashScaleY: number;
    readonly innerFlashHoldDurationSeconds: number;
    readonly innerFlashRecoveryDurationSeconds: number;
    readonly impactStarRadius: number;
    readonly impactStarLifetimeSeconds: number;
    readonly impactStreakMinCount: number;
    readonly impactStreakMaxCount: number;
    readonly impactStreakMinLength: number;
    readonly impactStreakMaxLength: number;
    readonly impactStreakThickness: number;
    readonly impactStreakSpreadRadians: number;
    readonly impactStreakLifetimeSeconds: number;
    readonly impactStreakTravelDistance: number;
    readonly material: PhysicsMaterial;
    readonly debugEnabled: boolean;
}

const degreesToRadians = (degrees: number): number => degrees * Math.PI / 180;

export const DEFAULT_DIRECTIONAL_BUMPER_DEFINITION: DirectionalBumperDefinition = {
    textureKey: "directionalBumper",
    innerTextureKey: "directionalBumperInner",
    textureDisplayWidth: 136,
    textureDisplayHeight: 53,
    texturePivotNormalizedX: 284 / 1452,
    texturePivotNormalizedY: 283 / 567,
    armLength: 116,
    armThickness: 48,
    armCenterDistanceFromPivot: 51,
    forwardTriggerLength: 170,
    forwardTriggerWidth: 112,
    minimumApproachSpeed: 20,
    headOnSideEpsilon: 4,
    headOnFallback: "clockwise",
    upperStrikeAngleRadians: degreesToRadians(-34),
    lowerStrikeAngleRadians: degreesToRadians(34),
    strikeDurationSeconds: 0.08,
    strikeHoldDurationSeconds: 0.045,
    returnDurationSeconds: 0.16,
    cooldownDurationSeconds: 0.12,
    minimumLaunchSpeed: 390,
    launchSpeedMultiplier: 1.24,
    maximumLaunchSpeed: 1250,
    minimumTipStrength: 0.82,
    maximumTipStrength: 1.18,
    rotationalVelocityContribution: 0.34,
    // DB-4 generic movable-body response. These mirror the proven Radial Bumper
    // mass model while retaining Directional Bumper contact direction and tip strength.
    genericReferenceMass: 1.0,
    genericMassResponseExponent: 0.22,
    genericMinimumMassFactor: 0.58,
    genericMaximumMassFactor: 1.35,
    genericLaunchSpeedMultiplier: 1.18,
    genericMinimumLaunchSpeed: 240,
    genericMaximumLaunchSpeed: 850,
    genericMinimumImpactSpeed: 12,
    // Match RB-4: Water reflects without receiving the powered rigid-body launch.
    waterReflectionSpeedRetention: 0.92,
    waterReflectionSeparationDistance: 2,
    waterReflectionMinimumSpeed: 40,
    impactStretchX: 1.29,
    impactStretchY: 1.10,
    impactExpansionDurationSeconds: 0.055,
    impactPeakHoldDurationSeconds: 0.045,
    impactContractionScaleX: 0.95,
    impactContractionScaleY: 0.98,
    impactContractionDurationSeconds: 0.085,
    impactRecoveryDurationSeconds: 0.09,
    // Inner overlay is authored on a 1452x567 canvas, but its visible pad must
    // sit inside the production bumper rim. Size it independently from the body.
    innerDisplayWidth: 106,
    innerDisplayHeight: 41,
    innerLocalOffsetX: 0,
    innerLocalOffsetY: 0,
    innerFlashPeakAlpha: 0.96,
    innerFlashScaleX: 1.055,
    innerFlashScaleY: 1.10,
    innerFlashHoldDurationSeconds: 0.065,
    innerFlashRecoveryDurationSeconds: 0.16,
    impactStarRadius: 22,
    impactStarLifetimeSeconds: 0.14,
    impactStreakMinCount: 7,
    impactStreakMaxCount: 9,
    impactStreakMinLength: 30,
    impactStreakMaxLength: 66,
    impactStreakThickness: 5,
    impactStreakSpreadRadians: degreesToRadians(24),
    impactStreakLifetimeSeconds: 0.20,
    impactStreakTravelDistance: 48,
    material: { restitution: 0.72, friction: 0.08 },
    debugEnabled: false,
};
