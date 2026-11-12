/** WM-5A scheduling parameters. Terrain/fire suitability is added in WM-5B. */
export const WILDFIRE_CONFIG = Object.freeze({
    ignitionIntervalSeconds: 4.5,
    warningDurationSeconds: 3,
    warningRadius: 90,
    holeExclusionRadius: 160,
    ballSpawnExclusionRadius: 120,
    maximumPlacementAttempts: 30,
    /** Ball-centred candidate region; 1.0 equals the camera viewport half-diagonal. */
    ballCenteredSpawnRadiusMultiplier: 1.0,
    maximumActiveWarnings: 3,
    pointFireRadius: 90,
    pointFireHeatAmount: 1.0,
});
