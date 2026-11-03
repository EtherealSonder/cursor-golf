/** WM-5A scheduling parameters. Terrain/fire suitability is added in WM-5B. */
export const WILDFIRE_CONFIG = Object.freeze({
    ignitionIntervalSeconds: 6,
    warningDurationSeconds: 4,
    warningRadius: 65,
    holeExclusionRadius: 160,
    ballSpawnExclusionRadius: 120,
    maximumPlacementAttempts: 30,
    /** Ball-centred candidate region; 1.0 equals the camera viewport half-diagonal. */
    ballCenteredSpawnRadiusMultiplier: 1.0,
    maximumActiveWarnings: 3,
    pointFireRadius: 16,
    pointFireHeatAmount: 1.0,
});
